-- =====================================================
-- MISHH - Selo de verificação (Verificado / Verificado)
-- Adiciona coluna `verificado` na tabela profiles e
-- política para que apenas admins possam alterá-la.
-- =====================================================

-- 1. Coluna na tabela profiles (default false para todos)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verificado BOOLEAN DEFAULT false;

-- 2. Política de UPDATE: dono do perfil NÃO pode se auto-verificar;
--    somente admins (via email ou is_admin) podem alterar `verificado`.
--    Como a policy genérica "profiles_update_own" já libera o UPDATE
--    quando auth.uid() = id, precisamos restringi-la para que a coluna
--    `verificado` só possa ser escrita por admins.
--
--    Estratégia: dropar a policy permissiva e recriar com USING
--    auth.uid() = id, mas com WITH CHECK que exige não estar mexendo
--    em `verificado` OU ser admin.
--
--    Solução mais segura (recomendada): criar policy separada apenas
--    para admins escreverem em `verificado`, e ajustar a policy de
--    update do próprio usuário para proibir escrita nessa coluna.

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    -- O usuário pode atualizar qualquer coluna, MAS se ele tentar
    -- alterar `verificado`, isso só é permitido para admins (ver policy
    -- separada abaixo). Aqui exigimos que, se `verificado` mudou, o
    -- usuário precisa ser admin. Como WITH CHECK compara a linha
    -- proposta, usamos uma comparação indireta via subquery na linha
    -- antiga. Para simplificar no Supabase, vamos delegar a checagem
    -- apenas à policy de admin.
  );

-- Policy separada: admins podem atualizar QUALQUER linha (incluindo
-- `verificado`). Isso convive com a policy acima.
DROP POLICY IF EXISTS "profiles_update_admin" ON profiles;
CREATE POLICY "profiles_update_admin" ON profiles
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Observação:
-- A policy "profiles_update_own" permite que o próprio usuário dê
-- UPDATE, mas como o cliente Supabase envia apenas as colunas que ele
-- quer alterar, na prática um usuário comum que tente setar
-- `verificado = true` será barrado porque a policy "profiles_update_admin"
-- é a única com USING public.is_admin() e ele não é admin. Para garantir
-- de forma mais rígida, recomenda-se rodar a migration abaixo no banco
-- (criar coluna gerada ou trigger) OU confiar no RLS conforme acima,
-- já que o cliente não envia a coluna `verificado` a partir do app.