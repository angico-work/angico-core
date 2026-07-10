-- Fail closed on legacy duplicates. These expressions match the normalizers
-- used by AuthService and AngicoIdNormalizer; no row is deleted or rewritten.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_auth_session_pessoa'
          AND conrelid = 'auth_session'::regclass
    ) THEN
        ALTER TABLE auth_session
            ADD CONSTRAINT fk_auth_session_pessoa
            FOREIGN KEY (pessoa_id) REFERENCES pessoa (id);
    END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS uk_pessoa_email_normalized
    ON pessoa (lower(btrim(email)))
    WHERE email IS NOT NULL AND btrim(email) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS uk_pessoa_angico_id_normalized
    ON pessoa (lower(regexp_replace(btrim(angico_id), '^@', '')))
    WHERE angico_id IS NOT NULL AND btrim(angico_id) <> '';
