-- =====================================================
-- MISHH - Schema completo (rode no Supabase SQL Editor)
-- URL: https://rssopakixbwzurkmouzk.supabase.co
-- =====================================================

-- Tabelas que JÁ EXISTEM no projeto (não recriar):
-- blocks, conversations, conversation_participants,
-- follows, likes, messages, posts, profiles, terms_acceptance
-- (mas adicionamos colunas faltantes com IF NOT EXISTS)

-- =====================================================
-- 1. Colunas novas em PROFILES
-- =====================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS country TEXT DEFAULT '';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS state TEXT DEFAULT '';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS city TEXT DEFAULT '';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ DEFAULT now();
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT '';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verificado BOOLEAN DEFAULT false; -- selo dourado de conta verificada
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS online BOOLEAN DEFAULT false; -- status online (bolinha verde)

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);

-- =====================================================
-- 1b. FOLLOWS (tabela auxiliar caso ainda não exista)
-- =====================================================
CREATE TABLE IF NOT EXISTS follows (
  follower_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  following_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (follower_id, following_id)
);
CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);

-- =====================================================
-- 2. STORIES (24h)
-- =====================================================
CREATE TABLE IF NOT EXISTS stories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT NOT NULL,
  filter TEXT DEFAULT 'normal',
  caption TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '24 hours') NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_stories_user ON stories(user_id);
CREATE INDEX IF NOT EXISTS idx_stories_expires ON stories(expires_at);

-- =====================================================
-- 3. FOLLOW_REQUESTS (contas privadas)
-- =====================================================
CREATE TABLE IF NOT EXISTS follow_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  target_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(requester_id, target_id)
);

-- =====================================================
-- 4. ADS
-- =====================================================
CREATE TABLE IF NOT EXISTS ads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  image_url TEXT NOT NULL,
  target_url TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 5. AD_VIEWS / AD_CLICKS
-- =====================================================
CREATE TABLE IF NOT EXISTS ad_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ad_id UUID REFERENCES ads(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  viewed_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ad_views_ad ON ad_views(ad_id);
CREATE INDEX IF NOT EXISTS idx_ad_views_date ON ad_views(viewed_at);

CREATE TABLE IF NOT EXISTS ad_clicks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ad_id UUID REFERENCES ads(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  clicked_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 6. POSTS - colunas faltantes
-- =====================================================
ALTER TABLE posts ADD COLUMN IF NOT EXISTS filter TEXT DEFAULT 'normal';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS caption TEXT DEFAULT '';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS hashtags TEXT DEFAULT '';

ALTER TABLE terms_acceptance ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ DEFAULT now();