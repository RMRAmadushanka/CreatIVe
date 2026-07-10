package com.creative.backend.web;

import com.creative.backend.domain.Project;
import com.creative.backend.domain.ProjectPage;
import com.creative.backend.domain.ProjectRepository;
import com.creative.backend.domain.User;
import com.creative.backend.security.CurrentUserService;
import com.creative.backend.web.dto.ProjectDto;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/projects")
public class ProjectController {

    private final ProjectRepository projectRepository;
    private final CurrentUserService currentUserService;

    public ProjectController(ProjectRepository projectRepository, CurrentUserService currentUserService) {
        this.projectRepository = projectRepository;
        this.currentUserService = currentUserService;
    }

    @GetMapping
    public List<ProjectDto> list() {
        User user = currentUserService.requireUser();
        List<Project> projects = currentUserService.isAdmin()
                ? projectRepository.findAllByOrderByCreatedAtDesc()
                : projectRepository.findByOwnerIdOrderByCreatedAtDesc(user.getId());
        return projects.stream().map(ProjectDto::from).toList();
    }

    @GetMapping("/{id}")
    public ProjectDto get(@PathVariable UUID id) {
        return ProjectDto.from(requireAccessibleProject(id));
    }

    @PostMapping
    public ResponseEntity<ProjectDto> create(@RequestBody CreateProjectRequest request) {
        User user = currentUserService.requireUser();
        if (request.name() == null || request.name().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Name is required");
        }
        if (request.domain() == null || request.domain().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Domain is required");
        }

        Project project = new Project();
        project.setName(request.name().trim());
        project.setDomain(request.domain().trim());
        project.setOwner(user);

        ProjectPage home = new ProjectPage();
        home.setTitle("Home");
        home.setSlug("/");
        home.setCanvasNodes(List.of());
        home.setSortOrder(0);
        project.addPage(home);

        Project saved = projectRepository.save(project);
        Project detailed = projectRepository.findDetailedById(saved.getId()).orElse(saved);
        return ResponseEntity.status(HttpStatus.CREATED).body(ProjectDto.from(detailed));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        projectRepository.delete(requireAccessibleProject(id));
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/pages")
    public ProjectDto addPage(@PathVariable UUID id, @RequestBody AddPageRequest request) {
        Project project = requireAccessibleProject(id);
        if (request.title() == null || request.title().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Title is required");
        }

        String title = request.title().trim();
        String slug = request.slug() != null && !request.slug().isBlank()
                ? normalizeSlug(request.slug())
                : slugify(title);

        ProjectPage page = new ProjectPage();
        page.setTitle(title);
        page.setSlug(slug);
        page.setCanvasNodes(List.of());
        page.setSortOrder(project.getPages().size());
        project.addPage(page);

        projectRepository.save(project);
        return ProjectDto.from(projectRepository.findDetailedById(id).orElse(project));
    }

    @DeleteMapping("/{id}/pages/{pageId}")
    public ProjectDto deletePage(@PathVariable UUID id, @PathVariable UUID pageId) {
        Project project = requireAccessibleProject(id);
        if (project.getPages().size() <= 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A project must keep at least one page");
        }

        boolean removed = project.getPages().removeIf(p -> p.getId().equals(pageId));
        if (!removed) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Page not found");
        }

        int order = 0;
        for (ProjectPage page : project.getPages()) {
            page.setSortOrder(order++);
        }

        projectRepository.save(project);
        return ProjectDto.from(projectRepository.findDetailedById(id).orElse(project));
    }

    @PutMapping("/{id}/pages")
    public ProjectDto replacePages(@PathVariable UUID id, @RequestBody ReplacePagesRequest request) {
        Project project = requireAccessibleProject(id);
        if (request.pages() == null || request.pages().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "At least one page is required");
        }

        Map<UUID, ProjectPage> byId = new HashMap<>();
        for (ProjectPage page : project.getPages()) {
            byId.put(page.getId(), page);
        }

        Set<UUID> keep = new HashSet<>();
        List<ProjectPage> ordered = new ArrayList<>();
        int order = 0;

        for (PagePayload payload : request.pages()) {
            ProjectPage page = resolvePage(byId, payload.id());
            page.setTitle(blankTo(payload.title(), "Untitled"));
            page.setSlug(payload.slug() == null || payload.slug().isBlank()
                    ? "/page"
                    : normalizeSlug(payload.slug()));
            page.setCanvasNodes(payload.canvasNodes() == null ? List.of() : new ArrayList<>(payload.canvasNodes()));
            page.setSortOrder(order++);
            if (page.getId() != null) {
                keep.add(page.getId());
            }
            ordered.add(page);
        }

        project.getPages().removeIf(p -> p.getId() != null && !keep.contains(p.getId()));

        project.getPages().clear();
        for (ProjectPage page : ordered) {
            project.addPage(page);
        }

        projectRepository.save(project);
        return ProjectDto.from(projectRepository.findDetailedById(id).orElse(project));
    }

    private ProjectPage resolvePage(Map<UUID, ProjectPage> byId, String rawId) {
        if (rawId != null && !rawId.isBlank()) {
            try {
                UUID pageId = UUID.fromString(rawId);
                ProjectPage existing = byId.get(pageId);
                if (existing != null) {
                    return existing;
                }
            } catch (IllegalArgumentException ignored) {
                // treat as new page
            }
        }
        return new ProjectPage();
    }

    private Project requireAccessibleProject(UUID id) {
        Project project = projectRepository
                .findDetailedById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found"));
        if (!currentUserService.canAccessOwner(project.getOwner().getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You do not own this project");
        }
        return project;
    }

    private static String blankTo(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }

    private static String slugify(String title) {
        String slug = title
                .toLowerCase()
                .trim()
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-|-$", "");
        return "/" + (slug.isBlank() ? "page" : slug);
    }

    private static String normalizeSlug(String slug) {
        String cleaned = slug.trim();
        if (!cleaned.startsWith("/")) {
            cleaned = "/" + cleaned;
        }
        return cleaned;
    }

    public record CreateProjectRequest(String name, String domain) {
    }

    public record AddPageRequest(String title, String slug) {
    }

    public record PagePayload(String id, String title, String slug, List<Object> canvasNodes) {
    }

    public record ReplacePagesRequest(List<PagePayload> pages) {
    }
}
