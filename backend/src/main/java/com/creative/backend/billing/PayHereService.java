package com.creative.backend.billing;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.util.Locale;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * PayHere Checkout API helper (https://support.payhere.lk/api-&-mobile-sdk/checkout-api).
 *
 * <p>Request hash and notification (md5sig) signatures follow the official formula:
 *
 * <pre>
 * hash   = UPPER(MD5(merchant_id + order_id + amount + currency + UPPER(MD5(merchant_secret))))
 * md5sig = UPPER(MD5(merchant_id + order_id + payhere_amount + payhere_currency + status_code
 *                    + UPPER(MD5(merchant_secret))))
 * </pre>
 *
 * <p>The {@code amount} used in the request hash MUST be formatted with exactly two decimal places
 * using {@code '.'} as the decimal separator (e.g. {@code 2990.00}), independent of the server's
 * default locale.
 */
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
        this.mode = mode == null || mode.isBlank() ? "sandbox" : mode.trim().toLowerCase(Locale.ROOT);
        this.notifyUrl = notifyUrl == null ? "" : notifyUrl.trim();
        this.returnUrl = returnUrl == null ? "" : returnUrl.trim();
        this.cancelUrl = cancelUrl == null ? "" : cancelUrl.trim();
    }

    public boolean isConfigured() {
        return !merchantId.isBlank() && !merchantSecret.isBlank() && !notifyUrl.isBlank();
    }

    public boolean isSandbox() {
        return "sandbox".equals(mode);
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
        return isSandbox()
                ? "https://sandbox.payhere.lk/pay/checkout"
                : "https://www.payhere.lk/pay/checkout";
    }

    /**
     * Formats an amount with exactly two decimal places and a {@code '.'} decimal separator,
     * as required by the PayHere request hash and the {@code amount} field.
     */
    public String formatAmount(double amount) {
        DecimalFormat df = new DecimalFormat("0.00", DecimalFormatSymbols.getInstance(Locale.US));
        df.setGroupingUsed(false);
        return df.format(amount);
    }

    /**
     * Generates the checkout request hash. The {@code amount} is formatted internally to guarantee
     * it matches the value sent to PayHere.
     */
    public String checkoutHash(String orderId, double amount, String currency) {
        return checkoutHashPreformatted(orderId, formatAmount(amount), currency);
    }

    /** Variant for callers that already hold a formatted amount string. */
    public String checkoutHashPreformatted(String orderId, String formattedAmount, String currency) {
        String innerSecret = md5(merchantSecret).toUpperCase(Locale.ROOT);
        String raw = merchantId + orderId + formattedAmount + currency + innerSecret;
        return md5(raw).toUpperCase(Locale.ROOT);
    }

    /**
     * Verifies the {@code md5sig} sent to the notify URL. Uses the raw {@code payhere_amount} and
     * {@code payhere_currency} strings exactly as received (do not reformat them).
     */
    public boolean verifyNotifyHash(
            String orderId, String amount, String currency, String statusCode, String md5sig) {
        if (md5sig == null || md5sig.isBlank()) {
            return false;
        }
        String innerSecret = md5(merchantSecret).toUpperCase(Locale.ROOT);
        String raw = merchantId + orderId + amount + currency + statusCode + innerSecret;
        String local = md5(raw).toUpperCase(Locale.ROOT);
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
