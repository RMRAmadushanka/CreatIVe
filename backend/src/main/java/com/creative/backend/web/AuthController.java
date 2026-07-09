package com.creative.backend.web;

import com.creative.backend.security.CurrentUserService;
import com.creative.backend.web.dto.UserDto;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final CurrentUserService currentUserService;

    public AuthController(CurrentUserService currentUserService) {
        this.currentUserService = currentUserService;
    }

    @GetMapping("/me")
    public UserDto me() {
        return UserDto.from(currentUserService.requireUser());
    }

    @PostMapping("/sync")
    public UserDto sync(@AuthenticationPrincipal Jwt jwt) {
        return UserDto.from(currentUserService.syncFromJwt(jwt));
    }
}
