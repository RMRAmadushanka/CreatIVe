package com.creative.backend.web;

import com.creative.backend.domain.Page;
import com.creative.backend.domain.PageRepository;
import com.creative.backend.domain.User;
import com.creative.backend.security.CurrentUserService;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/pages")
public class PageController {

    private final PageRepository pageRepository;
    private final CurrentUserService currentUserService;

    public PageController(PageRepository pageRepository, CurrentUserService currentUserService) {
        this.pageRepository = pageRepository;
        this.currentUserService = currentUserService;
    }

    @GetMapping
    public List<Page> listMine() {
        User user = currentUserService.requireUser();
        if (currentUserService.isAdmin()) {
            return pageRepository.findAll();
        }
        return pageRepository.findByOwnerIdOrderByCreatedAtDesc(user.getId());
    }

    /**
     * Create or update a page by slug for the current user.
     * Repeated Save clicks with the same slug update the existing row.
     */
    @PostMapping
    public ResponseEntity<Page> create(@RequestBody CreatePageRequest request) {
        User user = currentUserService.requireUser();

        if (request.title() == null || request.title().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Title is required");
        }
        if (request.slug() == null || request.slug().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Slug is required");
        }

        String slug = normalizeSlug(request.slug());

        try {
            var existing = pageRepository.findBySlug(slug);
            if (existing.isPresent()) {
                Page page = existing.get();
                if (!currentUserService.canAccessOwner(page.getOwnerId())) {
                    throw new ResponseStatusException(
                            HttpStatus.CONFLICT, "Slug is already used by another page");
                }
                page.setTitle(request.title().trim());
                page.setLayoutData(request.layoutData());
                page.setOwnerId(user.getId());
                return ResponseEntity.ok(pageRepository.save(page));
            }

            Page page = new Page();
            page.setTitle(request.title().trim());
            page.setSlug(slug);
            page.setLayoutData(request.layoutData());
            page.setOwnerId(user.getId());
            Page saved = pageRepository.save(page);
            return ResponseEntity.status(HttpStatus.CREATED).body(saved);
        } catch (DataIntegrityViolationException ex) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "Could not save page — slug may already exist", ex);
        }
    }

    @GetMapping("/{slug}")
    public ResponseEntity<Page> getBySlug(@PathVariable String slug) {
        return pageRepository.findBySlug(normalizeSlug(slug))
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        Page page = pageRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Page not found"));

        if (!currentUserService.canAccessOwner(page.getOwnerId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You do not own this page");
        }

        pageRepository.delete(page);
        return ResponseEntity.noContent().build();
    }

    private static String normalizeSlug(String slug) {
        String cleaned = slug.trim().replaceAll("^/+|/+$", "");
        return cleaned.isBlank() ? "page" : cleaned;
    }

    public record CreatePageRequest(String title, String slug, Map<String, Object> layoutData) {
    }
}
