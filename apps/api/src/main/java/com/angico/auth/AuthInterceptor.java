package com.angico.auth;

import com.angico.common.UnauthorizedException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class AuthInterceptor implements HandlerInterceptor {

    public static final String SESSION_COOKIE = "ANGICO_SESSION";
    public static final String ATTR_PESSOA_ID = "angico.pessoaId";
    public static final String ATTR_WORKSPACE_ID = "angico.workspaceId";
    public static final String ATTR_NOME = "angico.nome";
    public static final String ATTR_PAPEL = "angico.papel";
    public static final String ATTR_SESSION_ID = "angico.sessionId";
    public static final String ATTR_CSRF_TOKEN = "angico.csrfToken";

    private final AuthService authService;
    private final boolean authRequired;

    public AuthInterceptor(
            AuthService authService,
            @Value("${angico.auth.required:true}") boolean authRequired
    ) {
        this.authService = authService;
        this.authRequired = authRequired;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if ("OPTIONS".equalsIgnoreCase(request.getMethod()) || isPublic(request.getRequestURI())) {
            return true;
        }

        var principal = authService.authenticateSession(sessionToken(request.getCookies()));
        principal.ifPresent(value -> attach(request, value));

        if (authRequired && principal.isEmpty()) {
            throw new UnauthorizedException("Autenticação obrigatória.");
        }
        return true;
    }

    private boolean isPublic(String uri) {
        return "/health".equals(uri)
                || "/api/auth/login".equals(uri)
                || "/api/auth/register".equals(uri)
                || uri.startsWith("/assets/")
                || "/".equals(uri);
    }

    static String sessionToken(Cookie[] cookies) {
        if (cookies == null) {
            return null;
        }
        for (Cookie cookie : cookies) {
            if (SESSION_COOKIE.equals(cookie.getName())) {
                return cookie.getValue();
            }
        }
        return null;
    }

    private void attach(HttpServletRequest request, AuthService.SessionPrincipal principal) {
        request.setAttribute(ATTR_PESSOA_ID, principal.pessoa().getId());
        request.setAttribute(ATTR_WORKSPACE_ID, principal.session().getWorkspaceId());
        request.setAttribute(ATTR_NOME, principal.pessoa().getNome());
        request.setAttribute(ATTR_PAPEL, principal.pessoa().getPapel());
        request.setAttribute(ATTR_SESSION_ID, principal.session().getId());
        request.setAttribute(ATTR_CSRF_TOKEN, principal.csrfToken());
    }
}
