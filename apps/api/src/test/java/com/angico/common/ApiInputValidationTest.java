package com.angico.common;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.angico.acoes.AcaoController;
import com.angico.acoes.AcaoService;
import com.angico.mensagens.MensagemController;
import com.angico.mensagens.MensagemService;
import com.angico.missoes.MissaoController;
import com.angico.missoes.MissaoService;
import com.angico.observacoes.ObservacaoController;
import com.angico.observacoes.ObservacaoService;
import com.angico.pessoas.PessoaController;
import com.angico.pessoas.PessoaService;
import com.angico.potencialidades.PotencialidadeController;
import com.angico.potencialidades.PotencialidadeService;
import com.angico.problemas.ProblemaController;
import com.angico.problemas.ProblemaService;
import com.angico.territorios.TerritorioController;
import com.angico.territorios.TerritorioService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;

class ApiInputValidationTest {

    private ObservacaoService observacaoService;
    private ProblemaService problemaService;
    private PotencialidadeService potencialidadeService;
    private MissaoService missaoService;
    private AcaoService acaoService;
    private PessoaService pessoaService;
    private TerritorioService territorioService;
    private MensagemService mensagemService;
    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        observacaoService = mock(ObservacaoService.class);
        problemaService = mock(ProblemaService.class);
        potencialidadeService = mock(PotencialidadeService.class);
        missaoService = mock(MissaoService.class);
        acaoService = mock(AcaoService.class);
        pessoaService = mock(PessoaService.class);
        territorioService = mock(TerritorioService.class);
        mensagemService = mock(MensagemService.class);

