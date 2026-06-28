package com.angico.common;

import java.io.IOException;

import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;

/**
 * Baseline security headers on API responses. The CSP only governs what the
 * API host itself may load; the separately-served web client is unaffected.
 * connect-src already allows the geocoding providers used by the geocoding
 * module ported from the dev branch.
 */
@Component
public class SecurityHeadersFilter implements Filter {

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        if (response instanceof HttpServletResponse httpResponse) {
            httpResponse.setHeader("X-Content-Type-Options", "nosniff");
            httpResponse.setHeader("X-Frame-Options", "DENY");
            httpResponse.setHeader("Referrer-Policy", "no-referrer");
            httpResponse.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(self)");
            httpResponse.setHeader(
                    "Content-Security-Policy",
                    "default-src 'self'; "
                            + "connect-src 'self' https://nominatim.openstreetmap.org https://photon.komoot.io; "
                            + "img-src 'self' data: blob: https://*.tile.openstreetmap.org; "
                            + "style-src 'self' 'unsafe-inline'; script-src 'self'; frame-ancestors 'none'"
            );
            if (request instanceof HttpServletRequest httpRequest
                    && httpRequest.getRequestURI().startsWith("/api/auth")) {
                httpResponse.setHeader("Cache-Control", "no-store");
            }
        }
        chain.doFilter(request, response);
    }
}
