package com.creative.backend.billing;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Base64;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class PayHereService {

    public enum SecretFormat {
        AUTO,
        RAW,
        BASE64
    }

    private final String merchantId;
    private final String merchantSecret;
    private final String rawMerchantSecret;
    private final SecretFormat secretFormat;
    private final String mode;
    private final String notifyUrl;
    private final String returnUrl;
    private final String cancelUrl;

    public PayHereService(
            @Value("${payhere.merchant-id:}") String merchantId,
            @Value("${payhere.merchant-secret:}") String merchantSecret,
            @Value("${payhere.merchant-secret-format:auto}") String secretFormat,
            @Value("${payhere.mode:sandbox}") String mode,
            @Value("${payhere.notify-url:}") String notifyUrl,
            @Value("${payhere.return-url:}") String returnUrl,
            @Value("${payhere.cancel-url:}") String cancelUrl) {
        this.merchantId = trim(merchantId);
        this.secretFormat = parseSecretFormat(secretFormat);
        this.rawMerchantSecret = trim(merchantSecret);
        this.merchantSecret = resolveMerchantSecret(this.rawMerchantSecret, this.secretFormat);
        this.mode = mode == null || mode.isBlank() ? "sandbox" : mode.trim().toLowerCase();
        this.notifyUrl = trim(notifyUrl);
        this.returnUrl = trim(returnUrl);
        this.cancelUrl = trim(cancelUrl);
    }

    static SecretFormat parseSecretFormat(String raw) {
        if (raw == null || raw.isBlank()) {
            // RAW by default: PayHere secrets themselves look Base64 (end with ==) and
            // must be used verbatim. Only decode when explicitly told to.
            return SecretFormat.RAW;
        }
        return switch (raw.trim().toLowerCase()) {
            case "base64", "b64" -> SecretFormat.BASE64;
            case "auto" -> SecretFormat.AUTO;
            default -> SecretFormat.RAW;
        };
    }

    /**
     * PayHere Merchant Secrets are long numeric strings in the portal. Some env files
     * accidentally store them Base64-encoded — auto mode unwraps that when detected.
     */
    static String resolveMerchantSecret(String raw, SecretFormat format) {
        if (raw == null || raw.isBlank()) {
            return "";
        }
        return switch (format) {
            case RAW -> raw;
            case BASE64 -> decodeBase64Secret(raw).orElse(raw);
            case AUTO -> {
                String decoded = tryDecodeBase64Secret(raw).orElse(null);
                if (decoded != null && !decoded.equals(raw) && looksLikePayHereSecret(decoded)) {
                    yield decoded;
                }
                yield raw;
            }
        };
    }

    private static boolean looksLikePayHereSecret(String value) {
        if (value == null || value.length() < 16) {
            return false;
        }
        return value.matches("^[0-9]+$") || value.matches("^[A-Za-z0-9]+$");
    }

    private static java.util.Optional<String> tryDecodeBase64Secret(String raw) {
        if (!raw.matches("^[A-Za-z0-9+/]+={0,2}$") || raw.length() % 4 != 0) {
            return java.util.Optional.empty();
        }
        return decodeBase64Secret(raw);
    }

    private static java.util.Optional<String> decodeBase64Secret(String raw) {
        try {
            String decoded = new String(Base64.getDecoder().decode(raw), StandardCharsets.UTF_8).trim();
            if (decoded.isBlank()) {
                return java.util.Optional.empty();
            }
            return java.util.Optional.of(decoded);
        } catch (IllegalArgumentException e) {
            return java.util.Optional.empty();
        }
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

    public Map<String, Object> statusSummary() {
        boolean secretChanged = !merchantSecret.equals(rawMerchantSecret);

        Map<String, Object> summary = new java.util.LinkedHashMap<>();
        summary.put("configured", isConfigured());
        summary.put("mode", mode);
        summary.put("merchantId", merchantId);
        summary.put("secretFormat", secretFormat.name().toLowerCase());
        summary.put("secretChangedFromEnv", secretChanged);
        summary.put("secretLength", merchantSecret.length());
        summary.put("secretMd5Upper", merchantSecret.isBlank() ? "" : md5(merchantSecret).toUpperCase());
        summary.put("checkoutUrl", getCheckoutUrl());
        summary.put("notifyUrl", notifyUrl);
        summary.put("returnUrl", returnUrl);
        summary.put("cancelUrl", cancelUrl);
        // Sample hash for a known input so we can compare against a local computation.
        summary.put("sampleOrderId", "SAMPLE123");
        summary.put("sampleHashLkr2990", checkoutHash("SAMPLE123", "2990.00", "LKR"));
        summary.put(
                "hint",
                "Ensure PAYHERE_MERCHANT_SECRET matches the secret for your paying domain in PayHere Integrations, used verbatim (raw).");
        return summary;
    }

    private static String maskTail(String value, int visible) {
        if (value.length() <= visible) {
            return value;
        }
        return "*".repeat(Math.max(0, value.length() - visible)) + value.substring(value.length() - visible);
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
