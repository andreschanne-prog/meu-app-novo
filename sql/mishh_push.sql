-- Execute este arquivo inteiro no Supabase SQL Editor.
-- Ele guarda um token FCM por dispositivo/usuário.

CREATE TABLE IF NOT EXISTS public.push_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON public.push_tokens(user_id);

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_tokens TO authenticated;

DROP POLICY IF EXISTS "push_tokens_read_own" ON public.push_tokens;
CREATE POLICY "push_tokens_read_own" ON public.push_tokens FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "push_tokens_insert_own" ON public.push_tokens;
CREATE POLICY "push_tokens_insert_own" ON public.push_tokens FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "push_tokens_update_own" ON public.push_tokens;
CREATE POLICY "push_tokens_update_own" ON public.push_tokens FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "push_tokens_delete_own" ON public.push_tokens;
CREATE POLICY "push_tokens_delete_own" ON public.push_tokens FOR DELETE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.set_push_tokens_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_push_tokens_updated_at ON public.push_tokens;
CREATE TRIGGER trg_push_tokens_updated_at
  BEFORE UPDATE ON public.push_tokens
  FOR EACH ROW EXECUTE FUNCTION public.set_push_tokens_updated_at();