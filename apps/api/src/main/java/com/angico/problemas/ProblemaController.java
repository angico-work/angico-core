package com.angico.problemas;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/problemas")
public class ProblemaController {

    private final ProblemaService problemaService;

    public ProblemaController(ProblemaService problemaService) {
        this.problemaService = problemaService;
    }
}
