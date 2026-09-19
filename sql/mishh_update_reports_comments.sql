-- =====================================================
-- Adicionar coluna reported_comment_id na tabela reports
-- Execute no Supabase SQL Editor
-- =====================================================

ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS reported_comment_id UUID REFERENCES public.comments(id) ON DELETE SET NULL;