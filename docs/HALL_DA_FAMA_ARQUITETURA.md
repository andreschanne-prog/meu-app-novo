# 🏆 HALL DA FAMA - Arquitetura do Projeto (mishh)

> Inspirado na Calçada da Fama de Hollywood, esse módulo homenageia os usuários que mais receberam curtidas em seus posts no app mishh, mês a mês.

---

## 📌 1. Visão Geral

### Conceito
Todo mês, o usuário que receber o **maior número de curtidas em seus posts** durante o período (do dia 01 ao último dia do mês) é consagrado no **Hall da Fama** do app.

### Como funciona
1. **Durante o mês** → O sistema conta as curtidas recebidas em tempo real
2. **No painel admin** → Você acompanha quem está ganhando
3. **No fim do mês** → Você "congela" o vencedor manualmente
4. **Mural público** → O perfil do vencedor entra para o Hall da Fama com destaque

---

## 🎯 2. Objetivos

| Objetivo | Descrição |
|----------|-----------|
| 🎖️ Reconhecer | Dar destaque aos usuários mais curtidos do mês |
| 🔥 Engajar | Estimular competição saudável entre usuários |
| 📸 Valorizar | Homenagear com um "mural" permanente estilo Calçada da Fama |
| 📈 Reter | Criar motivo para usuários voltarem todo mês |

---

## 🗄️ 3. Banco de Dados (Supabase)

### 3.1 Nova Tabela: `hall_of_fame`

```sql
CREATE TABLE IF NOT EXISTS hall_of_fame (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  -- Período
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
  -- Garantir 1 vencedor por mês
  UNIQUE(year, month)
);

CREATE INDEX idx_hall_of_fame_year_month ON hall_of_fame(year DESC, month DESC);
CREATE INDEX idx_hall_of_fame_user ON hall_of_fame(user_id);
CREATE INDEX idx_hall_of_fame_published ON hall_of_fame(is_published) WHERE is_published = true;
```

### 3.2 Coluna extra em `profiles`

```sql
-- Contar quantas vezes o usuário foi para o Hall
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS hall_of_fame_count INT DEFAULT 0;
```

### 3.3 View opcional: `monthly_likes_summary`

```sql
CREATE OR REPLACE VIEW monthly_likes_summary AS
SELECT
  p.user_id,
  pr.username,
  pr.full_name,
  pr.avatar_url,
  pr.verificado,
  COUNT(l.id) AS total_likes,
  DATE_TRUNC('month', l.created_at) AS month_ref
FROM likes l
JOIN posts p ON p.id = l.post_id
JOIN profiles pr ON pr.id = p.user_id
GROUP BY p.user_id, pr.username, pr.full_name, pr.avatar_url, pr.verificado, DATE_TRUNC('month', l.created_at);
```

---

## ⚙️ 4. Regras de Negócio

### 4.1 Janela de Contagem
- ⏰ **Início:** Dia 01 do mês às `00:00:00` (timezone do servidor)
- ⏰ **Fim:** Último dia do mês às `23:59:59`

### 4.2 Critério de Vitória
- ✅ Soma de **todas as curtidas recebidas** em **todos os posts** do usuário no mês
- ❌ Não conta: curtidas em stories, comentários
- ❌ Não conta: auto-curtidas (se aplicável)

### 4.3 Critérios de Desempate
Em caso de empate, o desempate segue esta ordem:
1. 🥇 Maior número de posts publicados no mês
2. 🥈 Conta mais antiga (`created_at`)
3. 🥉 Sorteio manual pelo admin

### 4.4 Publicação
- O admin precisa **confirmar manualmente** o vencedor no fim do mês
- Só após `is_published = true` o perfil aparece no mural público

### 4.5 Anti-fraude
- ❌ Bloquear contas suspensas (`is_suspended = true`)
- ❌ Bloquear contas deletadas
- ✅ Validar que o usuário tem pelo menos 1 foto/post no mês

---

## 🖥️ 5. Telas (UX/UI)

### 5.1 Tela Pública: `/hall-da-fama`

**Acessível para todos os usuários** (autenticados ou não)

**Layout:**
```
┌─────────────────────────────────────────┐
│  🏆 HALL DA FAMA - HALL DOS FAMOSOS     │
├─────────────────────────────────────────┤
│  [Filtro: 2026 ▼] [Filtro: Todos ▼]    │
├─────────────────────────────────────────┤
│                                         │
│   ⭐ JAN 2026    ⭐ FEV 2026    ⭐ MAR  │
│   ┌────────┐    ┌────────┐    ┌────────┐│
│   │  📸    │    │  📸    │    │  📸    ││
│   │ 🌟⭐   │    │ 🌟⭐   │    │ 🌟⭐   ││
│   │ Maria  │    │ João   │    │ Ana    ││
│   │ 1.2k ❤│    │ 980 ❤ │    │ 2.1k ❤││
│   │  SP    │    │  RJ    │    │  MG    ││
│   └────────┘    └────────┘    └────────┘│
└─────────────────────────────────────────┘
```

