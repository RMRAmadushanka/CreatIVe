package com.creative.backend.web.dto;

import com.creative.backend.domain.Project;
import com.creative.backend.domain.ProjectPage;
import java.time.ZoneOffset;
import java.util.List;

public record ProjectDto(
        String id,
        String name,
        String domain,
        String ownerEmail,
        String ownerName,
        String ownerId,
        List<ProjectPageDto> pages,
        long createdAt) {

    public static ProjectDto from(Project project) {
        return new ProjectDto(
                project.getId().toString(),
                project.getName(),
                project.getDomain(),
                project.getOwner().getEmail(),
                project.getOwner().getName(),
                project.getOwner().getId(),
                project.getPages().stream().map(ProjectPageDto::from).toList(),
                project.getCreatedAt().toInstant(ZoneOffset.UTC).toEpochMilli());
    }

    public record ProjectPageDto(String id, String title, String slug, List<Object> canvasNodes) {
        public static ProjectPageDto from(ProjectPage page) {
            return new ProjectPageDto(
                    page.getId().toString(),
                    page.getTitle(),
                    page.getSlug(),
                    page.getCanvasNodes() == null ? List.of() : page.getCanvasNodes());
        }
    }
}
