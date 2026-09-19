-- =====================================================
-- MISHH - Diagnóstico de comentários
-- Rode no Supabase SQL Editor para identificar o motivo
-- dos comentários estarem falhando.
-- =====================================================

-- 1) Schema da tabela comments (confere se coluna 'text' existe)
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'comments'
ORDER BY ordinal_position;

-- 2) Policies ativas na tabela comments
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'comments'
ORDER BY cmd, policyname;

-- 3) Policies ativas na tabela notifications (a trigger insere nela)
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'notifications'
ORDER BY cmd, policyname;

-- 4) Função do trigger de comentário (dono/owner + se é SECURITY DEFINER)
SELECT
  n.nspname AS schema,
  p.proname AS function_name,
  r.rolname AS owner,
  p.prosecdef AS is_security_definer,
  p.proconfig
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
JOIN pg_roles r ON p.proowner = r.oid
WHERE n.nspname = 'public' AND p.proname = 'notify_comment';

-- 5) Trigger existe?
SELECT trigger_name, event_manipulation, action_timing, action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public' AND event_object_table = 'comments';

-- 6) Grants da tabela comments
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public' AND table_name = 'comments'
ORDER BY grantee, privilege_type;

-- 7) Teste prático: simular um insert COMO o role 'authenticated'
-- (precisa de um JWT válido; ajuste o auth.uid() abaixo para o ID do seu usuário)
-- DESCOMENTE E AJUSTE O ID ABAIXO:
-- SET LOCAL request.jwt.claim.sub = 'SEU-USER-UUID-AQUI';
-- INSERT INTO public.comments (post_id, user_id, text)
-- VALUES (
--   (SELECT id FROM public.posts LIMIT 1),
--   'SEU-USER-UUID-AQUI',
--   'teste diagnóstico'
-- );
-- ROLLBACK;