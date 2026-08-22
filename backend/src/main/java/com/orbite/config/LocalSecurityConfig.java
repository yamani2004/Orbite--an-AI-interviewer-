package com.orbite.config;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.web.SecurityFilterChain;
@Configuration @Profile("local") public class LocalSecurityConfig {
  @Bean SecurityFilterChain localSecurity(HttpSecurity http) throws Exception {
    return http.csrf(AbstractHttpConfigurer::disable).cors(cors -> {}).authorizeHttpRequests(auth -> auth.anyRequest().permitAll()).build();
  }
}
