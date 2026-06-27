package com.angico.mensagens;

import java.util.List;

import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

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
    public ConversaResponse createConversa(@RequestBody ConversaRequest request) {
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
            @RequestParam(required = false) String corpo,
            @RequestParam(required = false) Double latitude,
            @RequestParam(required = false) Double longitude,
            @RequestParam(required = false) String localDescricao,
            @RequestParam(required = false) String linkedEntityType,
            @RequestParam(required = false) String linkedEntityId,
            @RequestParam(required = false) List<MultipartFile> attachments
    ) {
        return mensagemService.send(
                id,
                corpo,
                latitude,
                longitude,
                localDescricao,
                linkedEntityType,
                linkedEntityId,
                attachments
        );
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
