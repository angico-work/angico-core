package com.angico.common;

import java.util.Optional;
import com.angico.auth.AuthInterceptor;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

/**
 * Exposes the authenticated actor that {@link AuthInterceptor} attached to the
 * current request. Returns empty when there is no authenticated session, so
 * unauthenticated/public requests keep working under the soft-auth default.
 */
@Component
public class CurrentActorProvider {

    public Optional<String> currentActor() {
        return currentPessoaId().map(String::valueOf);
    }

    public Optional<Long> currentPessoaId() {
        return requestAttribute(AuthInterceptor.ATTR_PESSOA_ID, Long.class);
    }

    public Optional<String> currentWorkspaceId() {
        return requestAttribute(AuthInterceptor.ATTR_WORKSPACE_ID, String.class);
    }

    public Optional<String> currentActorName() {
        return requestAttribute(AuthInterceptor.ATTR_NOME, String.class);
    }

    public Optional<String> currentPapel() {
        return requestAttribute(AuthInterceptor.ATTR_PAPEL, String.class);
    }

    private <T> Optional<T> requestAttribute(String name, Class<T> type) {
        if (!(RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attributes)) {
            return Optional.empty();
        }
        Object value = attributes.getRequest().getAttribute(name);
        if (!type.isInstance(value)) {
            return Optional.empty();
        }
        return Optional.of(type.cast(value));
    }
}
