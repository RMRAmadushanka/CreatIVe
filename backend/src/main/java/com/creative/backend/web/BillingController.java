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
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
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
        String currency = "LKR";
        String amount = payHereService.formatAmount(target.getPriceLkr());
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
                payHereService.checkoutHashPreformatted(orderId, amount, currency),
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

    /**
     * PayHere server-to-server payment notification (notify_url).
     *
     * <p>PayHere always POSTs as {@code application/x-www-form-urlencoded}. We must verify
     * {@code md5sig} before trusting anything. Status codes: {@code 2}=success, {@code 0}=pending,
     * {@code -1}=canceled, {@code -2}=failed, {@code -3}=chargeback. Always respond {@code 200 OK}
     * once a valid, known order has been processed so PayHere stops retrying.
     */
    @PostMapping("/payhere/notify")
    public ResponseEntity<String> payhereNotify(@RequestParam MultiValueMap<String, String> form) {
        Map<String, String> params = form.toSingleValueMap();
        String merchantId = params.getOrDefault("merchant_id", "");
        String orderId = params.getOrDefault("order_id", "");
        String paymentId = params.getOrDefault("payment_id", "");
        String amount = params.getOrDefault("payhere_amount", params.getOrDefault("amount", ""));
        String currency = params.getOrDefault("payhere_currency", params.getOrDefault("currency", "LKR"));
        String statusCode = params.getOrDefault("status_code", "");
        String md5sig = params.getOrDefault("md5sig", "");

        log.info(
                "PayHere notify received: order_id={} payment_id={} status_code={} amount={} {}",
                orderId,
                paymentId,
                statusCode,
                amount,
                currency);

        if (!merchantId.equals(payHereService.getMerchantId())) {
            log.warn("PayHere notify rejected: merchant mismatch for order_id={}", orderId);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("invalid merchant");
        }
        if (!payHereService.verifyNotifyHash(orderId, amount, currency, statusCode, md5sig)) {
            log.warn("PayHere notify rejected: invalid md5sig for order_id={}", orderId);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("invalid signature");
        }

        BillingOrder order = billingOrderRepository.findByOrderId(orderId).orElse(null);
        if (order == null) {
            log.warn("PayHere notify: unknown order_id={}", orderId);
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("order not found");
        }

        // Idempotent success path — PayHere may deliver the same notification more than once.
        if ("paid".equals(order.getStatus())) {
            return ResponseEntity.ok("OK");
        }

        switch (statusCode) {
            case "2" -> {
                if (!amountMatches(order.getAmountLkr(), amount)) {
                    log.warn(
                            "PayHere notify: amount mismatch for order_id={} expected={} got={}",
                            orderId,
                            order.getAmountLkr(),
                            amount);
                    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("amount mismatch");
                }
                order.setStatus("paid");
                order.setPaidAt(LocalDateTime.now());
                billingOrderRepository.save(order);
                subscriptionService.activatePaidPlan(order.getUserId(), order.getPlanId(), orderId);
                log.info("PayHere payment confirmed: order_id={} plan={}", orderId, order.getPlanId());
            }
            case "0" -> log.info("PayHere payment pending: order_id={}", orderId);
            case "-1", "-2", "-3" -> {
                // canceled / failed / chargeback — do not activate; leave subscription untouched.
                order.setStatus("-3".equals(statusCode) ? "chargeback" : "failed");
                billingOrderRepository.save(order);
                log.info("PayHere payment not completed: order_id={} status_code={}", orderId, statusCode);
            }
            default -> log.warn(
                    "PayHere notify: unhandled status_code={} for order_id={}", statusCode, orderId);
        }
        return ResponseEntity.ok("OK");
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
