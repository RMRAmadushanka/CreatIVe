package com.creative.backend.web.dto;

import com.creative.backend.domain.User;
import com.creative.backend.domain.UserRole;
import java.time.LocalDateTime;

public record UserDto(String id, String email, String name, String role, LocalDateTime createdAt) {

    public static UserDto from(User user) {
        return new UserDto(
                user.getId(),
                user.getEmail(),
                user.getName(),
                user.getRole() == UserRole.ADMIN ? "admin" : "user",
                user.getCreatedAt());
    }
}
