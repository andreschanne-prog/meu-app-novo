-- =====================================================
-- Atualizar hall_of_fame para suportar BRASIL e ESTADO
-- Execute no Supabase SQL Editor
-- =====================================================

-- Adicionar colunas se não existirem
ALTER TABLE public.hall_of_fame ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'BRASIL' CHECK (type IN ('BRASIL', 'ESTADO'));
ALTER TABLE public.hall_of_fame ADD COLUMN IF NOT EXISTS state_code TEXT;

-- Criar índice para busca por tipo
CREATE INDEX IF NOT EXISTS idx_hall_of_fame_type ON public.hall_of_fame(type);
CREATE INDEX IF NOT EXISTS idx_hall_of_fame_state ON public.hall_of_fame(state_code);

-- =====================================================
-- Pronto! Agora o Admin Icons pode criar ICONs
-- do Brasil ou por Estado.
-- =====================================================