        LocalValidatorFactoryBean validator = new LocalValidatorFactoryBean();
        validator.afterPropertiesSet();
        mvc = MockMvcBuilders.standaloneSetup(
                        new ObservacaoController(observacaoService),
                        new ProblemaController(problemaService),
                        new PotencialidadeController(potencialidadeService),
                        new MissaoController(missaoService),
                        new AcaoController(acaoService),
                        new PessoaController(pessoaService),
                        new TerritorioController(territorioService),
                        new MensagemController(mensagemService)
                )
                .setControllerAdvice(new ApiExceptionHandler())
                .setValidator(validator)
                .build();
    }

    @Test
    void rejectsObservationWithOversizedIdOrInvalidOccurrenceTime() throws Exception {
        mvc.perform(post("/api/observacoes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"workspaceId":"%s","categoria":"AMBIENTE","titulo":"Nascente"}
                                """.formatted("w".repeat(256))))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/observacoes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"workspaceId":"bairro","categoria":"AMBIENTE","titulo":"Nascente",
                                 "occurredAt":"1999-12-31T23:59:59Z"}
                                """))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/observacoes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"workspaceId":"bairro","categoria":"AMBIENTE","titulo":"Nascente",
                                 "occurredAt":"2100-01-01T00:00:00Z"}
                                """))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(observacaoService);
    }

    @Test
    void rejectsInvalidCoordinatesAcrossGeographicContracts() throws Exception {
        mvc.perform(post("/api/observacoes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"workspaceId":"bairro","categoria":"AMBIENTE","titulo":"Nascente",
                                 "latitude":-23.5}
                                """))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/problemas")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"workspaceId":"bairro","categoria":"AMBIENTE","titulo":"Erosao",
                                 "latitude":-23.5}
                                """))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/potencialidades")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"workspaceId":"bairro","categoria":"CULTURA","titulo":"Horta",
                                 "latitude":-91,"longitude":0}
                                """))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/territorios")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"workspaceId":"bairro","nome":"Microbacia","longitude":-46.5}
                                """))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(observacaoService, problemaService, potencialidadeService, territorioService);
    }

    @Test
    void rejectsProblemWithOversizedReferenceOrIncompleteCoordinates() throws Exception {
        mvc.perform(post("/api/problemas")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"workspaceId":"bairro","categoria":"AMBIENTE","titulo":"Erosao",
                                 "origemObservacaoId":"%s"}
                                """.formatted("1".repeat(256))))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/problemas")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"workspaceId":"bairro","categoria":"AMBIENTE","titulo":"Erosao",
                                 "latitude":-23.5}
                                """))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(problemaService);
    }

    @Test
    void rejectsPotentialWithOversizedReferenceOrInvalidCoordinates() throws Exception {
        mvc.perform(post("/api/potencialidades")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"workspaceId":"bairro","territorioId":"%s","categoria":"CULTURA",
                                 "titulo":"Horta"}
                                """.formatted("1".repeat(256))))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/potencialidades")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"workspaceId":"bairro","categoria":"CULTURA","titulo":"Horta",
                                 "latitude":-91,"longitude":0}
                                """))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(potencialidadeService);
    }

    @Test
    void rejectsMissionWithOversizedTextOrReference() throws Exception {
        mvc.perform(post("/api/missoes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"workspaceId":"bairro","titulo":"%s","responsavelId":"%s"}
                                """.formatted("m".repeat(256), "1".repeat(256))))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(missaoService);
    }

    @Test
    void rejectsActionWithOversizedDescriptionOrReference() throws Exception {
        mvc.perform(post("/api/acoes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"workspaceId":"bairro","titulo":"Mutirao","descricao":"%s",
                                 "missaoId":"%s"}
                                """.formatted("d".repeat(2001), "1".repeat(256))))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(acaoService);
    }

    @Test
    void rejectsPersonWithOversizedNameOrAngicoId() throws Exception {
        mvc.perform(post("/api/pessoas")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"workspaceId":"bairro","nome":"%s","angicoId":"%s"}
                                """.formatted("p".repeat(256), "a".repeat(31))))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(pessoaService);
    }

    @Test
    void rejectsTerritoryWithOversizedNameOrInvalidGeometry() throws Exception {
        mvc.perform(post("/api/territorios")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"workspaceId":"bairro","nome":"%s","latitude":-23.5}
                                """.formatted("t".repeat(256))))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/territorios")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"workspaceId":"bairro","nome":"Microbacia",
                                 "boundingBox":[-24,-23,-47,-46,-45]}
                                """))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(territorioService);
    }

    @Test
    void rejectsConversationWithOversizedTitleOrParticipantCollection() throws Exception {
        String participants = java.util.stream.LongStream.rangeClosed(1, 51)
                .mapToObj(String::valueOf)
                .collect(java.util.stream.Collectors.joining(","));
        mvc.perform(post("/api/mensagens/conversas")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"workspaceId":"bairro","contextEntityType":"TERRITORIO",
                                 "contextEntityId":"1","titulo":"%s","participanteIds":[%s]}
                                """.formatted("c".repeat(241), participants)))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(mensagemService);
    }

    @Test
    void rejectsMessageWithOversizedBodyOrTooManyAttachments() throws Exception {
        mvc.perform(multipart("/api/mensagens/conversas/1/mensagens")
                        .param("corpo", "m".repeat(4001)))
                .andExpect(status().isBadRequest());

        var request = multipart("/api/mensagens/conversas/1/mensagens").param("corpo", "Registro");
        for (int index = 0; index < 9; index++) {
            request.file(new MockMultipartFile(
                    "attachments", "registro-%d.txt".formatted(index), "text/plain", "dado".getBytes()));
        }
        mvc.perform(request).andExpect(status().isBadRequest());

        verifyNoInteractions(mensagemService);
    }

    @Test
    void rejectsMessageWithIncompleteOrOutOfRangeCoordinates() throws Exception {
        mvc.perform(multipart("/api/mensagens/conversas/1/mensagens")
                        .param("corpo", "Registro")
                        .param("latitude", "-23.5"))
                .andExpect(status().isBadRequest());
        mvc.perform(multipart("/api/mensagens/conversas/1/mensagens")
                        .param("corpo", "Registro")
                        .param("latitude", "0")
                        .param("longitude", "181"))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(mensagemService);
    }
}
