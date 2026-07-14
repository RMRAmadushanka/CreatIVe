package com.creative.backend.billing;

import com.creative.backend.domain.Plan;
import com.creative.backend.domain.PlanRepository;
import com.creative.backend.domain.ProjectRepository;
import com.creative.backend.domain.Subscription;
import com.creative.backend.domain.SubscriptionRepository;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Real-world monthly plan lifecycle (PayHere one-time checkout model):
 *
 * <ul>
 *   <li><b>Upgrade</b> (higher price): pay now → activate immediately, new billing period
 *   <li><b>Renew</b> (same paid plan): pay before/at expiry → extend period +1 month
 *   <li><b>Downgrade</b> (lower price / Free): schedule {@code pendingPlan} at period end; keep
 *       current plan until then; soft-lock creates if already over the target limits
 *   <li><b>Cancel</b>: schedule Free at period end (same as downgrade to Free)
 *   <li><b>Unpaid expiry</b>: {@code past_due} with 3-day grace, then Free
 * </ul>
 */
@Service
public class SubscriptionService {

    public static final int GRACE_DAYS = 3;

    private static final List<String> ACTIVE_STATUSES = List.of("active", "past_due");

    private final SubscriptionRepository subscriptionRepository;
    private final PlanRepository planRepository;
    private final ProjectRepository projectRepository;

    public SubscriptionService(
            SubscriptionRepository subscriptionRepository,
            PlanRepository planRepository,
            ProjectRepository projectRepository) {
        this.subscriptionRepository = subscriptionRepository;
        this.planRepository = planRepository;
        this.projectRepository = projectRepository;
    }

    @Transactional
    public Subscription ensureActiveSubscription(String userId) {
        return subscriptionRepository
                .findFirstByUserIdAndStatusInOrderByCreatedAtDesc(userId, ACTIVE_STATUSES)
                .map(this::refreshLifecycle)
                .orElseGet(() -> createFree(userId));
    }

    @Transactional
    public Plan requirePlan(String userId) {
        return ensureActiveSubscription(userId).getPlan();
    }

    public enum ChangeKind {
        UPGRADE,
        DOWNGRADE,
        RENEW,
        CURRENT
    }

    public ChangeKind classifyChange(Plan current, Plan target) {
        if (current.getId().equals(target.getId())) {
            return ChangeKind.RENEW;
        }
        if (target.getPriceLkr() > current.getPriceLkr()) {
            return ChangeKind.UPGRADE;
        }
        if (target.getPriceLkr() < current.getPriceLkr()) {
            return ChangeKind.DOWNGRADE;
        }
        // Same price, different plan id — treat as upgrade (immediate paid switch)
        return ChangeKind.UPGRADE;
    }

    /**
     * Activates or renews a paid plan after successful PayHere payment.
     * Upgrades and renewals apply immediately. Pending downgrades are cleared.
     *
     * <p>Updates the existing active row in place (instead of cancel + insert) so we never
     * violate {@code uq_subscriptions_one_active} (one active/past_due per user).
     */
    @Transactional
    public Subscription activatePaidPlan(String userId, String planId, String payhereOrderId) {
        Plan plan = requirePurchasablePlan(planId);
        LocalDateTime now = LocalDateTime.now();

        Subscription existing = subscriptionRepository
                .findFirstByUserIdAndStatusInOrderByCreatedAtDesc(userId, ACTIVE_STATUSES)
                .orElse(null);

        if (existing != null
                && plan.getId().equals(existing.getPlan().getId())
                && ("active".equals(existing.getStatus()) || "past_due".equals(existing.getStatus()))) {
            // Renew same plan: extend from later of now or current period end
            LocalDateTime base = existing.getCurrentPeriodEnd() != null
                            && existing.getCurrentPeriodEnd().isAfter(now)
                    ? existing.getCurrentPeriodEnd()
                    : now;
            existing.setStatus("active");
            existing.setCurrentPeriodEnd(base.plusMonths(1));
            if (existing.getCurrentPeriodStart() == null) {
                existing.setCurrentPeriodStart(now);
            }
            existing.setPayhereOrderId(payhereOrderId);
            existing.setCancelAtPeriodEnd(false);
            existing.setPendingPlan(null);
            existing.setGracePeriodEndsAt(null);
            return subscriptionRepository.save(existing);
        }

        if (existing != null) {
            // Upgrade / switch to another paid plan — mutate the same active row.
            existing.setPlan(plan);
            existing.setStatus("active");
            existing.setCurrentPeriodStart(now);
            existing.setCurrentPeriodEnd(now.plusMonths(1));
            existing.setPayhereOrderId(payhereOrderId);
            existing.setCancelAtPeriodEnd(false);
            existing.setPendingPlan(null);
            existing.setGracePeriodEndsAt(null);
            return subscriptionRepository.save(existing);
        }

        Subscription next = new Subscription();
        next.setUserId(userId);
        next.setPlan(plan);
        next.setStatus("active");
        next.setCurrentPeriodStart(now);
        next.setCurrentPeriodEnd(now.plusMonths(1));
        next.setPayhereOrderId(payhereOrderId);
        next.setCancelAtPeriodEnd(false);
        next.setPendingPlan(null);
        next.setGracePeriodEndsAt(null);
        return subscriptionRepository.save(next);
    }

