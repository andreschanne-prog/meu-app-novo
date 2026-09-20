-- Permite salvar as pessoas marcadas em cada publicacao.
ALTER TABLE posts ADD COLUMN IF NOT EXISTS tagged_user_ids UUID[] DEFAULT '{}';
CREATE INDEX IF NOT EXISTS idx_posts_tagged_user_ids ON posts USING GIN (tagged_user_ids);