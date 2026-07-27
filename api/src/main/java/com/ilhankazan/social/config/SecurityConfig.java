package com.ilhankazan.social.config;

import com.ilhankazan.social.security.JwtAuthenticationFilter;
import com.ilhankazan.social.security.ReadOnlyModeFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.Customizer;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;
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
    private final AppProperties.MetricsProperties metricsProps;

    /**
     * Scoped to /actuator/prometheus only, and ordered ahead of the main chain.
     * A monitoring agent can't hold a 15-minute JWT, so this single endpoint takes
     * long-lived HTTP Basic credentials instead. Every other /actuator path still
     * falls through to the main chain's ROLE_ADMIN rule.
     */
    @Bean
    @Order(1)
    public SecurityFilterChain prometheusFilterChain(HttpSecurity http) throws Exception {
        UserDetails scraper = User.withUsername(metricsProps.username())
            .password(passwordEncoder().encode(metricsProps.password()))
            .roles("METRICS")
            .build();

        return http
            .securityMatcher("/actuator/prometheus")
            .csrf(AbstractHttpConfigurer::disable)
            .cors(AbstractHttpConfigurer::disable)
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth.anyRequest().hasRole("METRICS"))
            .httpBasic(Customizer.withDefaults())
            // Scoped to this chain only — the app's own UserDetailsService is untouched.
            .userDetailsService(new InMemoryUserDetailsManager(scraper))
            .build();
    }

    @Bean
    @Order(2)
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
                .requestMatchers("/ws-native", "/ws-native/**").permitAll()
                .requestMatchers("/api/v1/mobile/version", "/api/v1/mobile/download/**").permitAll()
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
        return new BCryptPasswordEncoder(12);
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
}
