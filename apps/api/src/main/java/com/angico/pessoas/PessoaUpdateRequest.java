package com.angico.pessoas;

/**
 * Profile edit payload for the current pessoa. All fields optional: a null field
 * is left unchanged; a blank telefone/foto clears it. foto is a data URL (the
 * web app resizes the image client-side before sending).
 */
public record PessoaUpdateRequest(
        String nome,
        String telefone,
        String foto
) {
}
