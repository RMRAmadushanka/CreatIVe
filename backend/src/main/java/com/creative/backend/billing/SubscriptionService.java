package com.creative.backend.billing;

import com.creative.backend.domain.Plan;
import com.creative.backend.domain.PlanRepository;
import com.creative.backend.domain.Subscription;
import com.creative.backend.domain.SubscriptionRepository;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class SubscriptionService {

    private static final List<String> ACTIVE_STATUSES = List.of("active", "past_due");

    private final SubscriptionRepository subscriptionRepository;
    private final PlanRepository planRepository;

    public SubscriptionService(
            SubscriptionRepository subscriptionRepository, PlanRepository planRepository) {
        this.subscriptionRepository = subscriptionRepository;
        this.planRepository = planRepository;
    }

    @Transactional
    public Subscription ensureActiveSubscription(String userId) {
        return subscriptionRepository
                .findFirstByUserIdAndStatusInOrderByCreatedAtDesc(userId, ACTIVE_STATUSES)
                .map(this::refreshIfExpired)
                .orElseGet(() -> createFree(userId));
    }

    @Transactional
    public Plan requirePlan(String userId) {
        return ensureActiveSubscription(userId).getPlan();
    }

    @Transactional
    public Subscription activatePaidPlan(String userId, String planId, String payhereOrderId) {
        Plan plan = planRepository
                .findById(planId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown plan"));
        if (plan.getPriceLkr() <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Plan is not a paid plan");
        }

        LocalDateTime now = LocalDateTime.now();
        Subscription existing = subscriptionRepository
                .findFirstByUserIdAndStatusInOrderByCreatedAtDesc(userId, ACTIVE_STATUSES)
                .orElse(null);

        if (existing != null) {
            existing.setStatus("cancelled");
            existing.setCancelAtPeriodEnd(false);
            subscriptionRepository.save(existing);
        }

        Subscription next = new Subscription();
        next.setUserId(userId);
        next.setPlan(plan);
        next.setStatus("active");
        next.setCurrentPeriodStart(now);
        next.setCurrentPeriodEnd(now.plusMonths(1));
        next.setPayhereOrderId(payhereOrderId);
        next.setCancelAtPeriodEnd(false);
        return subscriptionRepository.save(next);
    }

    @Transactional
    public Subscription cancelAtPeriodEnd(String userId) {
        Subscription sub = ensureActiveSubscription(userId);
        if ("free".equals(sub.getPlan().getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Free plan cannot be cancelled");
        }
        sub.setCancelAtPeriodEnd(true);
        return subscriptionRepository.save(sub);
    }

    private Subscription refreshIfExpired(Subscription sub) {
        if (sub.getCurrentPeriodEnd() != null
                && sub.getCurrentPeriodEnd().isBefore(LocalDateTime.now())
                && !"free".equals(sub.getPlan().getId())) {
            if (sub.isCancelAtPeriodEnd()) {
                sub.setStatus("expired");
                subscriptionRepository.save(sub);
                return createFree(sub.getUserId());
            }
            // Monthly one-time payment model: expire unpaid periods back to Free.
            sub.setStatus("expired");
            subscriptionRepository.save(sub);
            return createFree(sub.getUserId());
        }
        return sub;
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
        return subscriptionRepository.save(sub);
    }
}
