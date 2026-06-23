package com.ilhankazan.social.config;

import com.ilhankazan.social.security.JwtAuthenticationFilter;
import com.ilhankazan.social.security.ReadOnlyModeFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;
import org.springframework.security.web.header.writers.StaticHeadersWriter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final ReadOnlyModeFilter readOnlyModeFilter;
    private final AppProperties.CorsProperties corsProps;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .headers(headers -> {
                headers.contentTypeOptions(c -> {});
                headers.frameOptions(f -> f.deny());
                headers.referrerPolicy(r -> r.policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN));
                headers.addHeaderWriter(new StaticHeadersWriter("Permissions-Policy", "geolocation=(), microphone=(), camera=()"));
                headers.httpStrictTransportSecurity(h -> h.includeSubDomains(true).maxAgeInSeconds(31536000));
                headers.contentSecurityPolicy(csp -> csp.policyDirectives(
                    "default-src 'self'; img-src 'self' https://res.cloudinary.com data:; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' wss: https:;"
                ));
            })
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/v1/auth/logout-all").authenticated()
                .requestMatchers("/api/v1/auth/**").permitAll()
                // SockJS handshake is permitAll here; STOMP-level auth is enforced by WebSocketAuthInterceptor
                .requestMatchers("/ws", "/ws/**").permitAll()
                .requestMatchers("/actuator/health").permitAll()
                .requestMatchers("/actuator/**").hasRole("ADMIN")
                .requestMatchers("/api/v1/admin/**").hasRole("ADMIN")
                // Public read endpoints (anonymous viewing). Personalised/owner GETs
                // stay authed and are listed FIRST so they win the match.
                .requestMatchers(HttpMethod.GET,
                    "/api/v1/posts/feed",
                    "/api/v1/accounts/me", "/api/v1/accounts/me/**",
                    "/api/v1/accounts/suggestions").authenticated()
                .requestMatchers(HttpMethod.GET,
                    "/api/v1/posts/explore",
                    "/api/v1/posts/*",
                    "/api/v1/posts/*/ancestors",
                    "/api/v1/posts/*/replies",
                    "/api/v1/posts/*/quotes",
                    "/api/v1/posts/by-user/**",
                    "/api/v1/accounts/*",
                    "/api/v1/search/**").permitAll()
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
            .addFilterAfter(readOnlyModeFilter, JwtAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(corsProps.allowedOrigins() != null ? corsProps.allowedOrigins() : List.of());
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("Authorization", "Content-Type", "X-Requested-With", "Accept", "Idempotency-Key"));
        configuration.setExposedHeaders(List.of("X-Request-Id", "Retry-After"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(10);
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
}
