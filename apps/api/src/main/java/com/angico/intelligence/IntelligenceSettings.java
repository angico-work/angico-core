package com.angico.intelligence;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public record IntelligenceSettings(
    @Value("${angico.intelligence.enabled:false}") boolean enabled,
    @Value("${angico.intelligence.api-key:}") String apiKey,
    @Value("${angico.intelligence.model:}") String model,
    @Value("${angico.intelligence.workspace-daily-cap:100}") int workspaceDailyCap) {
    public boolean available() { return enabled && !apiKey.isBlank() && !model.isBlank() && workspaceDailyCap > 0; }
    @Override public String toString() { return "IntelligenceSettings[credentials redacted]"; }
}
