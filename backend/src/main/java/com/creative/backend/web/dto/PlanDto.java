package com.creative.backend.web.dto;

import com.creative.backend.domain.Plan;
import java.util.Arrays;
import java.util.List;

public record PlanDto(
        String id,
        String name,
        int priceLkr,
        String billingInterval,
        int maxProjects,
        int maxPagesPerProject,
        int maxMediaUploadsMonth,
        List<String> builderComponents,
        boolean allBuilderComponents) {

    public static PlanDto from(Plan plan) {
        String raw = plan.getBuilderComponents() == null ? "" : plan.getBuilderComponents().trim();
        boolean all = "*".equals(raw);
        List<String> components = all
                ? List.of()
                : Arrays.stream(raw.split(","))
                        .map(String::trim)
                        .filter(s -> !s.isEmpty())
                        .toList();
        return new PlanDto(
                plan.getId(),
                plan.getName(),
                plan.getPriceLkr(),
                plan.getBillingInterval(),
                plan.getMaxProjects(),
                plan.getMaxPagesPerProject(),
                plan.getMaxMediaUploadsMonth(),
                components,
                all);
    }
}
