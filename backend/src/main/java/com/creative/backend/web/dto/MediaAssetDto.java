package com.creative.backend.web.dto;

import com.creative.backend.domain.MediaAsset;
import java.time.ZoneOffset;

public record MediaAssetDto(
        String id,
        String name,
        String url,
        String storagePath,
        String kind,
        String format,
        int width,
        int height,
        long size,
        long createdAt,
        String ownerId) {

    public static MediaAssetDto from(MediaAsset asset) {
        return new MediaAssetDto(
                asset.getId().toString(),
                asset.getName(),
                asset.getUrl(),
                asset.getStoragePath(),
                asset.getKind(),
                asset.getFormat(),
                asset.getWidth(),
                asset.getHeight(),
                asset.getSizeBytes(),
                asset.getCreatedAt().toInstant(ZoneOffset.UTC).toEpochMilli(),
                asset.getOwnerId());
    }
}
