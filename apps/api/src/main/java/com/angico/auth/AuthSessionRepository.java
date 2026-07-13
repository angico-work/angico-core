package com.angico.auth;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuthSessionRepository extends JpaRepository<AuthSession, Long> {

    Optional<AuthSession> findByTokenHash(String tokenHash);
}
