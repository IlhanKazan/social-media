package com.ilhankazan.social;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import com.ilhankazan.social.config.AppProperties;

@SpringBootApplication
@EnableJpaAuditing
@ConfigurationPropertiesScan
public class SocialApiApplication {

	public static void main(String[] args) {
		SpringApplication.run(SocialApiApplication.class, args);
	}

}
