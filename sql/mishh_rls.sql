-- =====================================================
-- MISHH - RPCs Seguras
-- =====================================================

-- 1. TOGGLE LIKE (anti-hack)
CREATE OR REPLACE FUNCTION toggle_like(p_post_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_liked BOOLEAN;
  v_count INT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('error', 'not_authenticated');
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM likes WHERE post_id = p_post_id AND user_id = v_user_id
  ) INTO v_liked;

  IF v_liked THEN
    DELETE FROM likes WHERE post_id = p_post_id AND user_id = v_user_id;
  ELSE
    INSERT INTO likes (post_id, user_id) VALUES (p_post_id, v_user_id);
  END IF;

  SELECT COUNT(*) INTO v_count FROM likes WHERE post_id = p_post_id;

  RETURN json_build_object('liked', NOT v_liked, 'count', v_count);
END;
$$;

-- 2. TOTAL DE LIKES DE UM USUÁRIO
CREATE OR REPLACE FUNCTION get_total_likes_for_user(p_user_id UUID)
RETURNS BIGINT
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COALESCE(COUNT(l.id), 0)::BIGINT
  FROM likes l
  JOIN posts p ON p.id = l.post_id
  WHERE p.user_id = p_user_id;
$$;

-- 3. RANKING por curtidas com filtro geográfico
CREATE OR REPLACE FUNCTION get_ranking(p_country TEXT DEFAULT NULL, p_state TEXT DEFAULT NULL, p_city TEXT DEFAULT NULL)
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  full_name TEXT,
  avatar_url TEXT,
  country TEXT,
  state TEXT,
  city TEXT,
  total_likes BIGINT,
  verificado BOOLEAN,
  online BOOLEAN,
  last_seen TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    pr.id AS user_id,
    pr.username,
    pr.full_name,
    pr.avatar_url,
    pr.country,
    pr.state,
    pr.city,
    COALESCE(COUNT(l.id), 0)::BIGINT AS total_likes,
    COALESCE(pr.verificado, false) AS verificado,
    COALESCE(pr.online, false) AS online,
    pr.last_seen
  FROM profiles pr
  LEFT JOIN posts p ON p.user_id = pr.id
  LEFT JOIN likes l ON l.post_id = p.id
  WHERE pr.is_suspended = false
    AND (p_country IS NULL OR pr.country = p_country)
    AND (p_state IS NULL OR pr.state = p_state)
    AND (p_city IS NULL OR pr.city = p_city)
  GROUP BY pr.id
  ORDER BY total_likes DESC
  LIMIT 100;
$$;

-- =====================================================
-- RLS - habilitar em todas
-- =====================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE terms_acceptance ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;