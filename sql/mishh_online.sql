-- =====================================================
-- MISHH - Status online (bolinha verde / Instagram)
-- Adiciona coluna `online` em profiles.
-- A coluna `last_seen` já existe (TIMESTAMPTZ, default now()).
-- =====================================================

-- 1. Coluna online (default false)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS online BOOLEAN DEFAULT false;

-- 2. Índice para filtros rápidos (listar quem está online agora)
CREATE INDEX IF NOT EXISTS idx_profiles_online ON profiles(online) WHERE online = true;
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen ON profiles(last_seen DESC);

-- 3. RPC que marca o usuário atual como online + atualiza last_seen.
--    Chamado pelo cliente em intervalo regular (a cada ~60s).
CREATE OR REPLACE FUNCTION public.set_online()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE public.profiles
     SET online = true,
         last_seen = now()
   WHERE id = auth.uid();
$$;

-- 4. RPC que marca o usuário atual como offline (chamado em logout / beforeunload).
CREATE OR REPLACE FUNCTION public.set_offline()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE public.profiles
     SET online = false
   WHERE id = auth.uid();
$$;

-- 5. RPC admin: limpa usuários "online" sem last_seen recente (>5 min).
--    Útil como cron / manutenção caso o cliente não consiga chamar set_offline
--    (ex: fechou a aba sem disparar beforeunload).
CREATE OR REPLACE FUNCTION public.cleanup_stale_online()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
AS $$
  WITH updated AS (
    UPDATE public.profiles
       SET online = false
     WHERE online = true
       AND last_seen < (now() - interval '5 minutes')
     RETURNING 1
  )
  SELECT count(*)::integer FROM updated;
$$;

-- 6. Conceder permissão de execução aos usuários autenticados.
GRANT EXECUTE ON FUNCTION public.set_online() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_offline() TO authenticated;
-- cleanup_stale_online é só para service_role / cron (não conceder a authenticated).

-- Observação:
-- A lógica do "online há menos de 5 minutos" é calculada no CLIENTE,
-- combinando os campos `online` e `last_seen`. Se `online=true` E
-- `last_seen` estiver a menos de 5 min, mostra a bolinha verde.