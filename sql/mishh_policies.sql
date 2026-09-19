-- =====================================================
-- MISHH - Policies (RLS)
-- =====================================================

-- PROFILES
DROP POLICY IF EXISTS "profiles_read" ON profiles;
CREATE POLICY "profiles_read" ON profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);
DROP POLICY IF EXISTS "profiles_insert_self" ON profiles;
CREATE POLICY "profiles_insert_self" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- POSTS
DROP POLICY IF EXISTS "posts_read" ON posts;
CREATE POLICY "posts_read" ON posts FOR SELECT USING (true);
DROP POLICY IF EXISTS "posts_insert_own" ON posts;
CREATE POLICY "posts_insert_own" ON posts FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "posts_delete_own" ON posts;
CREATE POLICY "posts_delete_own" ON posts FOR DELETE USING (auth.uid() = user_id);

-- LIKES - bloquear insert/delete direto (só via RPC)
DROP POLICY IF EXISTS "likes_read" ON likes;
CREATE POLICY "likes_read" ON likes FOR SELECT USING (true);
DROP POLICY IF EXISTS "likes_block_insert" ON likes;
CREATE POLICY "likes_block_insert" ON likes FOR INSERT WITH CHECK (false);
DROP POLICY IF EXISTS "likes_block_delete" ON likes;
CREATE POLICY "likes_block_delete" ON likes FOR DELETE USING (false);

-- FOLLOWS
DROP POLICY IF EXISTS "follows_read" ON follows;
CREATE POLICY "follows_read" ON follows FOR SELECT USING (true);
DROP POLICY IF EXISTS "follows_insert_own" ON follows;
CREATE POLICY "follows_insert_own" ON follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
DROP POLICY IF EXISTS "follows_delete_own" ON follows;
CREATE POLICY "follows_delete_own" ON follows FOR DELETE USING (auth.uid() = follower_id);

-- BLOCKS
DROP POLICY IF EXISTS "blocks_all" ON blocks;
CREATE POLICY "blocks_all" ON blocks FOR ALL USING (auth.uid() = blocker_id);

-- CONVERSATIONS / MESSAGES
DROP POLICY IF EXISTS "conv_read" ON conversations;
CREATE POLICY "conv_read" ON conversations FOR SELECT USING (true);
DROP POLICY IF EXISTS "conv_parts_all" ON conversation_participants;
CREATE POLICY "conv_parts_all" ON conversation_participants FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "messages_read" ON messages;
CREATE POLICY "messages_read" ON messages FOR SELECT USING (true);
DROP POLICY IF EXISTS "messages_insert_own" ON messages;
CREATE POLICY "messages_insert_own" ON messages FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- TERMS_ACCEPTANCE
DROP POLICY IF EXISTS "terms_insert_own" ON terms_acceptance;
CREATE POLICY "terms_insert_own" ON terms_acceptance FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "terms_read_own" ON terms_acceptance;
CREATE POLICY "terms_read_own" ON terms_acceptance FOR SELECT USING (auth.uid() = user_id);

-- STORIES
DROP POLICY IF EXISTS "stories_read" ON stories;
CREATE POLICY "stories_read" ON stories FOR SELECT USING (expires_at > now());
DROP POLICY IF EXISTS "stories_insert_own" ON stories;
CREATE POLICY "stories_insert_own" ON stories FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "stories_delete_own" ON stories;
CREATE POLICY "stories_delete_own" ON stories FOR DELETE USING (auth.uid() = user_id);

-- FOLLOW_REQUESTS
DROP POLICY IF EXISTS "freq_read" ON follow_requests;
CREATE POLICY "freq_read" ON follow_requests FOR SELECT USING (true);
DROP POLICY IF EXISTS "freq_insert" ON follow_requests;
CREATE POLICY "freq_insert" ON follow_requests FOR INSERT WITH CHECK (auth.uid() = requester_id);
DROP POLICY IF EXISTS "freq_update_target" ON follow_requests;
CREATE POLICY "freq_update_target" ON follow_requests FOR UPDATE USING (auth.uid() = target_id);

-- ADS
DROP POLICY IF EXISTS "ads_read" ON ads;
CREATE POLICY "ads_read" ON ads FOR SELECT USING (active = true);

-- AD_VIEWS / AD_CLICKS
DROP POLICY IF EXISTS "adv_insert" ON ad_views;
CREATE POLICY "adv_insert" ON ad_views FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "adv_read" ON ad_views;
CREATE POLICY "adv_read" ON ad_views FOR SELECT USING (true);
DROP POLICY IF EXISTS "adc_insert" ON ad_clicks;
CREATE POLICY "adc_insert" ON ad_clicks FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "adc_read" ON ad_clicks;
CREATE POLICY "adc_read" ON ad_clicks FOR SELECT USING (true);

