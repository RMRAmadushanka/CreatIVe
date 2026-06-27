package com.creative.backend.web;

import com.creative.backend.domain.Page;
import com.creative.backend.domain.PageRepository;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/pages")
public class PageController {

    private final PageRepository pageRepository;

    public PageController(PageRepository pageRepository) {
        this.pageRepository = pageRepository;
    }

    @PostMapping
    public ResponseEntity<Page> create(@RequestBody CreatePageRequest request) {
        Page page = new Page();
        page.setTitle(request.title());
        page.setSlug(request.slug());
        page.setLayoutData(request.layoutData());

        Page saved = pageRepository.save(page);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @GetMapping("/{slug}")
    public ResponseEntity<Page> getBySlug(@PathVariable String slug) {
        return pageRepository.findBySlug(slug)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    public record CreatePageRequest(String title, String slug, Map<String, Object> layoutData) {
    }
}
