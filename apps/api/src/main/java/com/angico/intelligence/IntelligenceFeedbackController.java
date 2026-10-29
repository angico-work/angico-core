package com.angico.intelligence;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/api/intelligence/analyses")
public class IntelligenceFeedbackController {
    private final IntelligenceFeedbackService service;
    public IntelligenceFeedbackController(IntelligenceFeedbackService service) { this.service=service; }
    @PostMapping("/{id}/feedback")
    public IntelligenceFeedbackService.Receipt review(@PathVariable String id,@Valid @RequestBody IntelligenceFeedbackService.Feedback input) { return service.review(id,input); }
}
