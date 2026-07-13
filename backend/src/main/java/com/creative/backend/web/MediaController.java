package com.creative.backend.web;

import com.creative.backend.billing.PlanLimitService;
import com.creative.backend.domain.MediaAsset;
import com.creative.backend.domain.MediaAssetRepository;
import com.creative.backend.domain.User;
import com.creative.backend.security.CurrentUserService;
import com.creative.backend.web.dto.MediaAssetDto;
import java.util.List;
import java.util.Set;
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
@RequestMapping("/api/media")
public class MediaController {

    private static final Set<String> ALLOWED_KINDS = Set.of("logo", "icon", "image");

    private final MediaAssetRepository mediaAssetRepository;
    private final CurrentUserService currentUserService;
    private final PlanLimitService planLimitService;

    public MediaController(
            MediaAssetRepository mediaAssetRepository,
            CurrentUserService currentUserService,
            PlanLimitService planLimitService) {
        this.mediaAssetRepository = mediaAssetRepository;
        this.currentUserService = currentUserService;
        this.planLimitService = planLimitService;
    }

    @GetMapping
    public List<MediaAssetDto> list() {
        User user = currentUserService.requireUser();
        List<MediaAsset> assets = currentUserService.isAdmin()
                ? mediaAssetRepository.findAllByOrderByCreatedAtDesc()
                : mediaAssetRepository.findByOwnerIdOrderByCreatedAtDesc(user.getId());
        return assets.stream().map(MediaAssetDto::from).toList();
    }

    @PostMapping
    public ResponseEntity<MediaAssetDto> create(@RequestBody CreateMediaRequest request) {
        User user = currentUserService.requireUser();
        validate(request);
        planLimitService.requireCanUploadMedia(user.getId());

        MediaAsset asset = new MediaAsset();
        asset.setOwnerId(user.getId());
        asset.setName(request.name().trim());
        asset.setUrl(request.url().trim());
        asset.setStoragePath(blankToNull(request.storagePath()));
        asset.setKind(request.kind().trim().toLowerCase());
        asset.setFormat(request.format().trim().toUpperCase());
        asset.setWidth(Math.max(0, request.width()));
        asset.setHeight(Math.max(0, request.height()));
        asset.setSizeBytes(Math.max(0, request.size()));

        MediaAsset saved = mediaAssetRepository.save(asset);
        planLimitService.recordMediaUpload(user.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(MediaAssetDto.from(saved));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<MediaAssetDto> delete(@PathVariable UUID id) {
        MediaAsset asset = mediaAssetRepository
                .findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Asset not found"));

        if (!currentUserService.canAccessOwner(asset.getOwnerId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You do not own this asset");
        }

        mediaAssetRepository.delete(asset);
        return ResponseEntity.ok(MediaAssetDto.from(asset));
    }

    private void validate(CreateMediaRequest request) {
        if (request.name() == null || request.name().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Name is required");
        }
        if (request.url() == null || request.url().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "URL is required");
        }
        if (request.kind() == null || !ALLOWED_KINDS.contains(request.kind().trim().toLowerCase())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Kind must be logo, icon, or image");
        }
        if (request.format() == null || request.format().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Format is required");
        }
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    public record CreateMediaRequest(
            String name,
            String url,
            String storagePath,
            String kind,
            String format,
            int width,
            int height,
            long size) {
    }
}
