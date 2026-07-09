package com.creative.backend.web;

import com.creative.backend.domain.User;
import com.creative.backend.domain.UserRepository;
import com.creative.backend.domain.UserRole;
import com.creative.backend.security.CurrentUserService;
import com.creative.backend.web.dto.UserDto;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/admin/users")
public class AdminUserController {

    private final UserRepository userRepository;
    private final CurrentUserService currentUserService;

    public AdminUserController(UserRepository userRepository, CurrentUserService currentUserService) {
        this.userRepository = userRepository;
        this.currentUserService = currentUserService;
    }

    @GetMapping
    public List<UserDto> listUsers() {
        currentUserService.requireAdmin();
        return userRepository.findAll().stream().map(UserDto::from).toList();
    }

    @PatchMapping("/{id}/role")
    public UserDto updateRole(@PathVariable String id, @RequestBody UpdateRoleRequest request) {
        currentUserService.requireAdmin();

        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        UserRole nextRole = parseRole(request.role());
        if (user.getId().equals(currentUserService.requireUser().getId())
                && nextRole != UserRole.ADMIN) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "You cannot remove your own admin access");
        }

        user.setRole(nextRole);
        return UserDto.from(userRepository.save(user));
    }

    private UserRole parseRole(String role) {
        if (role == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Role is required");
        }
        return switch (role.toLowerCase()) {
            case "admin" -> UserRole.ADMIN;
            case "user" -> UserRole.USER;
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid role: " + role);
        };
    }

    public record UpdateRoleRequest(String role) {
    }
}
