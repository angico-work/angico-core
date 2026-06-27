package com.angico.common;

import java.util.Optional;
import org.springframework.stereotype.Component;

@Component
public class CurrentActorProvider {

    public Optional<String> currentActor() {
        return Optional.empty();
    }
}
