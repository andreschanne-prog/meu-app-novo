-- =====================================================
-- MISHH - Fix COMPLETO para comentários
-- Erro reportado: "não estou conseguindo fazer comentários no feed"
-- Erro anterior ao rodar este script: "relation 'comments' does not exist"
--
-- Este arquivo é AUTOCONTIDO — pode ser rodado sozinho,
-- mesmo que mishh_policies.sql ainda não tenha sido executado.
-- Ele cria a tabela `comments` (se faltar), índices, policies,
-- GRANTs, trigger e a RPC `add_comment`.
-- =====================================================

-- =====================================================
-- 1. Garantir que `profiles` existe (FK alvo)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY
);

-- =====================================================
-- 2. Garantir que `posts` existe (FK alvo)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- =====================================================
-- 3. Criar a tabela `comments` (caso não exista)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  text TEXT NOT NULL CHECK (length(text) BETWEEN 1 AND 500),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comments_post     ON public.comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user     ON public.comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_created  ON public.comments(post_id, created_at DESC);

-- =====================================================
-- 4. RLS + Policies
-- =====================================================
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "comments_read"        ON public.comments;
DROP POLICY IF EXISTS "comments_insert_auth"  ON public.comments;
DROP POLICY IF EXISTS "comments_delete_own"   ON public.comments;

CREATE POLICY "comments_read"        ON public.comments FOR SELECT USING (true);
CREATE POLICY "comments_insert_auth" ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "comments_delete_own"  ON public.comments FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- 5. Garantir `notifications` existe (usada pelo trigger)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_id UUID,
  type TEXT,
  post_id UUID,
  comment_id UUID,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Remove versão antiga da RPC (caso exista) para evitar conflito de assinatura
DROP FUNCTION IF EXISTS public.add_comment(UUID, TEXT);

CREATE OR REPLACE FUNCTION public.add_comment(
  p_post_id UUID,
  p_text    TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id  UUID;
  v_text     TEXT;
  v_comment  public.comments%ROWTYPE;
  v_profile  public.profiles%ROWTYPE;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('error', 'not_authenticated');
  END IF;

  -- trim + valida tamanho (mesma regra do CHECK da tabela)
  v_text := btrim(p_text);
  IF v_text IS NULL OR length(v_text) < 1 THEN
    RETURN json_build_object('error', 'empty_comment');
  END IF;
  IF length(v_text) > 500 THEN
    RETURN json_build_object('error', 'comment_too_long');
  END IF;

  -- garante que o post existe
  IF NOT EXISTS (SELECT 1 FROM public.posts WHERE id = p_post_id) THEN
    RETURN json_build_object('error', 'post_not_found');
  END IF;

  -- INSERT (SECURITY DEFINER bypassa RLS)
  INSERT INTO public.comments (post_id, user_id, text)
  VALUES (p_post_id, v_user_id, v_text)
  RETURNING * INTO v_comment;

  -- busca perfil do autor para devolver pronto pro front
  SELECT * INTO v_profile FROM public.profiles WHERE id = v_user_id;

  RETURN json_build_object(
    'comment', json_build_object(
      'id',         v_comment.id,
      'post_id',    v_comment.post_id,
      'user_id',    v_comment.user_id,
      'text',       v_comment.text,
      'created_at', v_comment.created_at
    ),
    'profile', CASE WHEN v_profile.id IS NULL THEN NULL ELSE json_build_object(
      'id',         v_profile.id,
      'username',   COALESCE(v_profile.username, ''),
      'full_name',  COALESCE(v_profile.full_name, ''),
      'avatar_url', v_profile.avatar_url,
      'verificado', COALESCE(v_profile.verificado, false)
    ) END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_comment(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_comment(UUID, TEXT) TO anon;

-- =====================================================
-- Garantir que authenticated tem GRANT na tabela comments
-- (caso tenha sido revocado em algum momento)
-- =====================================================
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comments TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =====================================================
-- Caso o problema seja o trigger notify_comment tentando
-- inserir em `notifications` (que tem policy de INSERT
-- bloqueada), tornamos a função explicitamente SECURITY
-- DEFINER (já era, mas reforçando) e adicionamos guard de
-- erro para que um problema na notificação não reverta
-- o comentário do usuário.
-- =====================================================
CREATE OR REPLACE FUNCTION public.notify_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_post_owner UUID;
BEGIN
  SELECT user_id INTO v_post_owner FROM public.posts WHERE id = NEW.post_id;
  IF v_post_owner IS NULL OR v_post_owner = NEW.user_id THEN
    RETURN NEW; -- pular auto-comentário ou post inexistente
  END IF;

  BEGIN
    INSERT INTO public.notifications (user_id, actor_id, type, post_id, comment_id)
    VALUES (v_post_owner, NEW.user_id, 'comment', NEW.post_id, NEW.id);
  EXCEPTION WHEN OTHERS THEN
    -- notificação falhou, mas o comentário do usuário não pode ser perdido
    RAISE WARNING 'notify_comment: falha ao criar notificação: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_comment ON public.comments;
CREATE TRIGGER trg_notify_comment
  AFTER INSERT ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_comment();