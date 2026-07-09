package com.creative.backend.security;

import com.creative.backend.domain.User;
import com.creative.backend.domain.UserRepository;
import com.creative.backend.domain.UserRole;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.stereotype.Component;

@Component
public class SupabaseJwtAuthenticationConverter implements Converter<Jwt, AbstractAuthenticationToken> {

    private final UserRepository userRepository;
    private final String bootstrapAdminEmail;

    public SupabaseJwtAuthenticationConverter(
            UserRepository userRepository,
            @Value("${app.bootstrap-admin-email:}") String bootstrapAdminEmail) {
        this.userRepository = userRepository;
        this.bootstrapAdminEmail = bootstrapAdminEmail == null ? "" : bootstrapAdminEmail.trim().toLowerCase();
    }

    @Override
    public AbstractAuthenticationToken convert(Jwt jwt) {
        JwtAuthenticationConverter delegate = new JwtAuthenticationConverter();
        delegate.setJwtGrantedAuthoritiesConverter(token -> authoritiesFor(jwt));
        return delegate.convert(jwt);
    }

    private Collection<GrantedAuthority> authoritiesFor(Jwt jwt) {
        String sub = jwt.getSubject();
        User user = userRepository.findById(sub).orElse(null);

        if (user == null) {
            user = bootstrapUser(jwt);
        }

        UserRole role = user != null ? user.getRole() : UserRole.USER;
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }

    private User bootstrapUser(Jwt jwt) {
        String sub = jwt.getSubject();
        String email = jwt.getClaimAsString("email");
        if (email == null || email.isBlank()) {
            return null;
        }

        String name = readName(jwt);
        UserRole role = UserRole.USER;
        if (!bootstrapAdminEmail.isBlank() && email.equalsIgnoreCase(bootstrapAdminEmail)) {
            role = UserRole.ADMIN;
        }

        User user = new User();
        user.setId(sub);
        user.setEmail(email);
        user.setName(name);
        user.setRole(role);
        return userRepository.save(user);
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
