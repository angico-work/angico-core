package com.angico.common;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import com.angico.auth.AuthService;
import java.lang.reflect.Constructor;
import java.util.Arrays;
import org.junit.jupiter.api.Test;

class DemoLeaderSeederTest {

    private final AuthService authService = mock(AuthService.class);

    @Test
    void disabledSeedDoesNothing() throws Exception {
        seeder(false, "").run();

        verify(authService, never()).ensureLeader(
                anyString(), anyString(), anyString(), anyString(), anyString(), anyString());
    }

    @Test
    void enabledSeedRejectsMissingPassword() throws Exception {
        DemoLeaderSeeder seeder = seeder(true, "");

        assertThrows(IllegalStateException.class, seeder::run);
    }

    @Test
    void enabledSeedUsesConfiguredPassword() throws Exception {
        seeder(true, "configured-secret").run();

        verify(authService).ensureLeader(
                anyString(), anyString(), anyString(), anyString(), anyString(), eq("configured-secret"));
    }

    private DemoLeaderSeeder seeder(boolean enabled, String password) throws Exception {
        Constructor<?> constructor = Arrays.stream(DemoLeaderSeeder.class.getConstructors())
                .filter(candidate -> Arrays.equals(
                        candidate.getParameterTypes(),
                        new Class<?>[]{AuthService.class, boolean.class, String.class}))
                .findFirst()
                .orElseThrow(() -> new AssertionError("DemoLeaderSeeder must receive a configured password"));
        return (DemoLeaderSeeder) constructor.newInstance(authService, enabled, password);
    }
}
