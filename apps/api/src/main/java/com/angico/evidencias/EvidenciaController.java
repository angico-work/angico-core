package com.angico.evidencias;

import java.time.Instant;
import java.util.List;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/evidencias")
public class EvidenciaController {

    private final EvidenciaService evidenciaService;

    public EvidenciaController(EvidenciaService evidenciaService) {
        this.evidenciaService = evidenciaService;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public EvidenciaMetadataResponse create(
            @RequestParam(required = false) String workspaceId,
            @RequestParam String subjectType,
            @RequestParam Long subjectId,
            @RequestParam String title,
            @RequestParam(required = false) String description,
            @RequestParam(required = false) Instant capturedAt,
            @RequestParam(required = false) String deviceId,
            @RequestParam(required = false) String clientMutationId,
            @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey,
            @RequestParam(required = false) MultipartFile file
    ) {
        return evidenciaService.create(
                workspaceId, subjectType, subjectId, title, description,
                capturedAt, deviceId, clientMutationId, idempotencyKey, file);
    }

    @GetMapping
    public List<EvidenciaMetadataResponse> list(
            @RequestParam(required = false) String workspaceId,
            @RequestParam(required = false) String subjectType,
            @RequestParam(required = false) Long subjectId
    ) {
        return evidenciaService.list(workspaceId, subjectType, subjectId);
    }

    @GetMapping("/{id}/arquivo")
    public ResponseEntity<Resource> download(@PathVariable Long id) {
        Evidencia evidence = evidenciaService.requireAuthorized(id);
        Resource resource = evidenciaService.resource(evidence);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(evidence.getContentType()))
                .header(
                        HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment()
                                .filename(evidence.getOriginalFilename())
                                .build()
                                .toString()
                )
                .body(resource);
    }
}
