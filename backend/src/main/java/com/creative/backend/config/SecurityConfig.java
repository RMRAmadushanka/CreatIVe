package com.creative.backend.config;

import com.creative.backend.security.SupabaseJwtAuthenticationConverter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Value("${supabase.jwt.issuer-uri:}")
    private String issuerUri;

    private final SupabaseJwtAuthenticationConverter jwtAuthenticationConverter;

    public SecurityConfig(SupabaseJwtAuthenticationConverter jwtAuthenticationConverter) {
        this.jwtAuthenticationConverter = jwtAuthenticationConverter;
    }

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http.csrf(csrf -> csrf.disable());
        http.cors(Customizer.withDefaults());
        http.sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS));

        if (issuerUri != null && !issuerUri.isBlank()) {
            http.authorizeHttpRequests(auth -> auth
                    .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                    .requestMatchers(HttpMethod.POST, "/api/billing/payhere/notify").permitAll()
                    .requestMatchers(HttpMethod.GET, "/api/billing/plans").permitAll()
                    .requestMatchers(HttpMethod.GET, "/api/billing/payhere/status").permitAll()
                    .requestMatchers(HttpMethod.GET, "/api/pages/*").permitAll()
                    .requestMatchers("/api/auth/**").authenticated()
                    .requestMatchers("/api/admin/**").hasRole("ADMIN")
                    .requestMatchers(HttpMethod.GET, "/api/pages").authenticated()
                    .requestMatchers(HttpMethod.POST, "/api/pages").authenticated()
                    .requestMatchers(HttpMethod.DELETE, "/api/pages/**").authenticated()
                    .requestMatchers("/api/**").authenticated()
                    .anyRequest().permitAll());
            http.oauth2ResourceServer(oauth2 -> oauth2.jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter)));
        } else {
            http.authorizeHttpRequests(auth -> auth.anyRequest().permitAll());
        }

        return http.build();
    }
}
