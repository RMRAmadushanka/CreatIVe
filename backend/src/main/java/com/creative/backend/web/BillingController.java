package com.creative.backend.web;

import com.creative.backend.billing.PayHereService;
import com.creative.backend.billing.PlanLimitService;
import com.creative.backend.billing.SubscriptionService;
import com.creative.backend.billing.SubscriptionService.ChangeKind;
import com.creative.backend.domain.BillingOrder;
import com.creative.backend.domain.BillingOrderRepository;
import com.creative.backend.domain.Plan;
import com.creative.backend.domain.PlanRepository;
import com.creative.backend.domain.ProjectRepository;
import com.creative.backend.domain.Subscription;
import com.creative.backend.domain.User;
import com.creative.backend.security.CurrentUserService;
import com.creative.backend.web.dto.PayHereCheckoutDto;
import com.creative.backend.web.dto.PlanDto;
import com.creative.backend.web.dto.SubscriptionDto;
import jakarta.servlet.http.HttpServletRequest;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/billing")
public class BillingController {

    private static final Logger log = LoggerFactory.getLogger(BillingController.class);

    private final PlanRepository planRepository;
    private final SubscriptionService subscriptionService;
    private final PlanLimitService planLimitService;
    private final ProjectRepository projectRepository;
    private final BillingOrderRepository billingOrderRepository;
    private final PayHereService payHereService;
    private final CurrentUserService currentUserService;

    public BillingController(
            PlanRepository planRepository,
            SubscriptionService subscriptionService,
            PlanLimitService planLimitService,
            ProjectRepository projectRepository,
            BillingOrderRepository billingOrderRepository,
            PayHereService payHereService,
            CurrentUserService currentUserService) {
        this.planRepository = planRepository;
        this.subscriptionService = subscriptionService;
        this.planLimitService = planLimitService;
        this.projectRepository = projectRepository;
        this.billingOrderRepository = billingOrderRepository;
        this.payHereService = payHereService;
        this.currentUserService = currentUserService;
    }

    @GetMapping("/plans")
    public List<PlanDto> listPlans() {
        return planRepository.findByActiveTrueOrderBySortOrderAsc().stream()
                .map(PlanDto::from)
                .toList();
    }

    @GetMapping("/me")
    public SubscriptionDto me() {
        User user = currentUserService.requireUser();
        // Re-apply latest paid order if notify activated payment but subscription didn't update yet.
        syncLatestPaidOrder(user.getId());
        return toDto(user.getId(), subscriptionService.ensureActiveSubscription(user.getId()));
    }

