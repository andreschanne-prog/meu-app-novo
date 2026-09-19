-- =====================================================
-- MISHH HALL DA FAMA - Tabela mural + funções admin
-- Rode no Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1. Tabela principal do Hall da Fama
-- =====================================================
CREATE TABLE IF NOT EXISTS hall_of_fame (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  -- Período (cada mês tem apenas 1 vencedor)
  month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INT NOT NULL,
  -- Estatísticas
  total_likes INT NOT NULL DEFAULT 0,
  winning_post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
  winning_photo_url TEXT,
  -- Controle admin
  selected_by UUID REFERENCES profiles(id),
  selected_at TIMESTAMPTZ DEFAULT now(),
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  -- Metadados
  created_at TIMESTAMPTZ DEFAULT now(),
  -- 1 vencedor por mês
  UNIQUE(year, month)
);

CREATE INDEX IF NOT EXISTS idx_hall_of_fame_year_month
  ON hall_of_fame(year DESC, month DESC);
CREATE INDEX IF NOT EXISTS idx_hall_of_fame_user
  ON hall_of_fame(user_id);
CREATE INDEX IF NOT EXISTS idx_hall_of_fame_published
  ON hall_of_fame(is_published) WHERE is_published = true;

-- =====================================================
-- 2. Coluna extra em profiles (contador de vitórias)
-- =====================================================
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS hall_of_fame_count INT DEFAULT 0;

-- =====================================================
-- 3. RPC: Selecionar vencedor do mês (admin)
-- Insere ou atualiza o vencedor no Hall da Fama
-- =====================================================
CREATE OR REPLACE FUNCTION select_hall_of_fame_winner(
  p_user_id UUID,
  p_year INT,
  p_month INT,
  p_admin_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_total_likes INT;
  v_post_id UUID;
  v_photo_url TEXT;
  v_hof_id UUID;
BEGIN
  -- Verifica se é admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = p_admin_id AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Apenas admins podem selecionar vencedores';
  END IF;

  -- Pega stats do post mais curtido do vencedor no mês
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

  -- Se não tem likes, retorna erro
  IF v_total_likes IS NULL THEN
    v_total_likes := 0;
  END IF;

  -- Insere ou atualiza
  INSERT INTO hall_of_fame (
    user_id, year, month, total_likes,
    winning_post_id, winning_photo_url,
    selected_by, selected_at
  )
  VALUES (
    p_user_id, p_year, p_month, v_total_likes,
    v_post_id, v_photo_url,
    p_admin_id, now()
  )
  ON CONFLICT (year, month) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    total_likes = EXCLUDED.total_likes,
    winning_post_id = EXCLUDED.winning_post_id,
    winning_photo_url = EXCLUDED.winning_photo_url,
    selected_by = EXCLUDED.selected_by,
    selected_at = EXCLUDED.selected_at
  RETURNING id INTO v_hof_id;

  RETURN v_hof_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 4. RPC: Publicar vencedor no mural
-- =====================================================
CREATE OR REPLACE FUNCTION publish_hall_of_fame(p_hof_id UUID)
RETURNS VOID AS $$
DECLARE
  v_user_id UUID;
  v_current_count INT;
BEGIN
  -- Pega o user_id do hall_of_fame
  SELECT user_id INTO v_user_id
  FROM hall_of_fame WHERE id = p_hof_id;

  -- Marca como publicado
  UPDATE hall_of_fame
  SET is_published = true, published_at = now()
  WHERE id = p_hof_id;

  -- Incrementa o contador no perfil (só se ainda não foi contado)
  -- Verifica se já não estava publicado antes (para evitar duplicar)
  IF NOT EXISTS (
    SELECT 1 FROM hall_of_fame
    WHERE id = p_hof_id AND published_at IS NOT NULL
      AND published_at < now() - interval '1 second'
  ) THEN
    UPDATE profiles
    SET hall_of_fame_count = COALESCE(hall_of_fame_count, 0) + 1
    WHERE id = v_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql;
-- =====================================================
-- 5. RPC: Listar vencedores publicados (mural público)
-- =====================================================
CREATE OR REPLACE FUNCTION get_hall_of_fame_list(
  p_year INT DEFAULT NULL,
  p_limit INT DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  username TEXT,
  full_name TEXT,
  avatar_url TEXT,
  verificado BOOLEAN,
  month INT,
  year INT,
  total_likes INT,
  winning_photo_url TEXT,
  published_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    h.id,
    h.user_id,
    pr.username,
    pr.full_name,
    pr.avatar_url,
    COALESCE(pr.verificado, false) AS verificado,
    h.month,
    h.year,
    h.total_likes,
    h.winning_photo_url,
    h.published_at
  FROM hall_of_fame h
  JOIN profiles pr ON pr.id = h.user_id
  WHERE h.is_published = true
    AND (p_year IS NULL OR h.year = p_year)
  ORDER BY h.year DESC, h.month DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. RLS - Segurança
-- =====================================================
ALTER TABLE hall_of_fame ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Vencedores publicados são públicos" ON hall_of_fame;
CREATE POLICY "Vencedores publicados são públicos"
ON hall_of_fame FOR SELECT
USING (is_published = true);

DROP POLICY IF EXISTS "Apenas admins modificam hall_of_fame" ON hall_of_fame;
CREATE POLICY "Apenas admins modificam hall_of_fame"
ON hall_of_fame FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND is_admin = true
  )
);