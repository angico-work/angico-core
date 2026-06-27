package com.angico.common;

import java.time.Clock;
import java.time.Instant;
import org.springframework.stereotype.Component;

@Component
public class ClockProvider {

    private final Clock clock = Clock.systemUTC();

    public Instant now() {
        return clock.instant();
    }
}
