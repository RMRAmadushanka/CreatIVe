package com.creative.backend.security;

import com.creative.backend.billing.SubscriptionService;
import com.creative.backend.domain.User;
import com.creative.backend.domain.UserRepository;
import com.creative.backend.domain.UserRole;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Lazy;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class CurrentUserService {

    private final UserRepository userRepository;
    private final SubscriptionService subscriptionService;
    private final String bootstrapAdminEmail;

    public CurrentUserService(
            UserRepository userRepository,
            @Lazy SubscriptionService subscriptionService,
            @Value("${app.bootstrap-admin-email:}") String bootstrapAdminEmail) {
        this.userRepository = userRepository;
        this.subscriptionService = subscriptionService;
        this.bootstrapAdminEmail = bootstrapAdminEmail == null ? "" : bootstrapAdminEmail.trim().toLowerCase();
    }

    public User requireUser() {
        Jwt jwt = currentJwt()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required"));
        return userRepository.findById(jwt.getSubject()).orElseGet(() -> syncFromJwt(jwt));
    }

    public User syncFromJwt(Jwt jwt) {
        String sub = jwt.getSubject();
        String email = jwt.getClaimAsString("email");
        if (email == null || email.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "JWT is missing email claim");
        }

        return userRepository.findById(sub).map(existing -> {
            existing.setEmail(email);
            existing.setName(readName(jwt));
            User saved = userRepository.save(existing);
            subscriptionService.ensureActiveSubscription(saved.getId());
            return saved;
        }).orElseGet(() -> {
            UserRole role = UserRole.USER;
            if (!bootstrapAdminEmail.isBlank() && email.equalsIgnoreCase(bootstrapAdminEmail)) {
                role = UserRole.ADMIN;
            }
            User created = new User();
            created.setId(sub);
            created.setEmail(email);
            created.setName(readName(jwt));
            created.setRole(role);
            User saved = userRepository.save(created);
            subscriptionService.ensureActiveSubscription(saved.getId());
            return saved;
        });
    }

    public boolean isAdmin() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) {
            return false;
        }
        return auth.getAuthorities().stream().anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));
    }

    public void requireAdmin() {
        if (!isAdmin()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin access required");
        }
    }

    public boolean canAccessOwner(String ownerId) {
        if (ownerId == null) {
            return isAdmin();
        }
        if (isAdmin()) {
            return true;
        }
        return currentJwt().map(Jwt::getSubject).map(sub -> sub.equals(ownerId)).orElse(false);
    }

    private java.util.Optional<Jwt> currentJwt() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof Jwt jwt) {
            return java.util.Optional.of(jwt);
        }
        return java.util.Optional.empty();
    }

    private String readName(Jwt jwt) {
        Map<String, Object> metadata = jwt.getClaimAsMap("user_metadata");
        if (metadata != null) {
            Object name = metadata.get("name");
            if (name instanceof String s && !s.isBlank()) {
                return s;
            }
        }
        String email = jwt.getClaimAsString("email");
        if (email != null && email.contains("@")) {
            return email.substring(0, email.indexOf('@'));
        }
        return "User";
    }
}
