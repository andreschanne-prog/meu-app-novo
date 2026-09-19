-- =====================================================
-- MISHH - CORREÇÃO CRÍTICA: criar perfil automaticamente
-- no cadastro e corrigir RLS + perfis órfãos.
--
--  Rode este script no SQL Editor do Supabase UMA VEZ.
--  É idempotente: pode rodar de novo sem quebrar nada.
-- =====================================================

-- =====================================================
-- 1. Garantir que a coluna `email` existe em profiles
--    (alguns bancos legados não têm)
-- =====================================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- =====================================================
-- 2. Recriar função handle_new_user (inclui email + avatar_url)
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    username,
    email,
    full_name,
    country,
    state,
    city,
    avatar_url,
    bio
  )
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'username',
      split_part(NEW.email, '@', 1)
    ),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'country', ''),
    COALESCE(NEW.raw_user_meta_data->>'state', ''),
    COALESCE(NEW.raw_user_meta_data->>'city', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    ''
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- =====================================================
-- 3. Recriar trigger (caso tenha sido dropado antes)
-- =====================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- 4. Garantir RLS habilitado e policies mínimas em profiles
-- =====================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- SELECT público (qualquer um vê qualquer perfil)
DROP POLICY IF EXISTS "profiles public read" ON public.profiles;
CREATE POLICY "profiles public read"
  ON public.profiles
  FOR SELECT
  USING (true);

-- UPDATE apenas do próprio perfil
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "users can update own profile" ON public.profiles;
CREATE POLICY "profiles_update_own"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- INSERT apenas do próprio perfil (id = auth.uid())
DROP POLICY IF EXISTS "profiles_insert_self" ON public.profiles;
DROP POLICY IF EXISTS "users can insert own profile" ON public.profiles;
CREATE POLICY "profiles_insert_self"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- =====================================================
-- 5. Corrigir usuários existentes que estão SEM perfil
--    (caso o trigger tenha falhado para signups antigos)
-- =====================================================
INSERT INTO public.profiles (
  id,
  username,
  email,
  full_name,
  country,
  state,
  city,
  avatar_url,
  bio
)
SELECT
  au.id,
  COALESCE(
    au.raw_user_meta_data->>'username',
    split_part(au.email, '@', 1) || '_' || substr(au.id::text, 1, 6)
  ) AS username,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', '') AS full_name,
  COALESCE(au.raw_user_meta_data->>'country', '') AS country,
  COALESCE(au.raw_user_meta_data->>'state', '') AS state,
  COALESCE(au.raw_user_meta_data->>'city', '') AS city,
  COALESCE(au.raw_user_meta_data->>'avatar_url', '') AS avatar_url,
  '' AS bio
FROM auth.users au
WHERE au.id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 6. Atualizar policies admin (manter consistência)
-- =====================================================
DROP POLICY IF EXISTS "profiles_update_admin" ON public.profiles;
CREATE POLICY "profiles_update_admin"
  ON public.profiles
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =====================================================
-- VERIFICAÇÃO (rode separado se quiser conferir):
--   SELECT COUNT(*) FROM auth.users;
--   SELECT COUNT(*) FROM public.profiles;
--   devem ser iguais (ou profiles >= users).
-- =====================================================