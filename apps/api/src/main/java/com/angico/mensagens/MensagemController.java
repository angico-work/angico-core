package com.angico.mensagens;

import jakarta.validation.Valid;
import java.util.List;

import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/mensagens")
public class MensagemController {

    private final MensagemService mensagemService;

    public MensagemController(MensagemService mensagemService) {
        this.mensagemService = mensagemService;
    }

    @GetMapping("/conversas")
    public List<ConversaResponse> listConversas(@RequestParam(required = false) String workspaceId) {
        return mensagemService.list(workspaceId);
    }

    @PostMapping("/conversas")
    public ConversaResponse createConversa(@Valid @RequestBody ConversaRequest request) {
        return mensagemService.create(request);
    }

    @GetMapping("/conversas/{id}")
    public ConversaResponse getConversa(@PathVariable Long id) {
        return mensagemService.get(id);
    }

    @GetMapping("/conversas/{id}/mensagens")
    public List<MensagemResponse> mensagens(@PathVariable Long id) {
        return mensagemService.messages(id);
    }

    @PostMapping(value = "/conversas/{id}/mensagens", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public MensagemResponse send(
            @PathVariable Long id,
            @Valid @ModelAttribute MensagemRequest request,
            @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey
    ) {
        return mensagemService.send(
                id,
                request.corpo(),
                request.latitude(),
                request.longitude(),
                request.localDescricao(),
                request.linkedEntityType(),
                request.linkedEntityId(),
                request.clientMessageId(),
                request.deviceId(),
                request.occurredAt(),
                idempotencyKey,
                request.attachments()
        );
    }

    @PostMapping("/conversas/{id}/leitura")
    public ResponseEntity<Void> markRead(@PathVariable Long id) {
        mensagemService.markRead(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/busca")
    public List<MensagemBuscaResponse> search(
            @RequestParam(required = false) String workspaceId,
            @RequestParam String q
    ) {
        return mensagemService.search(workspaceId, q);
    }

    @GetMapping("/recentes")
    public List<MensagemResponse> recentes(@RequestParam(required = false) String workspaceId) {
        return mensagemService.recent(workspaceId);
    }

    @GetMapping("/anexos/{id}")
    public ResponseEntity<Resource> download(@PathVariable Long id) {
        MensagemAnexo anexo = mensagemService.requireAttachment(id);
        Resource resource = mensagemService.attachmentResource(anexo);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(anexo.getContentType()))
                .header(
                        HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment()
                                .filename(anexo.getOriginalFilename())
                                .build()
                                .toString()
                )
                .body(resource);
    }
}
