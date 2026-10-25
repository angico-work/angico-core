package com.angico.common.upload;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.time.Duration;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;

/** Stores private files. Callers must authorize the owning domain object before reading. */
@Service
public class UploadStorage {
    private final boolean remote;
    private final Path root;
    private final URI origin;
    private final String secret;
    private final String bucket;
    private final HttpClient client;

    @Autowired
    public UploadStorage(
            @Value("${angico.uploads.storage:local}") String provider,
            @Value("${angico.uploads.dir:uploads}") String directory,
            @Value("${angico.uploads.supabase-url:}") String url,
            @Value("${angico.uploads.supabase-secret-key:}") String secret,
            @Value("${angico.uploads.bucket:angico-private}") String bucket
    ) {
        this(provider, directory, url, secret, bucket, HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .followRedirects(HttpClient.Redirect.NEVER).build());
    }

    UploadStorage(String provider, String directory, String url, String secret, String bucket, HttpClient client) {
        if (!"local".equals(provider) && !"supabase".equals(provider)) {
            throw new IllegalArgumentException("ANGICO_UPLOAD_STORAGE deve ser local ou supabase.");
        }
        this.remote = "supabase".equals(provider);
        this.root = Path.of(directory).toAbsolutePath().normalize();
        this.bucket = bucket;
        this.secret = secret;
        this.client = client;
        this.origin = remote ? validateOrigin(url) : null;
        if (remote && (secret == null || !secret.startsWith("sb_secret_")
                || bucket == null || !bucket.matches("[a-zA-Z0-9_-]+"))) {
            throw new IllegalArgumentException("Configure a chave secreta e o bucket privado do Supabase.");
        }
    }

    public String store(String namespace, String extension, byte[] bytes, String contentType) {
        validateKey(namespace);
        if (!extension.matches("[a-zA-Z0-9]+")) {
            throw new IllegalArgumentException("Extensão de arquivo inválida.");
        }
        String key = namespace + "/" + UUID.randomUUID() + "." + extension;
        if (remote) {
            send(request("/object/" + bucket + "/" + key)
                    .header("Content-Type", contentType).header("x-upsert", "false")
                    .POST(HttpRequest.BodyPublishers.ofByteArray(bytes)).build());
            return "supabase://" + bucket + "/" + key;
        }
        try {
            Files.createDirectories(root);
            Path realRoot = root.toRealPath();
            Path realFolder = realRoot;
            for (String segment : namespace.split("/")) {
                Path folder = realFolder.resolve(segment);
                if (!Files.exists(folder, LinkOption.NOFOLLOW_LINKS)) {
                    try { Files.createDirectory(folder); }
                    catch (java.nio.file.FileAlreadyExistsException ignored) { }
                }
                realFolder = folder.toRealPath();
                if (!realFolder.startsWith(realRoot)) {
                    throw new IllegalArgumentException("Caminho de armazenamento inválido.");
                }
            }
            Path target = realFolder.resolve(Path.of(key).getFileName());
            Files.write(target, bytes, StandardOpenOption.CREATE_NEW, StandardOpenOption.WRITE);
            return target.toString();
        } catch (IOException exception) {
            throw new IllegalStateException("Não foi possível armazenar o arquivo.", exception);
        }
    }

    public Resource resource(String locator) {
        if (remote) {
            String key = remoteKey(locator);
            byte[] bytes = send(request("/object/authenticated/" + bucket + "/" + key).GET().build());
            return new ByteArrayResource(bytes);
        }
        return new FileSystemResource(localFile(locator));
    }

    public void delete(String locator) {
        if (remote) {
            String key = remoteKey(locator);
            send(request("/object/" + bucket).header("Content-Type", "application/json")
                    .method("DELETE", HttpRequest.BodyPublishers.ofString("{\"prefixes\":[\"" + key + "\"]}"))
                    .build());
            return;
        }
        try {
            // A repeated rollback cleanup is harmless, but an existing locator must remain contained.
            Path path = Path.of(locator);
            if (!path.isAbsolute() || (!path.normalize().startsWith(root)
                    && !path.normalize().startsWith(root.toRealPath()))) {
                throw new IllegalArgumentException("Caminho de armazenamento inválido.");
            }
            if (Files.exists(path, LinkOption.NOFOLLOW_LINKS)) Files.delete(localFile(locator));
        } catch (IOException exception) {
            throw new IllegalStateException("Não foi possível remover o arquivo.", exception);
        }
    }

    private Path localFile(String locator) {
        try {
            Path path = Path.of(locator);
            Path realRoot = root.toRealPath();
            Path realPath = path.toRealPath();
            if (!path.isAbsolute() || !realPath.startsWith(realRoot) || Files.isSymbolicLink(path)
                    || !Files.isRegularFile(path, LinkOption.NOFOLLOW_LINKS)) {
                throw new IllegalArgumentException("Arquivo não encontrado.");
            }
            return realPath;
        } catch (IOException exception) {
            throw new IllegalArgumentException("Arquivo não encontrado.");
        }
    }

    private String remoteKey(String locator) {
        String prefix = "supabase://" + bucket + "/";
        if (locator == null || !locator.startsWith(prefix)) {
            throw new IllegalArgumentException("Localizador de arquivo inválido.");
        }
        String key = locator.substring(prefix.length());
        validateKey(key);
        return key;
    }

    private static void validateKey(String key) {
        if (key == null || key.isBlank() || !key.matches("[a-zA-Z0-9_./-]+")) {
            throw new IllegalArgumentException("Caminho de armazenamento inválido.");
        }
        for (String segment : key.split("/", -1)) {
            if (segment.isBlank() || segment.equals(".") || segment.equals("..")) {
                throw new IllegalArgumentException("Caminho de armazenamento inválido.");
            }
        }
    }

    private static URI validateOrigin(String url) {
        URI uri;
        try { uri = URI.create(url); }
        catch (RuntimeException exception) { throw new IllegalArgumentException("SUPABASE_URL inválida."); }
        if (!"https".equals(uri.getScheme()) || uri.getHost() == null || uri.getUserInfo() != null
                || uri.getQuery() != null || uri.getFragment() != null
                || !(uri.getPath().isEmpty() || uri.getPath().equals("/"))) {
            throw new IllegalArgumentException("SUPABASE_URL deve ser uma origem HTTPS.");
        }
        return uri;
    }

    private HttpRequest.Builder request(String path) {
        return HttpRequest.newBuilder(origin.resolve("/storage/v1" + path))
                .timeout(Duration.ofSeconds(30)).header("apikey", secret)
                .header("User-Agent", "Angico-API/0.1");
    }

    private byte[] send(HttpRequest request) {
        try {
            HttpResponse<byte[]> response = client.send(request, HttpResponse.BodyHandlers.ofByteArray());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                // Never include provider response bodies, request headers, or keys in errors.
                throw new IllegalStateException("Armazenamento indisponível (HTTP " + response.statusCode() + ").");
            }
            return response.body();
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Operação de armazenamento interrompida.");
        } catch (IOException exception) {
            throw new IllegalStateException("Não foi possível acessar o armazenamento.");
        }
    }
}
