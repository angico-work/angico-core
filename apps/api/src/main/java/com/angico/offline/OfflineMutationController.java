package com.angico.offline;

import com.angico.acoes.AcaoCreateRequest;
import com.angico.impacto.IndicadorRequest;
import com.angico.impacto.MedicaoRequest;
import com.angico.impacto.ResultadoRequest;
import com.angico.missoes.MissaoRequest;
import com.angico.potencialidades.PotencialidadeCreateRequest;
import com.angico.problemas.ProblemaRequest;
import com.angico.recursos.RecursoRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/offline/mutations")
public class OfflineMutationController {

    private final OfflineMutationService service;

    public OfflineMutationController(OfflineMutationService service) {
        this.service = service;
    }

    @PostMapping("/problemas")
    @ResponseStatus(HttpStatus.CREATED)
    public OfflineMutationReceipt createProblem(
            @Valid @RequestBody ProblemaRequest request,
            @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey
    ) {
        return service.createProblem(request, idempotencyKey);
    }

    @PostMapping("/potencialidades")
    @ResponseStatus(HttpStatus.CREATED)
    public OfflineMutationReceipt createPotential(
            @Valid @RequestBody PotencialidadeCreateRequest request,
            @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey
    ) {
        return service.createPotential(request, idempotencyKey);
    }

    @PostMapping("/missoes")
    @ResponseStatus(HttpStatus.CREATED)
    public OfflineMutationReceipt createMission(
            @Valid @RequestBody MissaoRequest request,
            @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey
    ) {
        return service.createMission(request, idempotencyKey);
    }

    @PostMapping("/acoes")
    @ResponseStatus(HttpStatus.CREATED)
    public OfflineMutationReceipt createAction(
            @Valid @RequestBody AcaoCreateRequest request,
            @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey
    ) {
        return service.createAction(request, idempotencyKey);
    }

    @PostMapping("/resultados")
    @ResponseStatus(HttpStatus.CREATED)
    public OfflineMutationReceipt createResult(
            @Valid @RequestBody ResultadoRequest request,
            @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey
    ) {
        return service.createResult(request, idempotencyKey);
    }

    @PostMapping("/indicadores")
    @ResponseStatus(HttpStatus.CREATED)
    public OfflineMutationReceipt createIndicator(
            @Valid @RequestBody IndicadorRequest request,
            @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey
    ) {
        return service.createIndicator(request, idempotencyKey);
    }

    @PostMapping("/medicoes")
    @ResponseStatus(HttpStatus.CREATED)
    public OfflineMutationReceipt createMeasurement(
            @Valid @RequestBody MedicaoRequest request,
            @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey
    ) {
        return service.createMeasurement(request, idempotencyKey);
    }

    @PostMapping("/recursos")
    @ResponseStatus(HttpStatus.CREATED)
    public OfflineMutationReceipt createResource(
            @Valid @RequestBody RecursoRequest request,
            @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey
    ) {
        return service.createResource(request, idempotencyKey);
    }

    @PostMapping("/usos-recursos")
    @ResponseStatus(HttpStatus.CREATED)
    public OfflineMutationReceipt createResourceUsage(
            @Valid @RequestBody RecursoUsoMutationRequest request,
            @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey
    ) {
        return service.createResourceUsage(request, idempotencyKey);
    }
}
