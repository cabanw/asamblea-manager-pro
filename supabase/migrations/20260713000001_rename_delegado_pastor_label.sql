-- Rename the display label for the 'delegado_pastor' position from
-- "Delegado Pastor" to "Delegado". Enum value and quorum_weight are unchanged.
UPDATE public.positions SET name = 'Delegado' WHERE type = 'delegado_pastor';
