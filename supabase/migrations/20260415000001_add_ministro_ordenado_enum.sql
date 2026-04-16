-- Migration: Add 'ministro_ordenado' to position_type enum
-- This MUST be committed in its own transaction BEFORE the value can be used in any INSERT/UPDATE.
-- PostgreSQL rule: new enum values cannot be used in the same transaction they are created in.

ALTER TYPE position_type ADD VALUE IF NOT EXISTS 'ministro_ordenado';
