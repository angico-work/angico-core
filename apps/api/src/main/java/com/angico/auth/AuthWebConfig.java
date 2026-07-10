package com.angico.auth;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class AuthWebConfig implements WebMvcConfigurer {

    private final AuthInterceptor authInterceptor;
    private final CsrfProtectionInterceptor csrfProtectionInterceptor;

    public AuthWebConfig(
            AuthInterceptor authInterceptor,
            CsrfProtectionInterceptor csrfProtectionInterceptor
    ) {
        this.authInterceptor = authInterceptor;
        this.csrfProtectionInterceptor = csrfProtectionInterceptor;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(authInterceptor)
                .order(0)
                .addPathPatterns("/api/**", "/health");
        registry.addInterceptor(csrfProtectionInterceptor)
                .order(1)
                .addPathPatterns("/api/**", "/health");
    }
}
