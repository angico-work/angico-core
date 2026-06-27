package com.angico.auth;

import java.security.MessageDigest;
import java.security.SecureRandom;
import java.security.spec.KeySpec;
import java.util.Base64;

import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;

import org.springframework.stereotype.Component;

@Component
public class PasswordHasher {

    private static final int ITERATIONS = 120_000;
    private static final int KEY_LENGTH = 256;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    public String hash(String password) {
        byte[] salt = new byte[16];
        SECURE_RANDOM.nextBytes(salt);
        byte[] hash = pbkdf2(password, salt, ITERATIONS);
        return "pbkdf2$" + ITERATIONS + "$" + encode(salt) + "$" + encode(hash);
    }

    public boolean matches(String password, String storedHash) {
        if (password == null || storedHash == null || storedHash.isBlank()) {
            return false;
        }
        String[] parts = storedHash.split("\\$");
        if (parts.length != 4 || !"pbkdf2".equals(parts[0])) {
            return false;
        }
        int iterations = Integer.parseInt(parts[1]);
        byte[] salt = decode(parts[2]);
        byte[] expected = decode(parts[3]);
        byte[] actual = pbkdf2(password, salt, iterations);
        return MessageDigest.isEqual(expected, actual);
    }

    private byte[] pbkdf2(String password, byte[] salt, int iterations) {
        try {
            KeySpec spec = new PBEKeySpec(password.toCharArray(), salt, iterations, KEY_LENGTH);
            return SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).getEncoded();
        } catch (Exception ex) {
            throw new IllegalStateException("Falha ao proteger senha.", ex);
        }
    }

    private String encode(byte[] value) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(value);
    }

    private byte[] decode(String value) {
        return Base64.getUrlDecoder().decode(value);
    }
}