**Componentes da tela:**
- 🏆 Header com troféu e título
- 🔍 Filtro por ano
- 📅 Filtro por mês
- 🎴 Cards dos vencedores (estilo "calçada")
- ✨ Animação de entrada (efeito brilho)
- 🔗 Link para o perfil do vencedor

### 5.2 Painel Admin: `/admin/hall-da-fame`

**Acesso restrito a admins (`is_admin = true`)**

#### Aba 1: 📊 Ranking Atual (tempo real)
```
┌─────────────────────────────────────────┐
│  🏆 LÍDERES DE SETEMBRO 2026            │
│  Atualizado em tempo real               │
├─────────────────────────────────────────┤
│  🥇 1º - @maria_silva      1.234 ❤   │
│  🥈 2º - @joao_pedro         980 ❤   │
│  🥉 3º - @ana_luiza          876 ❤   │
│   #4 - @carlos_mendes        654 ❤   │
│   #5 - @paula_souza          543 ❤   │
├─────────────────────────────────────────┤
│  [👑 Selecionar Vencedor do Mês]       │
└─────────────────────────────────────────┘
```

#### Aba 2: 📜 Histórico de Vencedores
- Lista dos meses anteriores já publicados
- Opção de republicar/despublicar

#### Aba 3: ⚙️ Configurações
- Mês/ano ativo
- Status: "Em andamento" / "Aguardando seleção" / "Selecionado"

---

## 🔌 6. APIs / Funções RPC (Supabase)

### 6.1 `get_monthly_leaderboard(p_year, p_month)`

Retorna o ranking do mês específico (ou do mês atual se não passar parâmetros).

```sql
CREATE OR REPLACE FUNCTION get_monthly_leaderboard(
  p_year INT DEFAULT NULL,
  p_month INT DEFAULT NULL
)
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  full_name TEXT,
  avatar_url TEXT,
  verificado BOOLEAN,
  total_likes BIGINT,
  post_count BIGINT,
  rank_position INT
) AS $$
BEGIN
  IF p_year IS NULL THEN
    p_year := EXTRACT(YEAR FROM now())::INT;
  END IF;
  IF p_month IS NULL THEN
    p_month := EXTRACT(MONTH FROM now())::INT;
  END IF;

  RETURN QUERY
  SELECT
    p.user_id,
    pr.username,
    pr.full_name,
    pr.avatar_url,
    pr.verificado,
    COUNT(l.id)::BIGINT AS total_likes,
    COUNT(DISTINCT p.id)::BIGINT AS post_count,
    ROW_NUMBER() OVER (ORDER BY COUNT(l.id) DESC)::INT AS rank_position
  FROM likes l
  JOIN posts p ON p.id = l.post_id
  JOIN profiles pr ON pr.id = p.user_id
  WHERE
    pr.is_suspended = false
    AND EXTRACT(YEAR FROM l.created_at) = p_year
    AND EXTRACT(MONTH FROM l.created_at) = p_month
  GROUP BY p.user_id, pr.username, pr.full_name, pr.avatar_url, pr.verificado
  ORDER BY total_likes DESC
  LIMIT 100;
END;
$$ LANGUAGE plpgsql;
```

### 6.2 `select_hall_of_fame_winner(p_user_id, p_year, p_month)`

Admin escolhe o vencedor do mês.

```sql
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
  -- Verificar se é admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = p_admin_id AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Apenas admins podem selecionar vencedores';
  END IF;

  -- Buscar stats do vencedor
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

  -- Inserir ou atualizar no Hall
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
```

### 6.3 `publish_hall_of_fame(p_hof_id)`

Publica o vencedor no mural e incrementa o contador no perfil.

```sql
CREATE OR REPLACE FUNCTION publish_hall_of_fame(p_hof_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE hall_of_fame
  SET is_published = true, published_at = now()
  WHERE id = p_hof_id;

  UPDATE profiles
  SET hall_of_fame_count = COALESCE(hall_of_fame_count, 0) + 1
  WHERE id = (SELECT user_id FROM hall_of_fame WHERE id = p_hof_id);
END;
$$ LANGUAGE plpgsql;
```

### 6.4 `get_hall_of_fame_list(p_year, p_limit)`

Lista os vencedores já publicados.

```sql
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
    pr.verificado,
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
```

---

## 🎨 7. Componentes Frontend (Next.js + Tailwind)

### 7.1 Estrutura de Pastas
```
app/
  hall-da-fame/
    page.tsx                 # Mural público
  admin/
    hall-da-fame/
      page.tsx               # Painel admin
components/
  hall/
    HallCard.tsx             # Card do vencedor
    HallGrid.tsx             # Grid do mural
    HallBadge.tsx            # Badge "Hall da Fama"
    MonthLeaderboard.tsx     # Ranking ao vivo
    WinnerModal.tsx          # Modal de confirmação
```

