package com.ilhankazan.social.config;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeIn;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.info.Contact;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import io.swagger.v3.oas.annotations.servers.Server;
import org.springframework.context.annotation.Configuration;

@Configuration
@OpenAPIDefinition(
    info = @Info(
        title = "MicroBlog",
        description = "Event-driven, real-time social media backend built with Spring Boot.",
        version = "1.0.0",
        contact = @Contact(
            name = "İlhan Kazan",
            email = "mail",
            url = "https://github.com/IlhanKazan"
        )
    ),
    servers = {
        @Server(description = "Local Environment", url = "http://localhost:8080"),
        // TODO [29.04.2026 03:03]: proda gecince linki ekleyecegim
        @Server(description = "Production", url = "link")
    },
    security = {
        @SecurityRequirement(name = "bearerAuth")
    }
)
@SecurityScheme(
    name = "bearerAuth",
    description = "JWT authentication. Login first, copy the access token, and paste it here.",
    scheme = "bearer",
    type = SecuritySchemeType.HTTP,
    bearerFormat = "JWT",
    in = SecuritySchemeIn.HEADER
)
public class OpenApiConfig {
}
