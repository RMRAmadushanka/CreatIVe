package com.creative.backend.billing;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Locale;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class PayHereService {

    private final String merchantId;
    private final String merchantSecret;
    private final String mode;
    private final String notifyUrl;
    private final String returnUrl;
    private final String cancelUrl;

    public PayHereService(
            @Value("${payhere.merchant-id:}") String merchantId,
            @Value("${payhere.merchant-secret:}") String merchantSecret,
            @Value("${payhere.mode:sandbox}") String mode,
            @Value("${payhere.notify-url:}") String notifyUrl,
            @Value("${payhere.return-url:}") String returnUrl,
            @Value("${payhere.cancel-url:}") String cancelUrl) {
        this.merchantId = merchantId == null ? "" : merchantId.trim();
        this.merchantSecret = merchantSecret == null ? "" : merchantSecret.trim();
        this.mode = mode == null || mode.isBlank() ? "sandbox" : mode.trim().toLowerCase();
        this.notifyUrl = notifyUrl == null ? "" : notifyUrl.trim();
        this.returnUrl = returnUrl == null ? "" : returnUrl.trim();
        this.cancelUrl = cancelUrl == null ? "" : cancelUrl.trim();
    }

    public boolean isConfigured() {
        return !merchantId.isBlank() && !merchantSecret.isBlank() && !notifyUrl.isBlank();
    }

    public String getMerchantId() {
        return merchantId;
    }

    public String getNotifyUrl() {
        return notifyUrl;
    }

    public String getReturnUrl() {
        return returnUrl;
    }

    public String getCancelUrl() {
        return cancelUrl;
    }

    public String getCheckoutUrl() {
        return "sandbox".equals(mode)
                ? "https://sandbox.payhere.lk/pay/checkout"
                : "https://www.payhere.lk/pay/checkout";
    }

    /**
     * Formats an amount exactly as PayHere expects: two decimal places, dot
     * separator, no thousands grouping (equivalent to PHP number_format(amount, 2, '.', '')).
     * Uses {@link Locale#US} so the server's default locale never introduces a comma.
     */
    public String formatAmount(double amount) {
        return String.format(Locale.US, "%.2f", amount);
    }

    /**
     * Checkout request hash (mandatory for all PayHere accounts):
     * UPPER(MD5(merchant_id + order_id + amount + currency + UPPER(MD5(merchant_secret)))).
     * The {@code amount} must be the same string sent in the checkout form.
     */
    public String checkoutHash(String orderId, String amount, String currency) {
        String inner = md5(merchantSecret).toUpperCase();
        return md5(merchantId + orderId + amount + currency + inner).toUpperCase();
    }

    public boolean verifyNotifyHash(
            String orderId, String amount, String currency, String statusCode, String md5sig) {
        if (md5sig == null || md5sig.isBlank()) {
            return false;
        }
        String inner = md5(merchantSecret).toUpperCase();
        String local = md5(merchantId + orderId + amount + currency + statusCode + inner).toUpperCase();
        return local.equalsIgnoreCase(md5sig.trim());
    }

    private static String md5(String value) {
        try {
            MessageDigest md = MessageDigest.getInstance("MD5");
            byte[] digest = md.digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(digest.length * 2);
            for (byte b : digest) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("MD5 not available", e);
        }
    }
}
