-- Add the new position_type enum value for "Ministro Certificado Pastor".
-- Must be committed in its own migration/transaction before it can be used
-- in INSERT/UPDATE statements (Postgres restriction on new enum values).
ALTER TYPE position_type ADD VALUE IF NOT EXISTS 'ministro_certificado_pastor';
