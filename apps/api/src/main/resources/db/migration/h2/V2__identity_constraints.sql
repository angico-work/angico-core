ALTER TABLE auth_session
    ADD CONSTRAINT IF NOT EXISTS fk_auth_session_pessoa
    FOREIGN KEY (pessoa_id) REFERENCES pessoa (id);

ALTER TABLE pessoa ADD COLUMN IF NOT EXISTS email_normalized VARCHAR(255)
    GENERATED ALWAYS AS (
        CASE
            WHEN email IS NULL OR TRIM(email) = '' THEN NULL
            ELSE LOWER(TRIM(email))
        END
    );

ALTER TABLE pessoa ADD COLUMN IF NOT EXISTS angico_id_normalized VARCHAR(255)
    GENERATED ALWAYS AS (
        CASE
            WHEN angico_id IS NULL OR TRIM(angico_id) = '' THEN NULL
            ELSE LOWER(REGEXP_REPLACE(TRIM(angico_id), '^@', ''))
        END
    );

CREATE UNIQUE INDEX IF NOT EXISTS uk_pessoa_email_normalized
    ON pessoa (email_normalized);
CREATE UNIQUE INDEX IF NOT EXISTS uk_pessoa_angico_id_normalized
    ON pessoa (angico_id_normalized);
