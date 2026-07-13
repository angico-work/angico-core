package com.angico.auth;

import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final boolean secureCookie;

    public AuthController(
            AuthService authService,
            @Value("${angico.auth.cookie-secure:true}") boolean secureCookie
    ) {
        this.authService = authService;
        this.secureCookie = secureCookie;
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody LoginRequest request) {
        return issued(authService.login(request));
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@RequestBody RegisterRequest request) {
        return issued(authService.register(request));
    }

    @GetMapping("/angico-id/available")
    public AngicoIdAvailabilityResponse checkAngicoId(@RequestParam String angicoId) {
        return authService.checkAngicoId(angicoId);
    }

    @GetMapping("/me")
    public AuthResponse me(
            @RequestAttribute(AuthInterceptor.ATTR_SESSION_ID) Long sessionId,
            @RequestAttribute(AuthInterceptor.ATTR_CSRF_TOKEN) String csrfToken
    ) {
        return authService.currentSession(sessionId, csrfToken);
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
            @RequestAttribute(AuthInterceptor.ATTR_SESSION_ID) Long sessionId
    ) {
        authService.logout(sessionId);
        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, cookie("", Duration.ZERO).toString())
                .build();
    }

    private ResponseEntity<AuthResponse> issued(AuthService.IssuedSession issued) {
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie(issued.token(), AuthService.SESSION_LIFETIME).toString())
                .body(issued.response());
    }

    private ResponseCookie cookie(String token, Duration maxAge) {
        return ResponseCookie.from(AuthInterceptor.SESSION_COOKIE, token)
                .httpOnly(true)
                .secure(secureCookie)
                .sameSite("Lax")
                .path("/")
                .maxAge(maxAge)
                .build();
    }
}