-- STORAGE bucket 'media'
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "media_read" ON storage.objects;
CREATE POLICY "media_read" ON storage.objects FOR SELECT USING (bucket_id = 'media');
DROP POLICY IF EXISTS "media_insert" ON storage.objects;
CREATE POLICY "media_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'media' AND auth.role() = 'authenticated');
DROP POLICY IF EXISTS "media_delete_own" ON storage.objects;
CREATE POLICY "media_delete_own" ON storage.objects FOR DELETE USING (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- =====================================================
-- NOTIFICATIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  actor_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('like','follow','comment')),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  comment_id UUID,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_actor ON notifications(actor_id);

-- Usuário lê/atualiza só as PRÓPRIAS notificações
DROP POLICY IF EXISTS "notifications_read_own" ON notifications;
CREATE POLICY "notifications_read_own" ON notifications FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
CREATE POLICY "notifications_update_own" ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- Insert é via trigger SECURITY DEFINER — bloquear insert direto de usuários
DROP POLICY IF EXISTS "notifications_block_insert" ON notifications;
CREATE POLICY "notifications_block_insert" ON notifications FOR INSERT WITH CHECK (false);

DROP POLICY IF EXISTS "notifications_block_delete" ON notifications;
CREATE POLICY "notifications_block_delete" ON notifications FOR DELETE USING (false);

-- =====================================================
-- COMMENTS
-- =====================================================
CREATE TABLE IF NOT EXISTS comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  text TEXT NOT NULL CHECK (length(text) BETWEEN 1 AND 500),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_created ON comments(post_id, created_at DESC);

DROP POLICY IF EXISTS "comments_read" ON comments;
CREATE POLICY "comments_read" ON comments FOR SELECT USING (true);

DROP POLICY IF EXISTS "comments_insert_auth" ON comments;
CREATE POLICY "comments_insert_auth" ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "comments_delete_own" ON comments;
CREATE POLICY "comments_delete_own" ON comments FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- REPORTS (denúncias — obrigatório para Play Store)
-- =====================================================
CREATE TABLE IF NOT EXISTS reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reported_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  reported_post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (reason IN ('spam','nudez','violencia','fake','outro')),
  details TEXT DEFAULT '',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','reviewed','dismissed','action_taken')),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reports_reporter ON reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_reported_user ON reports(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_reports_reported_post ON reports(reported_post_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_created ON reports(created_at DESC);

-- Qualquer usuário autenticado pode inserir (reporter_id = auth.uid())
DROP POLICY IF EXISTS "reports_insert_own" ON reports;
CREATE POLICY "reports_insert_own" ON reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- Usuário vê as PRÓPRIAS denúncias OU se for admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  ) OR EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
      AND email = ANY (string_to_array(current_setting('app.admin_emails', true), ','))
  );
$$;

DROP POLICY IF EXISTS "reports_read_own" ON reports;
CREATE POLICY "reports_read_own" ON reports FOR SELECT USING (
  auth.uid() = reporter_id OR public.is_admin()
);

DROP POLICY IF EXISTS "reports_update_admin" ON reports;
CREATE POLICY "reports_update_admin" ON reports FOR UPDATE USING (public.is_admin());

-- =====================================================
-- NOTIFICATION TRIGGERS (like, follow, comment)
-- =====================================================
CREATE OR REPLACE FUNCTION public.notify_like()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_post_owner UUID;
BEGIN
  SELECT user_id INTO v_post_owner FROM posts WHERE id = NEW.post_id;
  IF v_post_owner IS NULL OR v_post_owner = NEW.user_id THEN
    RETURN NEW; -- pular auto-like ou post deletado
  END IF;
  INSERT INTO public.notifications (user_id, actor_id, type, post_id)
  VALUES (v_post_owner, NEW.user_id, 'like', NEW.post_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_like ON likes;
CREATE TRIGGER trg_notify_like
  AFTER INSERT ON likes
  FOR EACH ROW EXECUTE FUNCTION public.notify_like();

CREATE OR REPLACE FUNCTION public.notify_follow()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.follower_id = NEW.following_id THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.notifications (user_id, actor_id, type)
  VALUES (NEW.following_id, NEW.follower_id, 'follow');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_follow ON follows;
CREATE TRIGGER trg_notify_follow
  AFTER INSERT ON follows
  FOR EACH ROW EXECUTE FUNCTION public.notify_follow();

CREATE OR REPLACE FUNCTION public.notify_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_post_owner UUID;
BEGIN
  SELECT user_id INTO v_post_owner FROM posts WHERE id = NEW.post_id;
  IF v_post_owner IS NULL OR v_post_owner = NEW.user_id THEN
    RETURN NEW; -- pular auto-comentário
  END IF;
  INSERT INTO public.notifications (user_id, actor_id, type, post_id, comment_id)
  VALUES (v_post_owner, NEW.user_id, 'comment', NEW.post_id, NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_comment ON comments;
CREATE TRIGGER trg_notify_comment
  AFTER INSERT ON comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_comment();

-- =====================================================
-- TRIGGER: criar profile automaticamente no signup
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, country, state, city)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'country', ''),
    COALESCE(NEW.raw_user_meta_data->>'state', ''),
    COALESCE(NEW.raw_user_meta_data->>'city', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();