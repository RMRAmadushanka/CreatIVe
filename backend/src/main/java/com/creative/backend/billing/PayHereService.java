package com.creative.backend.billing;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
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
        this.merchantId = trim(merchantId);
        // Use the exact Merchant Secret from PayHere Integrations for YOUR frontend domain.
        // Do not Base64-encode it — paste it exactly as shown in the sandbox portal.
        this.merchantSecret = trim(merchantSecret);
        this.mode = mode == null || mode.isBlank() ? "sandbox" : mode.trim().toLowerCase();
        this.notifyUrl = trim(notifyUrl);
        this.returnUrl = trim(returnUrl);
        this.cancelUrl = trim(cancelUrl);
    }

    private static String trim(String raw) {
        if (raw == null) {
            return "";
        }
        String s = raw.trim();
        if ((s.startsWith("\"") && s.endsWith("\"")) || (s.startsWith("'") && s.endsWith("'"))) {
            s = s.substring(1, s.length() - 1).trim();
        }
        return s;
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

    public boolean isSandbox() {
        return "sandbox".equals(mode);
    }

    /**
     * PayHere formula: UPPERCASE(MD5(merchant_id + order_id + amount + currency +
     * UPPERCASE(MD5(merchant_secret))))
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
