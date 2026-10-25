package com.angico.common.upload;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class UploadStorageTest {
    @TempDir Path root;
    private final byte[] payload = "evidence".getBytes(StandardCharsets.UTF_8);

    @Test
    void localFilesSurviveANewStorageInstanceAndCanBeRemoved() throws Exception {
        var first = local();
        String locator = first.store("workspace/messages", "txt", payload, "text/plain");
        assertArrayEquals(payload, local().resource(locator).getContentAsByteArray());
        local().delete(locator);
        assertFalse(Files.exists(Path.of(locator)));
    }

    @Test
    void rejectsTraversalAndSymlinksOutsideTheUploadRoot() throws Exception {
        var storage = local();
        assertThrows(IllegalArgumentException.class,
                () -> storage.store("../escape", "txt", payload, "text/plain"));
        Path outside = Files.createTempDirectory("angico-outside-");
        try {
            Path secret = Files.write(outside.resolve("private.txt"), payload);
            Files.createSymbolicLink(root.resolve("link"), outside);
            assertThrows(IllegalArgumentException.class,
                    () -> storage.store("link", "txt", payload, "text/plain"));
            assertThrows(IllegalArgumentException.class,
                    () -> storage.resource(root.resolve("link/private.txt").toString()));
            assertThrows(IllegalArgumentException.class,
                    () -> storage.delete(root.resolve("link/private.txt").toString()));
            assertArrayEquals(payload, Files.readAllBytes(secret));
            Files.delete(secret);
        } finally {
            Files.deleteIfExists(outside);
        }
    }

    @Test
    void privateSupabaseObjectsSurviveANewInstanceWithoutUsingLocalDisk() throws Exception {
        HttpClient client = mock(HttpClient.class);
        var uploaded = response(200, new byte[0]);
        var downloaded = response(200, payload);
        var deleted = response(200, new byte[0]);
        when(client.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenReturn(uploaded, downloaded, deleted);
        var storage = remote(client);
        String locator = storage.store("evidencias/aa", "txt", payload, "text/plain");
        assertTrue(locator.startsWith("supabase://angico-private/evidencias/aa/"));
        assertArrayEquals(payload, remote(client).resource(locator).getContentAsByteArray());
        storage.delete(locator);
        var requests = org.mockito.ArgumentCaptor.forClass(HttpRequest.class);
        verify(client, times(3)).send(requests.capture(), any(HttpResponse.BodyHandler.class));
        var calls = requests.getAllValues();
        assertEquals("POST", calls.get(0).method());
        assertEquals("false", calls.get(0).headers().firstValue("x-upsert").orElseThrow());
        assertEquals("sb_secret_test", calls.get(0).headers().firstValue("apikey").orElseThrow());
        assertTrue(calls.get(0).headers().firstValue("Authorization").isEmpty());
        assertTrue(calls.get(1).uri().getPath().startsWith("/storage/v1/object/authenticated/angico-private/"));
        assertEquals("DELETE", calls.get(2).method());
        assertEquals("/storage/v1/object/angico-private", calls.get(2).uri().getPath());
        try (var files = Files.list(root)) { assertEquals(0, files.count()); }
    }

    @Test
    void rejectsForeignBucketsAndMalformedLocatorsBeforeSendingCredentials() {
        HttpClient client = mock(HttpClient.class);
        var storage = remote(client);
        for (String locator : new String[]{"supabase://other/file.txt", "supabase://angico-private/../private.txt",
                "https://other.test/file", "/etc/passwd", "supabase://angico-private/a%2fb"}) {
            assertThrows(IllegalArgumentException.class, () -> storage.resource(locator));
            assertThrows(IllegalArgumentException.class, () -> storage.delete(locator));
        }
        verifyNoInteractions(client);
    }

    @Test
    void rejectsMissingSecretsAndInsecureStorageOrigins() {
        assertThrows(IllegalArgumentException.class,
                () -> new UploadStorage("supabase", root.toString(), "https://project.supabase.co", "", "angico-private"));
        assertThrows(IllegalArgumentException.class,
                () -> new UploadStorage("supabase", root.toString(), "http://project.supabase.co", "sb_secret_test", "angico-private"));
        assertThrows(IllegalArgumentException.class,
                () -> new UploadStorage("unknown", root.toString(), "", "", "angico-private"));
    }

    @Test
    void failedUploadsDoNotReturnSuccessfulLocatorsOrExposeProviderResponse() throws Exception {
        HttpClient client = mock(HttpClient.class);
        var failure = response(500, "sensitive-provider-response".getBytes(StandardCharsets.UTF_8));
        when(client.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenReturn(failure);
        var error = assertThrows(IllegalStateException.class,
                () -> remote(client).store("evidencias", "txt", payload, "text/plain"));
        assertFalse(error.toString().contains("sensitive-provider-response"));
        assertFalse(error.toString().contains("sb_secret_test"));
    }

    private UploadStorage local() {
        return new UploadStorage("local", root.toString(), "", "", "angico-private");
    }

    private UploadStorage remote(HttpClient client) {
        return new UploadStorage("supabase", root.toString(), "https://project.supabase.co",
                "sb_secret_test", "angico-private", client);
    }

    @SuppressWarnings("unchecked")
    private HttpResponse<byte[]> response(int status, byte[] bytes) {
        HttpResponse<byte[]> response = mock(HttpResponse.class);
        when(response.statusCode()).thenReturn(status);
        when(response.body()).thenReturn(bytes);
        return response;
    }
}
