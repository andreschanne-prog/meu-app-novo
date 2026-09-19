-- =====================================================
-- FIX COMPLETO: Tabela reports + RLS + colunas
-- Execute no Supabase SQL Editor
-- =====================================================

-- 1. Criar funcao is_admin PRIMEIRO
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  );
$$;

-- 2. Criar tabela base se nao existir (sem constraints CHECK ainda)
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Adicionar TODAS as colunas via ALTER TABLE (seguro se ja existirem)
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS reporter_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS reported_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS reported_post_id UUID REFERENCES posts(id) ON DELETE CASCADE;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS reported_comment_id UUID REFERENCES public.comments(id) ON DELETE SET NULL;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS details TEXT DEFAULT '';
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- 4. Remover constraints antigas restritivas
ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_reason_check;
ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_status_check;

-- 5. Recriar constraints com todos os valores validos
ALTER TABLE public.reports ADD CONSTRAINT reports_reason_check
  CHECK (reason IN ('spam','nudez','violencia','fake','assedio','outro'));

ALTER TABLE public.reports ADD CONSTRAINT reports_status_check
  CHECK (status IN ('pending','reviewed','dismissed','action_taken'));

-- 6. Atualizar registros com status NULL para 'pending'
UPDATE public.reports SET status = 'pending' WHERE status IS NULL;

-- 7. Habilitar RLS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- 8. Recriar politicas RLS
DROP POLICY IF EXISTS "reports_insert_own" ON public.reports;
CREATE POLICY "reports_insert_own" ON public.reports
  FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "reports_read_own" ON public.reports;
CREATE POLICY "reports_read_own" ON public.reports
  FOR SELECT
  USING (auth.uid() = reporter_id OR public.is_admin());

DROP POLICY IF EXISTS "reports_update_admin" ON public.reports;
CREATE POLICY "reports_update_admin" ON public.reports
  FOR UPDATE
  USING (public.is_admin());

DROP POLICY IF EXISTS "reports_delete_admin" ON public.reports;
CREATE POLICY "reports_delete_admin" ON public.reports
  FOR DELETE
  USING (public.is_admin());

-- 9. Indices
CREATE INDEX IF NOT EXISTS idx_reports_reporter ON public.reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_reported  ON public.reports(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_reports_post      ON public.reports(reported_post_id);
CREATE INDEX IF NOT EXISTS idx_reports_comment   ON public.reports(reported_comment_id);
CREATE INDEX IF NOT EXISTS idx_reports_status    ON public.reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_created   ON public.reports(created_at DESC);
