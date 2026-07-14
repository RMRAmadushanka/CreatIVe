package com.creative.backend.web.dto;

import com.creative.backend.domain.Subscription;
import java.time.LocalDateTime;
import java.util.List;

public record SubscriptionDto(
        String id,
        String status,
        LocalDateTime currentPeriodStart,
        LocalDateTime currentPeriodEnd,
        boolean cancelAtPeriodEnd,
        String payhereOrderId,
        PlanDto plan,
        PlanDto pendingPlan,
        LocalDateTime gracePeriodEndsAt,
        String changeHint,
        List<String> overLimitWarnings,
        UsageDto usage) {

    public record UsageDto(int projectsUsed, int mediaUploadsThisMonth, String period) {}

    public static SubscriptionDto from(
            Subscription sub,
            UsageDto usage,
            String changeHint,
            List<String> overLimitWarnings) {
        return new SubscriptionDto(
                sub.getId().toString(),
                sub.getStatus(),
                sub.getCurrentPeriodStart(),
                sub.getCurrentPeriodEnd(),
                sub.isCancelAtPeriodEnd(),
                sub.getPayhereOrderId(),
                PlanDto.from(sub.getPlan()),
                sub.getPendingPlan() != null ? PlanDto.from(sub.getPendingPlan()) : null,
                sub.getGracePeriodEndsAt(),
                changeHint,
                overLimitWarnings == null ? List.of() : overLimitWarnings,
                usage);
    }
}
