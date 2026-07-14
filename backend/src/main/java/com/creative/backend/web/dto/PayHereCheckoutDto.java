package com.creative.backend.web.dto;

public record PayHereCheckoutDto(
        String checkoutUrl,
        boolean sandbox,
        String merchantId,
        String orderId,
        String items,
        String currency,
        String amount,
        String hash,
        String firstName,
        String lastName,
        String email,
        String phone,
        String address,
        String city,
        String country,
        String returnUrl,
        String cancelUrl,
        String notifyUrl,
        String custom1,
        String custom2) {}
