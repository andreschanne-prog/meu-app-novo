-- =====================================================
-- SCRIPT DE TESTE: sistema de notificações do MISHH
-- Execute DEPOIS de rodar o schema e policies.
-- NÃO roda em produção. Use em ambiente de dev/homolog.
-- =====================================================

-- PASSO 0: limpar dados de teste anteriores
DELETE FROM public.notifications WHERE actor_id IN (
  SELECT id FROM public.profiles WHERE username IN ('andre_test','teste_test')
) OR user_id IN (
  SELECT id FROM public.profiles WHERE username IN ('andre_test','teste_test')
);
DELETE FROM public.likes WHERE user_id IN (
  SELECT id FROM public.profiles WHERE username IN ('andre_test','teste_test')
);
DELETE FROM public.posts WHERE user_id IN (
  SELECT id FROM public.profiles WHERE username IN ('andre_test','teste_test')
);
DELETE FROM public.follows WHERE follower_id IN (
  SELECT id FROM public.profiles WHERE username IN ('andre_test','teste_test')
);
DELETE FROM public.profiles WHERE username IN ('andre_test','teste_test');

-- PASSO 1: simular 2 contas (auth.users + profiles)
-- ⚠ Em produção, esses inserts são feitos via Supabase Auth.signUp
-- Aqui inserimos direto no banco para fins de teste.
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'andre_test@mishh.com', '', now(), '{"username":"andre_test","full_name":"André Test"}'::jsonb),
  ('22222222-2222-2222-2222-222222222222', 'teste_test@mishh.com', '', now(), '{"username":"teste_test","full_name":"Usuário Teste"}'::jsonb)
ON CONFLICT (email) DO NOTHING;

-- Criar/atualizar perfis (caso o trigger on_auth_user_created já tenha rodado)
INSERT INTO public.profiles (id, username, full_name)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'andre_test', 'André Test'),
  ('22222222-2222-2222-2222-222222222222', 'teste_test', 'Usuário Teste')
ON CONFLICT (id) DO UPDATE SET username = EXCLUDED.username, full_name = EXCLUDED.full_name;

-- PASSO 2: criar um post do @andre_test
INSERT INTO public.posts (id, user_id, image_url, filter, caption)
VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11111111-1111-1111-1111-111111111111',
  'https://exemplo.com/foto.jpg',
  'normal',
  'Foto de teste'
) ON CONFLICT (id) DO NOTHING;

-- PASSO 3: com @teste_test, seguir @andre_test → deve gerar notif type='follow'
INSERT INTO public.follows (follower_id, following_id)
VALUES ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111')
ON CONFLICT DO NOTHING;

-- PASSO 4: com @teste_test, curtir foto do @andre_test → deve gerar notif type='like'
INSERT INTO public.likes (post_id, user_id)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222')
ON CONFLICT DO NOTHING;

-- PASSO 5: com @teste_test, comentar foto do @andre_test → deve gerar notif type='comment'
INSERT INTO public.comments (post_id, user_id, text)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'linda foto!');

-- VERIFICAÇÃO: logado como @andre_test, ver notificações recebidas
SELECT
  n.type,
  n.is_read,
  p_actor.username AS actor_username,
  n.created_at
FROM public.notifications n
LEFT JOIN public.profiles p_actor ON p_actor.id = n.actor_id
WHERE n.user_id = '11111111-1111-1111-1111-111111111111'
ORDER BY n.created_at DESC;

-- VERIFICAÇÃO: contagem de não lidas (que aparece no badge do sininho)
SELECT
  COUNT(*) AS unread_count
FROM public.notifications
WHERE user_id = '11111111-1111-1111-1111-111111111111'
  AND is_read = false;

-- PASSO 6: limpar dados de teste
DELETE FROM public.notifications WHERE user_id IN (
  SELECT id FROM public.profiles WHERE username IN ('andre_test','teste_test')
);
DELETE FROM public.comments WHERE post_id IN (
  SELECT id FROM public.posts WHERE user_id IN (
    SELECT id FROM public.profiles WHERE username IN ('andre_test','teste_test')
  )
);
DELETE FROM public.likes WHERE post_id IN (
  SELECT id FROM public.posts WHERE user_id IN (
    SELECT id FROM public.profiles WHERE username IN ('andre_test','teste_test')
  )
);
DELETE FROM public.follows WHERE follower_id IN (
  SELECT id FROM public.profiles WHERE username IN ('andre_test','teste_test')
);
DELETE FROM public.posts WHERE user_id IN (
  SELECT id FROM public.profiles WHERE username IN ('andre_test','teste_test')
);
DELETE FROM public.profiles WHERE username IN ('andre_test','teste_test');
DELETE FROM auth.users WHERE email IN ('andre_test@mishh.com','teste_test@mishh.com');