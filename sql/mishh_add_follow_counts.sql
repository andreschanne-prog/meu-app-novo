-- =====================================================
-- MISHH - RPC para contadores de seguidores/seguindo/posts
-- Aplica regra de privacidade:
--   * Se o perfil alvo for privado (is_private = true)
--     e o viewer NÃO for o próprio dono e NÃO estiver seguindo,
--     os contadores e o numero de posts voltam como NULL
--     (front mostra "—").
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_follow_counts(
  p_target_id UUID,
  p_viewer_id UUID DEFAULT auth.uid()
)
RETURNS TABLE (
  followers_count BIGINT,
  following_count BIGINT,
  posts_count    BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_is_private  BOOLEAN;
  v_can_see     BOOLEAN;
BEGIN
  -- perfil precisa existir
  SELECT is_private INTO v_is_private
  FROM profiles
  WHERE id = p_target_id;

  IF v_is_private IS NULL THEN
    -- perfil não existe / suspenso
    RETURN QUERY SELECT NULL::BIGINT, NULL::BIGINT, NULL::BIGINT;
    RETURN;
  END IF;

  -- pode ver tudo se:
  --   * for o próprio dono, ou
  --   * a conta for pública, ou
  --   * a conta for privada mas o viewer já está seguindo
  v_can_see :=
    p_viewer_id = p_target_id
    OR v_is_private = false
    OR EXISTS (
      SELECT 1
      FROM follows f
      WHERE f.follower_id = p_viewer_id
        AND f.following_id = p_target_id
    );

  IF NOT v_can_see THEN
    RETURN QUERY SELECT NULL::BIGINT, NULL::BIGINT, NULL::BIGINT;
    RETURN;
  END IF;

  RETURN QUERY
    SELECT
      (SELECT COUNT(*) FROM follows WHERE following_id = p_target_id)::BIGINT,
      (SELECT COUNT(*) FROM follows WHERE follower_id = p_target_id)::BIGINT,
      (SELECT COUNT(*) FROM posts    WHERE user_id    = p_target_id
        AND (SELECT is_suspended FROM profiles WHERE id = p_target_id) = false)::BIGINT;
END;
$$;

-- Garantir que usuários autenticados possam chamar a RPC
GRANT EXECUTE ON FUNCTION public.get_follow_counts(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_follow_counts(UUID, UUID) TO anon;