    /**
     * Schedule a downgrade (including to Free) at the end of the current period.
     * Current plan stays active until then. Data is never deleted.
     */
    @Transactional
    public Subscription scheduleDowngrade(String userId, String targetPlanId) {
        Subscription sub = ensureActiveSubscription(userId);
        Plan target = planRepository
                .findById(targetPlanId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown plan"));

        if (!target.isActive()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Plan is not available");
        }

        ChangeKind kind = classifyChange(sub.getPlan(), target);
        if (kind == ChangeKind.UPGRADE) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Use checkout to upgrade — upgrades apply after payment");
        }
        if (kind == ChangeKind.RENEW || kind == ChangeKind.CURRENT) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Already on this plan");
        }
        if ("free".equals(sub.getPlan().getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Already on Free");
        }

        // Soft-lock model: allow scheduling even if over limit; creates stay blocked after switch.
        sub.setPendingPlan(target);
        sub.setCancelAtPeriodEnd("free".equals(target.getId()));
        return subscriptionRepository.save(sub);
    }

    @Transactional
    public Subscription cancelAtPeriodEnd(String userId) {
        return scheduleDowngrade(userId, "free");
    }

    /** Undo a scheduled cancel/downgrade and keep the current plan. */
    @Transactional
    public Subscription resume(String userId) {
        Subscription sub = ensureActiveSubscription(userId);
        if (sub.getPendingPlan() == null && !sub.isCancelAtPeriodEnd()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nothing to resume");
        }
        sub.setPendingPlan(null);
        sub.setCancelAtPeriodEnd(false);
        return subscriptionRepository.save(sub);
    }

    public List<String> overLimitReasons(String userId, Plan target) {
        List<String> reasons = new ArrayList<>();
        long projects = projectRepository.countByOwnerId(userId);
        if (target.getMaxProjects() >= 0 && projects > target.getMaxProjects()) {
            reasons.add(projects + " projects (limit " + target.getMaxProjects() + ")");
        }
        return reasons;
    }

    private Subscription refreshLifecycle(Subscription sub) {
        if ("free".equals(sub.getPlan().getId())) {
            return sub;
        }

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime periodEnd = sub.getCurrentPeriodEnd();
        if (periodEnd == null || !periodEnd.isBefore(now)) {
            return sub;
        }

        // Period ended
        if ("past_due".equals(sub.getStatus())) {
            if (sub.getGracePeriodEndsAt() != null && sub.getGracePeriodEndsAt().isAfter(now)) {
                return sub; // still in grace
            }
            return endPaidSubscription(sub);
        }

        // Just crossed period end
        if (sub.getPendingPlan() != null) {
            return applyPendingPlan(sub);
        }

        // Unpaid: enter grace, then Free
        sub.setStatus("past_due");
        sub.setGracePeriodEndsAt(now.plusDays(GRACE_DAYS));
        return subscriptionRepository.save(sub);
    }

    private Subscription applyPendingPlan(Subscription sub) {
        Plan pending = sub.getPendingPlan();
        LocalDateTime now = LocalDateTime.now();

        if (pending == null || "free".equals(pending.getId()) || pending.getPriceLkr() <= 0) {
            Plan free = planRepository
                    .findById("free")
                    .orElseThrow(() -> new IllegalStateException("Free plan is missing — run Flyway V5"));
            sub.setPlan(free);
            sub.setStatus("active");
            sub.setCurrentPeriodStart(now);
            sub.setCurrentPeriodEnd(now.plusYears(100));
            sub.setPendingPlan(null);
            sub.setCancelAtPeriodEnd(false);
            sub.setGracePeriodEndsAt(null);
            sub.setPayhereOrderId(null);
            return subscriptionRepository.save(sub);
        }

        sub.setPlan(pending);
        sub.setStatus("active");
        sub.setCurrentPeriodStart(now);
        sub.setCurrentPeriodEnd(now.plusMonths(1));
        sub.setPendingPlan(null);
        sub.setCancelAtPeriodEnd(false);
        sub.setGracePeriodEndsAt(null);
        return subscriptionRepository.save(sub);
    }

    private Subscription endPaidSubscription(Subscription sub) {
        Plan free = planRepository
                .findById("free")
                .orElseThrow(() -> new IllegalStateException("Free plan is missing — run Flyway V5"));
        LocalDateTime now = LocalDateTime.now();
        sub.setPlan(free);
        sub.setStatus("active");
        sub.setCurrentPeriodStart(now);
        sub.setCurrentPeriodEnd(now.plusYears(100));
        sub.setPendingPlan(null);
        sub.setCancelAtPeriodEnd(false);
        sub.setGracePeriodEndsAt(null);
        sub.setPayhereOrderId(null);
        return subscriptionRepository.save(sub);
    }

    private Plan requirePurchasablePlan(String planId) {
        Plan plan = planRepository
                .findById(planId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown plan"));
        if (!plan.isActive() || plan.getPriceLkr() <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Plan is not a paid plan");
        }
        return plan;
    }

    private Subscription createFree(String userId) {
        Plan free = planRepository
                .findById("free")
                .orElseThrow(() -> new IllegalStateException("Free plan is missing — run Flyway V5"));
        LocalDateTime now = LocalDateTime.now();
        Subscription sub = new Subscription();
        sub.setUserId(userId);
        sub.setPlan(free);
        sub.setStatus("active");
        sub.setCurrentPeriodStart(now);
        sub.setCurrentPeriodEnd(now.plusYears(100));
        sub.setCancelAtPeriodEnd(false);
        sub.setPendingPlan(null);
        sub.setGracePeriodEndsAt(null);
        return subscriptionRepository.save(sub);
    }
}
