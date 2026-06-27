package com.angico.problemas;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/problemas")
public class ProblemaController {

    private final ProblemaService problemaService;

    public ProblemaController(ProblemaService problemaService) {
        this.problemaService = problemaService;
    }

    @GetMapping
    public List<ProblemaResponse> list(@RequestParam(required = false) String workspaceId) {
        return problemaService.list(workspaceId);
    }

    @PostMapping
    public ProblemaResponse create(@RequestBody ProblemaRequest request) {
        return problemaService.create(request);
    }

    @GetMapping("/{id}")
    public ProblemaResponse get(@PathVariable Long id) {
        return problemaService.get(id);
    }

    @PatchMapping("/{id}/priorizar")
    public ProblemaResponse priorizar(@PathVariable Long id, @RequestBody ProblemaRequest request) {
        return problemaService.priorizar(id, request);
    }
}
