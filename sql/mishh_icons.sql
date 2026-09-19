-- =====================================================
-- MISHH ICONS - Funções para a tela MISHH ICONS
-- Roda no Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1. ICON DO BRASIL (geral - sem filtro de estado)
-- Retorna o usuário com mais likes recebidos em fotos
-- no mês/ano atual em todo o Brasil
-- =====================================================
CREATE OR REPLACE FUNCTION get_icons_brasil(
  p_month INT DEFAULT NULL,
  p_year INT DEFAULT NULL
)
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  full_name TEXT,
  avatar_url TEXT,
  state TEXT,
  total_likes BIGINT,
  verificado BOOLEAN
) AS $$
BEGIN
  IF p_month IS NULL THEN
    p_month := EXTRACT(MONTH FROM now())::INT;
  END IF;
  IF p_year IS NULL THEN
    p_year := EXTRACT(YEAR FROM now())::INT;
  END IF;

  RETURN QUERY
  SELECT
    p.user_id,
    pr.username,
    pr.full_name,
    pr.avatar_url,
    pr.state,
    COUNT(l.id)::BIGINT AS total_likes,
    COALESCE(pr.verificado, false) AS verificado
  FROM likes l
  JOIN posts p ON p.id = l.post_id
  JOIN profiles pr ON pr.id = p.user_id
  WHERE
    pr.is_suspended = false
    AND pr.country = 'BR'
    AND EXTRACT(YEAR FROM l.created_at) = p_year
    AND EXTRACT(MONTH FROM l.created_at) = p_month
  GROUP BY p.user_id, pr.username, pr.full_name, pr.avatar_url, pr.state, pr.verificado
  ORDER BY total_likes DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 2. ICONS POR ESTADO (27 estados do Brasil)
-- Retorna o usuário com mais likes por estado no mês atual
-- =====================================================
CREATE OR REPLACE FUNCTION get_icons_by_state(
  p_month INT DEFAULT NULL,
  p_year INT DEFAULT NULL
)
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  full_name TEXT,
  avatar_url TEXT,
  state TEXT,
  total_likes BIGINT,
  verificado BOOLEAN,
  rank_in_state INT
) AS $$
BEGIN
  IF p_month IS NULL THEN
    p_month := EXTRACT(MONTH FROM now())::INT;
  END IF;
  IF p_year IS NULL THEN
    p_year := EXTRACT(YEAR FROM now())::INT;
  END IF;

  RETURN QUERY
  WITH state_leaders AS (
    SELECT
      p.user_id,
      pr.username,
      pr.full_name,
      pr.avatar_url,
      pr.state,
      COUNT(l.id)::BIGINT AS total_likes,
      COALESCE(pr.verificado, false) AS verificado,
      ROW_NUMBER() OVER (
        PARTITION BY UPPER(pr.state)
        ORDER BY COUNT(l.id) DESC
      ) AS rank_in_state
    FROM likes l
    JOIN posts p ON p.id = l.post_id
    JOIN profiles pr ON pr.id = p.user_id
    WHERE
      pr.is_suspended = false
      AND pr.country = 'BR'
      AND pr.state IS NOT NULL
      AND pr.state != ''
      AND EXTRACT(YEAR FROM l.created_at) = p_year
      AND EXTRACT(MONTH FROM l.created_at) = p_month
    GROUP BY p.user_id, pr.username, pr.full_name, pr.avatar_url, pr.state, pr.verificado
  )
  SELECT *
  FROM state_leaders
  WHERE rank_in_state = 1
  ORDER BY UPPER(state);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 3. Tabela auxiliar com os 27 estados do Brasil
-- (para garantir que apareçam todos mesmo sem líder)
-- =====================================================
CREATE TABLE IF NOT EXISTS brazilian_states (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

INSERT INTO brazilian_states (code, name) VALUES
  ('AC', 'Acre'),
  ('AL', 'Alagoas'),
  ('AP', 'Amapá'),
  ('AM', 'Amazonas'),
  ('BA', 'Bahia'),
  ('CE', 'Ceará'),
  ('DF', 'Distrito Federal'),
  ('ES', 'Espírito Santo'),
  ('GO', 'Goiás'),
  ('MA', 'Maranhão'),
  ('MT', 'Mato Grosso'),
  ('MS', 'Mato Grosso do Sul'),
  ('MG', 'Minas Gerais'),
  ('PA', 'Pará'),
  ('PB', 'Paraíba'),
  ('PR', 'Paraná'),
  ('PE', 'Pernambuco'),
  ('PI', 'Piauí'),
  ('RJ', 'Rio de Janeiro'),
  ('RN', 'Rio Grande do Norte'),
  ('RS', 'Rio Grande do Sul'),
  ('RO', 'Rondônia'),
  ('RR', 'Roraima'),
  ('SC', 'Santa Catarina'),
  ('SP', 'São Paulo'),
  ('SE', 'Sergipe'),
  ('TO', 'Tocantins')
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- 4. TODOS OS ICONS DE UMA VEZ (otimizado)
-- Retorna ICON BR + 27 estados em uma única chamada
-- =====================================================
CREATE OR REPLACE FUNCTION get_all_icons(
  p_month INT DEFAULT NULL,
  p_year INT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_brasil JSON;
  v_estados JSON;
  v_result JSON;
BEGIN
  -- Pega o ICON do Brasil (geral)
  SELECT json_build_object(
    'user_id', user_id,
    'username', username,
    'full_name', full_name,
    'avatar_url', avatar_url,
    'state', state,
    'total_likes', total_likes,
    'verificado', verificado
  ) INTO v_brasil
  FROM get_icons_brasil(p_month, p_year)
  LIMIT 1;

  -- Pega os ICONS por estado (já com LEFT JOIN nos 27 estados)
  SELECT COALESCE(json_agg(
    json_build_object(
      'state_code', bs.code,
      'state_name', bs.name,
      'user_id', ies.user_id,
      'username', ies.username,
      'full_name', ies.full_name,
      'avatar_url', ies.avatar_url,
      'total_likes', COALESCE(ies.total_likes, 0),
      'verificado', COALESCE(ies.verificado, false)
    ) ORDER BY bs.code
  ), '[]'::json) INTO v_estados
  FROM brazilian_states bs
  LEFT JOIN LATERAL (
    SELECT *
    FROM get_icons_by_state(p_month, p_year) ies2
    WHERE UPPER(ies2.state) = bs.code
    LIMIT 1
  ) ies ON true;

  -- Monta o resultado final
  v_result := json_build_object(
    'brasil', v_brasil,
    'estados', v_estados,
    'month', COALESCE(p_month, EXTRACT(MONTH FROM now())::INT),
    'year', COALESCE(p_year, EXTRACT(YEAR FROM now())::INT)
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;