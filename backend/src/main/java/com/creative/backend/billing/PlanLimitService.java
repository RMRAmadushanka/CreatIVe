package com.creative.backend.billing;

import com.creative.backend.domain.Plan;
import com.creative.backend.domain.ProjectRepository;
import com.creative.backend.domain.UsageCounter;
import com.creative.backend.domain.UsageCounterRepository;
import com.creative.backend.security.CurrentUserService;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PlanLimitService {

    private static final DateTimeFormatter PERIOD = DateTimeFormatter.ofPattern("yyyy-MM");

    private final SubscriptionService subscriptionService;
    private final ProjectRepository projectRepository;
    private final UsageCounterRepository usageCounterRepository;
    private final CurrentUserService currentUserService;

    public PlanLimitService(
            SubscriptionService subscriptionService,
            ProjectRepository projectRepository,
            UsageCounterRepository usageCounterRepository,
            CurrentUserService currentUserService) {
        this.subscriptionService = subscriptionService;
        this.projectRepository = projectRepository;
        this.usageCounterRepository = usageCounterRepository;
        this.currentUserService = currentUserService;
    }

    public Plan currentPlan(String userId) {
        return subscriptionService.requirePlan(userId);
    }

    public void requireCanCreateProject(String userId) {
        if (currentUserService.isAdmin()) {
            return;
        }
        Plan plan = currentPlan(userId);
        long count = projectRepository.countByOwnerId(userId);
        if (plan.getMaxProjects() >= 0 && count >= plan.getMaxProjects()) {
            throw new PlanLimitException(
                    PlanLimitException.PROJECT_LIMIT,
                    "Project limit reached on the "
                            + plan.getName()
                            + " plan ("
                            + plan.getMaxProjects()
                            + "). Existing projects are kept — upgrade to create more.");
        }
    }

    public void requireCanAddPage(String userId, int currentPageCount) {
        if (currentUserService.isAdmin()) {
            return;
        }
        Plan plan = currentPlan(userId);
        if (plan.getMaxPagesPerProject() >= 0 && currentPageCount >= plan.getMaxPagesPerProject()) {
            throw new PlanLimitException(
                    PlanLimitException.PAGE_LIMIT,
                    "Page limit reached on the "
                            + plan.getName()
                            + " plan ("
                            + plan.getMaxPagesPerProject()
                            + " per project). Existing pages are kept — upgrade to add more.");
        }
    }

    public void requireCanReplacePages(String userId, int nextPageCount) {
        if (currentUserService.isAdmin()) {
            return;
        }
        Plan plan = currentPlan(userId);
        if (plan.getMaxPagesPerProject() >= 0 && nextPageCount > plan.getMaxPagesPerProject()) {
            throw new PlanLimitException(
                    PlanLimitException.PAGE_LIMIT,
                    "Page limit reached on the "
                            + plan.getName()
                            + " plan ("
                            + plan.getMaxPagesPerProject()
                            + " per project). Remove pages or upgrade to continue.");
        }
    }

    @Transactional
    public void requireCanUploadMedia(String userId) {
        if (currentUserService.isAdmin()) {
            return;
        }
        Plan plan = currentPlan(userId);
        int max = plan.getMaxMediaUploadsMonth();
        if (max < 0) {
            return;
        }
        UsageCounter counter = getOrCreateCounter(userId);
        if (counter.getMediaUploads() >= max) {
            throw new PlanLimitException(
                    PlanLimitException.MEDIA_LIMIT,
                    "Monthly media upload limit reached on the "
                            + plan.getName()
                            + " plan ("
                            + max
                            + "). Existing media is kept — upgrade or wait until next month.");
        }
    }

    @Transactional
    public void recordMediaUpload(String userId) {
        if (currentUserService.isAdmin()) {
            return;
        }
        UsageCounter counter = getOrCreateCounter(userId);
        counter.setMediaUploads(counter.getMediaUploads() + 1);
        usageCounterRepository.save(counter);
    }

    public int mediaUploadsThisMonth(String userId) {
        return usageCounterRepository
                .findById(new UsageCounter.Pk(userId, currentPeriod()))
                .map(UsageCounter::getMediaUploads)
                .orElse(0);
    }

    public Set<String> allowedBuilderComponents(Plan plan) {
        String raw = plan.getBuilderComponents() == null ? "" : plan.getBuilderComponents().trim();
        if ("*".equals(raw)) {
            return Set.of("*");
        }
        return Arrays.stream(raw.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toSet());
    }

    public boolean isBuilderComponentAllowed(Plan plan, String componentType) {
        Set<String> allowed = allowedBuilderComponents(plan);
        return allowed.contains("*") || allowed.contains(componentType);
    }

    private UsageCounter getOrCreateCounter(String userId) {
        String period = currentPeriod();
        return usageCounterRepository
                .findById(new UsageCounter.Pk(userId, period))
                .orElseGet(() -> {
                    UsageCounter c = new UsageCounter();
                    c.setUserId(userId);
                    c.setPeriodYyyyMm(period);
                    c.setMediaUploads(0);
                    return usageCounterRepository.save(c);
                });
    }

    private static String currentPeriod() {
        return YearMonth.from(LocalDate.now()).format(PERIOD);
    }
}
