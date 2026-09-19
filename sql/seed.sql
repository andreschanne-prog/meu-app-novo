-- =====================================================
-- MISHH - Dados de teste (somente após criar usuários pelo app
-- OU inserir manualmente em auth.users)
-- =====================================================

-- ANÚNCIOS de teste
INSERT INTO ads (title, image_url, target_url, active) VALUES
('Promoção Summer', 'https://picsum.photos/seed/ad1/600/400', 'https://exemplo.com/promo1', true),
('Curso Online MISHH', 'https://picsum.photos/seed/ad2/600/400', 'https://exemplo.com/curso', true),
('App Delivery', 'https://picsum.photos/seed/ad3/600/400', 'https://exemplo.com/delivery', true)
ON CONFLICT DO NOTHING;