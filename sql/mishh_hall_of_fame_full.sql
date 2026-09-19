-- =====================================================
-- MISHH HALL DA FAMA - CRIAR TUDO DE UMA VEZ
-- Cole TODO este conteúdo no Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1. Criar tabela principal
-- =====================================================
CREATE TABLE IF NOT EXISTS hall_of_fame (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INT NOT NULL,
  total_likes INT NOT NULL DEFAULT 0,
  winning_post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
  winning_photo_url TEXT,
  caption TEXT,
  thanks TEXT,
  selected_by UUID REFERENCES profiles(id),
  selected_at TIMESTAMPTZ DEFAULT now(),
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(year, month)
);

CREATE INDEX IF NOT EXISTS idx_hall_of_fame_year_month ON hall_of_fame(year DESC, month DESC);
CREATE INDEX IF NOT EXISTS idx_hall_of_fame_user ON hall_of_fame(user_id);
CREATE INDEX IF NOT EXISTS idx_hall_of_fame_published ON hall_of_fame(is_published) WHERE is_published = true;

-- =====================================================
-- 2. RPC: Publicar ICON com legenda e agradecimentos
-- =====================================================
CREATE OR REPLACE FUNCTION publish_icon(
  p_user_id UUID,
  p_year INT,
  p_month INT,
  p_admin_id UUID,
  p_caption TEXT,
  p_thanks TEXT
)
RETURNS UUID AS $$
DECLARE
  v_total_likes INT;
  v_post_id UUID;
  v_photo_url TEXT;
  v_hof_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_admin_id AND is_admin = true) THEN
    RAISE EXCEPTION 'Apenas admins podem publicar ICONS';
  END IF;

  SELECT COUNT(l.id), p.id, p.image_url
  INTO v_total_likes, v_post_id, v_photo_url
  FROM likes l
  JOIN posts p ON p.id = l.post_id
  WHERE p.user_id = p_user_id
    AND EXTRACT(YEAR FROM l.created_at) = p_year
    AND EXTRACT(MONTH FROM l.created_at) = p_month
  GROUP BY p.id, p.image_url
  ORDER BY COUNT(l.id) DESC
  LIMIT 1;

  IF v_total_likes IS NULL THEN v_total_likes := 0; END IF;

  INSERT INTO hall_of_fame (
    user_id, year, month, total_likes,
    winning_post_id, winning_photo_url,
    caption, thanks,
    selected_by, selected_at,
    is_published, published_at
  )
  VALUES (
    p_user_id, p_year, p_month, v_total_likes,
    v_post_id, v_photo_url,
    p_caption, p_thanks,
    p_admin_id, now(),
    true, now()
  )
  ON CONFLICT (year, month) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    total_likes = EXCLUDED.total_likes,
    winning_post_id = EXCLUDED.winning_post_id,
    winning_photo_url = EXCLUDED.winning_photo_url,
    caption = EXCLUDED.caption,
    thanks = EXCLUDED.thanks,
    selected_by = EXCLUDED.selected_by,
    selected_at = EXCLUDED.selected_at,
    is_published = EXCLUDED.is_published,
    published_at = EXCLUDED.published_at
  RETURNING id INTO v_hof_id;

  UPDATE profiles SET hall_of_fame_count = COALESCE(hall_of_fame_count, 0) + 1 WHERE id = p_user_id;
  RETURN v_hof_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 3. RPC: Buscar ICON do mês atual (para tela pública)
-- =====================================================
CREATE OR REPLACE FUNCTION get_current_month_icon()
RETURNS TABLE (
  id UUID, user_id UUID, username TEXT, full_name TEXT, avatar_url TEXT,
  verificado BOOLEAN, month INT, year INT, total_likes INT,
  winning_photo_url TEXT, caption TEXT, thanks TEXT, published_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    h.id, h.user_id, pr.username, pr.full_name, pr.avatar_url,
    COALESCE(pr.verificado, false), h.month, h.year, h.total_likes,
    h.winning_photo_url, h.caption, h.thanks, h.published_at
  FROM hall_of_fame h
  JOIN profiles pr ON pr.id = h.user_id
  WHERE h.is_published = true
    AND h.year = EXTRACT(YEAR FROM now())::INT
    AND h.month = EXTRACT(MONTH FROM now())::INT
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 4. RLS - Segurança
-- =====================================================
ALTER TABLE hall_of_fame ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Vencedores publicados são públicos" ON hall_of_fame;
CREATE POLICY "Vencedores publicados são públicos" ON hall_of_fame FOR SELECT USING (is_published = true);

DROP POLICY IF EXISTS "Apenas admins modificam hall_of_fame" ON hall_of_fame;
CREATE POLICY "Apenas admins modificam hall_of_fame" ON hall_of_fame FOR ALL
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- =====================================================
-- 5. Success message
-- =====================================================
SELECT '✅ Hall da Fama criado com sucesso!' AS status;