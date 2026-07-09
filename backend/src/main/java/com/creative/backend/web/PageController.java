package com.creative.backend.web;

import com.creative.backend.domain.Page;
import com.creative.backend.domain.PageRepository;
import com.creative.backend.domain.User;
import com.creative.backend.security.CurrentUserService;
import java.util.List;
import java.util.Map;
import java.util.UUID;
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

    @PostMapping
    public ResponseEntity<Page> create(@RequestBody CreatePageRequest request) {
        User user = currentUserService.requireUser();

        Page page = new Page();
        page.setTitle(request.title());
        page.setSlug(request.slug());
        page.setLayoutData(request.layoutData());
        page.setOwnerId(user.getId());

        Page saved = pageRepository.save(page);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @GetMapping("/{slug}")
    public ResponseEntity<Page> getBySlug(@PathVariable String slug) {
        return pageRepository.findBySlug(slug)
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

    public record CreatePageRequest(String title, String slug, Map<String, Object> layoutData) {
    }
}
