-- Migration: Insert 'Ministro Ordenado' position using the newly committed enum value.
-- This migration depends on 20260415000001_add_ministro_ordenado_enum.sql being applied first.

INSERT INTO positions (name, type, quorum_weight)
VALUES ('Ministro Ordenado', 'ministro_ordenado', 1)
ON CONFLICT DO NOTHING;
