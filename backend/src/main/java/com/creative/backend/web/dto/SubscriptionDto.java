package com.creative.backend.web.dto;

import com.creative.backend.domain.Subscription;
import java.time.LocalDateTime;

public record SubscriptionDto(
        String id,
        String status,
        LocalDateTime currentPeriodStart,
        LocalDateTime currentPeriodEnd,
        boolean cancelAtPeriodEnd,
        String payhereOrderId,
        PlanDto plan,
        UsageDto usage) {

    public record UsageDto(int projectsUsed, int mediaUploadsThisMonth, String period) {}

    public static SubscriptionDto from(Subscription sub, UsageDto usage) {
        return new SubscriptionDto(
                sub.getId().toString(),
                sub.getStatus(),
                sub.getCurrentPeriodStart(),
                sub.getCurrentPeriodEnd(),
                sub.isCancelAtPeriodEnd(),
                sub.getPayhereOrderId(),
                PlanDto.from(sub.getPlan()),
                usage);
    }
}