### 7.2 Stack Tecnológica
- ✅ Next.js 14 (App Router) - já em uso
- ✅ Tailwind CSS - já em uso
- ✅ Supabase Client - já em uso
- ✅ Lucide Icons - já em uso
- 🎯 Framer Motion (opcional) - para animações
- 🎯 date-fns (opcional) - para manipulação de datas

### 7.3 Identidade Visual
- 🌟 Bordas douradas (`#D4AF37`) - já usa no verificado
- ✨ Efeito brilho/glow nos cards
- 🖼️ Foto do vencedor em destaque
- 🏆 Ícone de troféu animado
- 🌙 Tema dark consistente com o app

---

## 📱 8. Fluxo de Uso

### 8.1 Fluxo Admin
```
1. Admin acessa /admin/hall-da-fame
2. Vê o ranking em tempo real do mês atual
3. No último dia do mês, clica em "Selecionar Vencedor"
4. Confirma o vencedor no modal
5. Clica em "Publicar no Mural"
6. Vencedor aparece em /hall-da-fame
```

### 8.2 Fluxo Usuário Comum
```
1. Usuário acessa /hall-da-fame
2. Vê os vencedores de cada mês
3. Clica no card para ir ao perfil do vencedor
4. Vencedor tem badge ⭐ no perfil dele
```

---

## 🚀 9. Roadmap de Implementação

### Fase 1: Base do Banco de Dados ⚙️
- [ ] Criar tabela `hall_of_fame` no Supabase
- [ ] Adicionar coluna `hall_of_fame_count` em `profiles`
- [ ] Criar funções RPC: `get_monthly_leaderboard`, `select_hall_of_fame_winner`, `publish_hall_of_fame`, `get_hall_of_fame_list`
- [ ] Configurar RLS (Row Level Security)

### Fase 2: Painel Admin 🎛️
- [ ] Criar rota `/admin/hall-da-fame`
- [ ] Componente de ranking ao vivo
- [ ] Botão "Selecionar Vencedor"
- [ ] Modal de confirmação
- [ ] Botão "Publicar no Mural"

### Fase 3: Mural Público 🏆
- [ ] Criar rota `/hall-da-fame`
- [ ] Grid responsivo dos vencedores
- [ ] Filtros (ano, mês)
- [ ] Animações de entrada
- [ ] Link para perfil do vencedor

### Fase 4: Polish ✨
- [ ] Badge ⭐ no perfil do vencedor
- [ ] Notificação para o vencedor ("Você está no Hall!")
- [ ] Compartilhamento social
- [ ] Animações finais

### Fase 5: Testes & Deploy ✅
- [ ] Testar seleção de vencedor
- [ ] Testar publicação
- [ ] Testar RLS
- [ ] Deploy e monitoramento

---

## 🔒 10. Segurança (RLS - Row Level Security)

```sql
-- Mural público: qualquer um vê os publicados
ALTER TABLE hall_of_fame ENABLE ROW LEVEL SECURITY;

-- Política 1: Vencedores publicados são visíveis para todos
CREATE POLICY "Vencedores publicados são públicos"
ON hall_of_fame FOR SELECT
USING (is_published = true);

-- Política 2: Apenas admins podem modificar
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
```

---

## 💡 11. Melhorias Futuras

- 🌍 **Categorias por região** (vencedor por estado/cidade)
- 🎭 **Categorias especiais** (foto mais comentada, mais story, etc.)
- 🏅 **Ranking anual** (vencedor do ano)
- 💰 **Premiações reais** (para usuários premium)
- 🎁 **Benefícios para vencedores** (selo premium, destaque no feed)
- 📊 **Estatísticas históricas** (recorde de curtidas, sequência de vitórias)
- 🔔 **Push notification** para o vencedor

---

## ✅ 12. Checklist Final

Antes de lançar, garantir:

- [ ] Banco de dados criado e testado
- [ ] Funções RPC funcionando
- [ ] RLS configurado e validado
- [ ] Painel admin responsivo
- [ ] Mural público lindo e funcional
- [ ] Badge no perfil implementado
- [ ] Notificações funcionando
- [ ] Testado em mobile (iOS e Android)
- [ ] Documentação atualizada

---

## 📝 13. Notas Finais

> **Documento criado em:** 06/09/2026  
> **Versão:** 1.0  
> **Status:** 📋 Planejamento  
> **Próximo passo:** Começar pela Fase 1 (Base do Banco de Dados)

### Conceito-chave
> *"Todo mês, uma nova estrela brilha no Hall da Fama do mishh"* ⭐

### Por que essa feature vai funcionar?
1. 🏆 **Reconhecimento** - Usuários querem ser destaque
2. 📅 **Recorrência** - Todo mês tem um novo vencedor
3. 🔄 **Engajamento contínuo** - Pessoas voltam para ver quem ganhou
4. 💬 **Compartilhamento** - Vencedores divulgam nas redes sociais
5. 🎯 **Gamificação** - Estimula uso do app

---