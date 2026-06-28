package com.angico.auth;

import com.angico.common.UnauthorizedException;
import com.angico.pessoas.Pessoa;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class AuthInterceptor implements HandlerInterceptor {

    public static final String ATTR_PESSOA_ID = "angico.pessoaId";
    public static final String ATTR_WORKSPACE_ID = "angico.workspaceId";
    public static final String ATTR_NOME = "angico.nome";
    public static final String ATTR_PAPEL = "angico.papel";

    private final AuthService authService;
    private final boolean authRequired;

    public AuthInterceptor(
            AuthService authService,
<<<<<<< HEAD
            @Value("${angico.auth.required:false}") boolean authRequired
=======
            @Value("${angico.auth.required:true}") boolean authRequired
>>>>>>> origin
    ) {
        this.authService = authService;
        this.authRequired = authRequired;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if ("OPTIONS".equalsIgnoreCase(request.getMethod()) || isPublic(request.getRequestURI())) {
            return true;
        }

        String token = bearerToken(request.getHeader("Authorization"));
        var pessoa = authService.authenticateToken(token);
        pessoa.ifPresent(value -> attach(request, value));

        if (authRequired && pessoa.isEmpty()) {
<<<<<<< HEAD
            throw new UnauthorizedException("Autenticação obrigatória.");
=======
            throw new UnauthorizedException("Autenticacao obrigatoria.");
>>>>>>> origin
        }
        return true;
    }

    private boolean isPublic(String uri) {
        return "/health".equals(uri)
                || "/api/auth/login".equals(uri)
                || "/api/auth/register".equals(uri)
                || "/api/auth/angico-id/available".equals(uri)
                || uri.startsWith("/assets/")
                || "/".equals(uri);
    }

    private String bearerToken(String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            return null;
        }
        return authorization.substring("Bearer ".length()).trim();
    }

    private void attach(HttpServletRequest request, Pessoa pessoa) {
        request.setAttribute(ATTR_PESSOA_ID, pessoa.getId());
        request.setAttribute(ATTR_WORKSPACE_ID, pessoa.getWorkspaceId());
        request.setAttribute(ATTR_NOME, pessoa.getNome());
        request.setAttribute(ATTR_PAPEL, pessoa.getPapel());
    }
}