    /**
     * Start PayHere checkout for <b>upgrade</b> or <b>renew</b> only.
     * Downgrades use {@code POST /schedule-change}.
     */
    @PostMapping("/checkout")
    public PayHereCheckoutDto checkout(@RequestBody CheckoutRequest request) {
        if (!payHereService.isConfigured()) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "PayHere is not configured. Set PAYHERE_MERCHANT_ID, PAYHERE_MERCHANT_SECRET, and PAYHERE_NOTIFY_URL.");
        }

        User user = currentUserService.requireUser();
        if (request.planId() == null || request.planId().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "planId is required");
        }

        Plan target = planRepository
                .findById(request.planId().trim().toLowerCase())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown plan"));

        if (!target.isActive() || target.getPriceLkr() <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selected plan is not purchasable");
        }

        Subscription current = subscriptionService.ensureActiveSubscription(user.getId());
        ChangeKind kind = subscriptionService.classifyChange(current.getPlan(), target);

        if (kind == ChangeKind.DOWNGRADE) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Downgrades take effect at period end. Use schedule-change instead of checkout.");
        }

        if (kind == ChangeKind.RENEW
                && "active".equals(current.getStatus())
                && current.getCurrentPeriodEnd() != null
                && current.getCurrentPeriodEnd().isAfter(LocalDateTime.now().plusDays(7))
                && !current.isCancelAtPeriodEnd()
                && !"past_due".equals(current.getStatus())) {
            // Allow early renew only when within 7 days of expiry, cancelled, or past_due
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "You can renew when your period ends within 7 days, or if payment is past due.");
        }

        String orderId = "PH-" + UUID.randomUUID().toString().replace("-", "").substring(0, 18).toUpperCase();
        String amount = payHereService.formatAmount(target.getPriceLkr());
        String currency = "LKR";
        String itemLabel = kind == ChangeKind.RENEW
                ? "CreatIVe " + target.getName() + " — Monthly renewal"
                : "CreatIVe " + target.getName() + " — Upgrade";

        BillingOrder order = new BillingOrder();
        order.setOrderId(orderId);
        order.setUserId(user.getId());
        order.setPlanId(target.getId());
        order.setAmountLkr(target.getPriceLkr());
        order.setStatus("pending");
        billingOrderRepository.save(order);

        String[] nameParts = splitName(user.getName());
        return new PayHereCheckoutDto(
                payHereService.getCheckoutUrl(),
                payHereService.getMerchantId(),
                orderId,
                itemLabel,
                currency,
                amount,
                payHereService.checkoutHash(orderId, amount, currency),
                nameParts[0],
                nameParts[1],
                user.getEmail(),
                "0770000000",
                "Colombo",
                "Colombo",
                "Sri Lanka",
                payHereService.getReturnUrl(),
                payHereService.getCancelUrl(),
                payHereService.getNotifyUrl(),
                user.getId(),
                target.getId());
    }

    /** Schedule a downgrade (or Free) for the end of the current billing period. */
    @PostMapping("/schedule-change")
    public SubscriptionDto scheduleChange(@RequestBody CheckoutRequest request) {
        User user = currentUserService.requireUser();
        if (request.planId() == null || request.planId().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "planId is required");
        }
        Subscription sub = subscriptionService.scheduleDowngrade(user.getId(), request.planId().trim().toLowerCase());
        return toDto(user.getId(), sub);
    }

    @PostMapping(
            value = "/payhere/notify",
            consumes = {
                MediaType.APPLICATION_FORM_URLENCODED_VALUE,
                MediaType.MULTIPART_FORM_DATA_VALUE,
                MediaType.ALL_VALUE
            })
    @Transactional
    public ResponseEntity<String> payhereNotify(HttpServletRequest request) {
        Map<String, String> params = readFormParams(request);
        String merchantId = params.getOrDefault("merchant_id", "");
        String orderId = params.getOrDefault("order_id", "");
        String amount = params.getOrDefault("payhere_amount", params.getOrDefault("amount", ""));
        String currency = params.getOrDefault("payhere_currency", params.getOrDefault("currency", "LKR"));
        String statusCode = params.getOrDefault("status_code", "");
        String md5sig = params.getOrDefault("md5sig", "");

        log.info(
                "PayHere notify received orderId={} statusCode={} amount={} currency={}",
                orderId,
                statusCode,
                amount,
                currency);

        if (!merchantId.equals(payHereService.getMerchantId())) {
            log.warn("PayHere notify rejected: merchant mismatch (got {})", merchantId);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("invalid merchant");
        }
        if (!payHereService.verifyNotifyHash(orderId, amount, currency, statusCode, md5sig)) {
            log.warn("PayHere notify rejected: invalid signature for orderId={}", orderId);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("invalid signature");
        }

        BillingOrder order = billingOrderRepository.findByOrderId(orderId).orElse(null);
        if (order == null) {
            log.warn("PayHere notify rejected: order not found orderId={}", orderId);
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("order not found");
        }

        // Idempotent success path
        if ("paid".equals(order.getStatus())) {
            // Ensure subscription matches this paid order even if a previous activate failed.
            subscriptionService.activatePaidPlan(order.getUserId(), order.getPlanId(), orderId);
            return ResponseEntity.ok("OK");
        }

        // PayHere status codes: 2 = success, 0 = pending, -1 = canceled, -2 = failed, -3 = chargedback.
        switch (statusCode) {
            case "2" -> {
                if (!amountMatches(order.getAmountLkr(), amount)) {
                    log.warn(
                            "PayHere notify rejected: amount mismatch orderId={} expected={} got={}",
                            orderId,
                            order.getAmountLkr(),
                            amount);
                    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("amount mismatch");
                }
                // Activate first so we don't mark paid without upgrading the subscription.
                subscriptionService.activatePaidPlan(order.getUserId(), order.getPlanId(), orderId);
                order.setStatus("paid");
                order.setPaidAt(LocalDateTime.now());
                billingOrderRepository.save(order);
                log.info(
                        "PayHere payment activated plan={} for user={} orderId={}",
                        order.getPlanId(),
                        order.getUserId(),
                        orderId);
            }
            case "0" -> {
                if (!"paid".equals(order.getStatus())) {
                    order.setStatus("pending");
                    billingOrderRepository.save(order);
                }
            }
            case "-1", "-2", "-3" -> {
                if (!"paid".equals(order.getStatus())) {
                    order.setStatus("failed");
                    billingOrderRepository.save(order);
                }
            }
            default -> log.info("PayHere notify ignored unknown statusCode={} orderId={}", statusCode, orderId);
        }
        return ResponseEntity.ok("OK");
    }

    /**
     * If PayHere marked an order paid (or we have a paid row) but the user still shows Free,
     * apply the latest paid plan when loading billing.
     */
    private void syncLatestPaidOrder(String userId) {
        billingOrderRepository
                .findFirstByUserIdAndStatusOrderByCreatedAtDesc(userId, "paid")
                .ifPresent(order -> {
                    Subscription sub = subscriptionService.ensureActiveSubscription(userId);
                    if (!order.getOrderId().equals(sub.getPayhereOrderId())
                            || !order.getPlanId().equals(sub.getPlan().getId())) {
                        log.info(
                                "Syncing paid order {} → plan {} for user {}",
                                order.getOrderId(),
                                order.getPlanId(),
                                userId);
                        subscriptionService.activatePaidPlan(userId, order.getPlanId(), order.getOrderId());
                    }
                });
    }

    private static Map<String, String> readFormParams(HttpServletRequest request) {
        Map<String, String> params = new HashMap<>();
        request.getParameterMap().forEach((key, values) -> {
            if (values != null && values.length > 0 && values[0] != null) {
                params.put(key, values[0]);
            }
        });
        return params;
    }

    @PostMapping("/cancel")
    public SubscriptionDto cancel() {
        User user = currentUserService.requireUser();
        return toDto(user.getId(), subscriptionService.cancelAtPeriodEnd(user.getId()));
    }

    @PostMapping("/resume")
    public SubscriptionDto resume() {
        User user = currentUserService.requireUser();
        return toDto(user.getId(), subscriptionService.resume(user.getId()));
    }

    private SubscriptionDto toDto(String userId, Subscription sub) {
        int projects = (int) projectRepository.countByOwnerId(userId);
        int media = planLimitService.mediaUploadsThisMonth(userId);
        String period = java.time.YearMonth.now().toString();
        List<String> warnings = List.of();
        if (sub.getPendingPlan() != null) {
            warnings = subscriptionService.overLimitReasons(userId, sub.getPendingPlan());
        }
        String hint = buildHint(sub);
        return SubscriptionDto.from(
                sub,
                new SubscriptionDto.UsageDto(projects, media, period),
                hint,
                warnings);
    }

    private static String buildHint(Subscription sub) {
        if ("past_due".equals(sub.getStatus()) && sub.getGracePeriodEndsAt() != null) {
            return "Payment past due — renew before "
                    + sub.getGracePeriodEndsAt()
                    + " to keep "
                    + sub.getPlan().getName()
                    + " benefits.";
        }
        if (sub.getPendingPlan() != null) {
            return "Scheduled to switch to "
                    + sub.getPendingPlan().getName()
                    + " on "
                    + sub.getCurrentPeriodEnd()
                    + ". You keep "
                    + sub.getPlan().getName()
                    + " until then.";
        }
        if (sub.isCancelAtPeriodEnd()) {
            return "Cancels at period end (" + sub.getCurrentPeriodEnd() + ").";
        }
        return null;
    }

    private static boolean amountMatches(int expectedLkr, String payhereAmount) {
        try {
            BigDecimal paid = new BigDecimal(payhereAmount.trim());
            BigDecimal expected = BigDecimal.valueOf(expectedLkr).setScale(2);
            return paid.compareTo(expected) == 0 || paid.compareTo(BigDecimal.valueOf(expectedLkr)) == 0;
        } catch (Exception e) {
            return false;
        }
    }

    private static String[] splitName(String name) {
        String trimmed = name == null || name.isBlank() ? "Customer" : name.trim();
        String[] parts = trimmed.split("\\s+", 2);
        if (parts.length == 1) {
            return new String[] {parts[0], "User"};
        }
        return parts;
    }

    public record CheckoutRequest(String planId) {}
}
