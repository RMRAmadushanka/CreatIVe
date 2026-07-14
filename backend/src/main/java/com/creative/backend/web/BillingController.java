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
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/billing")
public class BillingController {

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

    /** Public health check for PayHere env wiring (no secrets exposed). */
    @GetMapping("/payhere/status")
    public Map<String, Object> payhereStatus() {
        return payHereService.statusSummary();
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
    public PayHereCheckoutDto checkout(
            @RequestBody CheckoutRequest request,
            @RequestHeader(value = "Origin", required = false) String originHeader) {
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

        String frontendOrigin = resolveFrontendOrigin(request.frontendOrigin(), originHeader);
        String returnUrl = resolveBillingReturnUrl(frontendOrigin, "success", payHereService.getReturnUrl());
        String cancelUrl = resolveBillingReturnUrl(frontendOrigin, "cancel", payHereService.getCancelUrl());
        if (returnUrl.isBlank() || cancelUrl.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Set PAYHERE_RETURN_URL and PAYHERE_CANCEL_URL to your frontend billing page, "
                            + "or call checkout from the browser so Origin can be used.");
        }

        // PayHere requires US-style decimals in both amount + hash (never locale commas).
        String orderId = "PH" + UUID.randomUUID().toString().replace("-", "").substring(0, 18).toUpperCase();
        String amount = String.format(Locale.US, "%.2f", (double) target.getPriceLkr());
        String currency = "LKR";
        String itemLabel = kind == ChangeKind.RENEW
                ? "CreatIVe " + target.getName() + " Monthly renewal"
                : "CreatIVe " + target.getName() + " Upgrade";

        BillingOrder order = new BillingOrder();
        order.setOrderId(orderId);
        order.setUserId(user.getId());
        order.setPlanId(target.getId());
        order.setAmountLkr(target.getPriceLkr());
        order.setStatus("pending");
        billingOrderRepository.save(order);

        String[] nameParts = splitName(user.getName());
        String hash = payHereService.checkoutHash(orderId, amount, currency);
        return new PayHereCheckoutDto(
                payHereService.getCheckoutUrl(),
                payHereService.isSandbox(),
                payHereService.getMerchantId(),
                orderId,
                itemLabel,
                currency,
                amount,
                hash,
                nameParts[0],
                nameParts[1],
                user.getEmail(),
                "0771234567",
                "No. 1, Galle Road",
                "Colombo",
                "Sri Lanka",
                returnUrl,
                cancelUrl,
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

    @PostMapping("/payhere/notify")
    public ResponseEntity<String> payhereNotify(@RequestParam MultiValueMap<String, String> form) {
        Map<String, String> params = form.toSingleValueMap();
        String merchantId = params.getOrDefault("merchant_id", "");
        String orderId = params.getOrDefault("order_id", "");
        String amount = params.getOrDefault("payhere_amount", params.getOrDefault("amount", ""));
        String currency = params.getOrDefault("payhere_currency", params.getOrDefault("currency", "LKR"));
        String statusCode = params.getOrDefault("status_code", "");
        String md5sig = params.getOrDefault("md5sig", "");

        if (!merchantId.equals(payHereService.getMerchantId())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("invalid merchant");
        }
        if (!payHereService.verifyNotifyHash(orderId, amount, currency, statusCode, md5sig)) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("invalid signature");
        }

        BillingOrder order = billingOrderRepository.findByOrderId(orderId).orElse(null);
        if (order == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("order not found");
        }

        // Idempotent success path
        if ("paid".equals(order.getStatus())) {
            return ResponseEntity.ok("OK");
        }

        if ("2".equals(statusCode)) {
            if (!amountMatches(order.getAmountLkr(), amount)) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("amount mismatch");
            }
            order.setStatus("paid");
            order.setPaidAt(LocalDateTime.now());
            billingOrderRepository.save(order);
            subscriptionService.activatePaidPlan(order.getUserId(), order.getPlanId(), orderId);
            return ResponseEntity.ok("OK");
        }

        if ("0".equals(statusCode) || "-1".equals(statusCode) || "-2".equals(statusCode)) {
            if (!"paid".equals(order.getStatus())) {
                order.setStatus("failed");
                billingOrderRepository.save(order);
            }
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

    private static String resolveFrontendOrigin(String bodyOrigin, String headerOrigin) {
        String candidate = bodyOrigin != null && !bodyOrigin.isBlank() ? bodyOrigin : headerOrigin;
        if (candidate == null || candidate.isBlank()) {
            return "";
        }
        try {
            java.net.URI uri = java.net.URI.create(candidate.trim());
            if (uri.getScheme() == null || uri.getHost() == null) {
                return "";
            }
            StringBuilder origin = new StringBuilder();
            origin.append(uri.getScheme()).append("://").append(uri.getHost());
            if (uri.getPort() > 0
                    && !(uri.getPort() == 80 && "http".equalsIgnoreCase(uri.getScheme()))
                    && !(uri.getPort() == 443 && "https".equalsIgnoreCase(uri.getScheme()))) {
                origin.append(":").append(uri.getPort());
            }
            return origin.toString();
        } catch (Exception e) {
            return "";
        }
    }

    private static String resolveBillingReturnUrl(String frontendOrigin, String status, String fallback) {
        if (frontendOrigin != null && !frontendOrigin.isBlank()) {
            return frontendOrigin + "/dashboard/billing?status=" + status;
        }
        return fallback == null ? "" : fallback.trim();
    }

    /** planId required; frontendOrigin optional (browser Origin used if omitted). */
    public record CheckoutRequest(String planId, String frontendOrigin) {}
}
