package com.orbite.config;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.web.SecurityFilterChain;
@Configuration @EnableWebSecurity @Profile("supabase") public class SecurityConfig {
  @Bean SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
    return http.csrf(AbstractHttpConfigurer::disable).cors(cors -> {}).authorizeHttpRequests(auth -> auth.requestMatchers("/actuator/health", "/api/questions").permitAll().anyRequest().authenticated()).oauth2ResourceServer(oauth -> oauth.jwt(jwt -> {})).build();
  }
}
