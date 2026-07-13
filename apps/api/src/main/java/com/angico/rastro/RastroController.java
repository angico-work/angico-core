package com.angico.rastro;

import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/rastro")
public class RastroController {

    private final RastroService service;

    public RastroController(RastroService service) {
        this.service = service;
    }

    @GetMapping("/{rootType}/{rootId}")
    public ResponseEntity<RastroResponse> get(
            @PathVariable String rootType,
            @PathVariable String rootId,
            @RequestParam(required = false) String workspaceId,
            @RequestParam(defaultValue = "100") int maxNodes,
            @RequestParam(defaultValue = "200") int maxRelations,
            @RequestParam(defaultValue = "300") int maxEvents
    ) {
        RastroResponse response = service.get(
                workspaceId, rootType, rootId, maxNodes, maxRelations, maxEvents);
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(response);
    }
}
