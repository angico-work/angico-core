package com.angico.auth;

import com.angico.common.ForbiddenException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Set;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class CsrfProtectionInterceptor implements HandlerInterceptor {

    private static final Set<String> SAFE_METHODS = Set.of("GET", "HEAD", "OPTIONS");
    private final AuthService authService;

    public CsrfProtectionInterceptor(AuthService authService) {
        this.authService = authService;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if (SAFE_METHODS.contains(request.getMethod().toUpperCase()) || isPublicMutation(request.getRequestURI())) {
            return true;
        }
        Object sessionId = request.getAttribute(AuthInterceptor.ATTR_SESSION_ID);
        String csrfToken = request.getHeader("X-CSRF-Token");
        if (!(sessionId instanceof Long id) || !authService.validCsrf(id, csrfToken)) {
            throw new ForbiddenException("Token CSRF inválido.");
        }
        return true;
    }

    private boolean isPublicMutation(String uri) {
        return "/api/auth/login".equals(uri) || "/api/auth/register".equals(uri);
    }
}
