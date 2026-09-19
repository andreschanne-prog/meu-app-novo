-- =====================================================
-- MISHH - Dados de teste
-- Rode este SQL DEPOIS de criar pelo menos 1 usuário pelo app.
-- Substitua os IDs pelos retornados em:
--   SELECT id, email FROM auth.users;
-- =====================================================

-- ATENÇÃO: este script cria dados fictícios assumindo IDs específicos.
-- Adapte conforme necessário.

-- Modelo: vamos criar perfis diretamente (o trigger já cria no signup,
-- mas se quiser simular dados):

-- Inserir perfis extras (somente se auth.users já existir; caso contrário, cadastre-se pelo app)
-- Exemplo (descomente e adapte os IDs):
-- INSERT INTO profiles (id, username, full_name, country, state, city)
-- VALUES
--   ('uuid-1', 'ana_silva', 'Ana Silva', 'Brasil', 'SP', 'São Paulo'),
--   ('uuid-2', 'bruno_22', 'Bruno Souza', 'Brasil', 'RJ', 'Rio de Janeiro');

-- Inserir anúncios
INSERT INTO ads (title, image_url, target_url, active) VALUES
('Promoção Summer', 'https://picsum.photos/seed/ad1/600/400', 'https://exemplo.com/promo1', true),
('Curso Online MISHH', 'https://picsum.photos/seed/ad2/600/400', 'https://exemplo.com/curso', true),
('App Delivery', 'https://picsum.photos/seed/ad3/600/400', 'https://exemplo.com/delivery', true),
('Black Friday Antecipada', 'https://picsum.photos/seed/ad4/600/400', 'https://exemplo.com/bf', true)
ON CONFLICT DO NOTHING;

-- Para criar posts de teste, faça upload de fotos pelo app
-- e registre no banco:
-- INSERT INTO posts (user_id, image_url, filter, caption) VALUES ...

-- =====================================================
-- FIM
-- =====================================================