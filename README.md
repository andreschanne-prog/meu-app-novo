# MISHH — Rede Social Completa

Web + Mobile responsivo (Next.js 14 + Tailwind + Supabase).

## ⚙️ Configurar Supabase (OBRIGATÓRIO)

1. Abra o projeto Supabase: https://rssopakixbwzurkmouzk.supabase.co
2. Vá em **SQL Editor** e rode nesta ordem:
   - `sql/mishh_schema.sql`
   - `sql/mishh_rls.sql`
   - `sql/mishh_policies.sql`
   - `sql/mishh_fix_profile_creation.sql` ⚠️ **OBRIGATÓRIO** — corrige bug de "Perfil não encontrado" para novos usuários (cria trigger, RLS e perfis órfãos)
   - `sql/mishh_verificado.sql` (selo de verificação dourado — opcional, mas recomendado)
   - `sql/mishh_online.sql` (status online — bolinha verde estilo Instagram — opcional, mas recomendado)
   - `sql/seed_demo.sql` (anúncios de teste)
3. Em **Storage**, confirme que o bucket `media` está **público**.
4. Em **Authentication → Providers**, mantenha **Email** ligado.
5. Em **Authentication → URL Configuration** coloque o site que for usar.

## 🚀 Rodar local

```bash
npm install
npm run dev
```

Abra http://localhost:3000

## 👤 Conta admin

Email: **mishh.suport@gmail.com** — ao logar com esse email, `/admin` é liberado.

## 📋 Funcionalidades implementadas

- Cadastro com email, senha, nome, país, estado, cidade + checkbox de termos (terms_acceptance)
- Verificação de email
- Topo: botão Story (+), logo MISHH, botão Chat
- Carrossel de Stories 24h com 8 filtros
- Feed: 1º item é anúncio, depois a cada 4 posts vem 1 anúncio disfarçado (label "Anúncio" cinza)
- 8 filtros de post: Normal, P&B, Sépia, Vintage, Vibrante, Suave, Contraste Alto, Desfoque
- Like via RPC `toggle_like` (anti-hack via DevTools)
- NSFW check via `hooks/useNSFWCheck.ts` (bloqueia se >80%)
- 1 conta por email (campo email é UNIQUE em auth.users)
- Perfil com total de curtidas em LARANJA #FF6B00 grande
- Botão Conta Restrita (Privada), Editar Dados, Deletar Conta
- Ranking: Mundo / País / Estado / Cidade
- Pesquisa @usuário e #hashtag
- Chat 1-a-1 com texto e foto
- Barra de navegação fixa com 5 botões
- Anúncios em `ads`, views em `ad_views`, cliques em `ad_clicks`
- Área admin `/admin` com gráfico de usuários online por dia, views/cliques, suspender, deletar
- Selo dourado de "Verificado" no perfil (borda dourada + checkmark + texto). Admin pode verificar/desverificar via painel.
- Status online com bolinha verde estilo Instagram: aparece em perfis, feed, stories, ranking, busca, chat e notificações. Auto-atualiza a cada 60s; some após 5 min de inatividade.
- RLS em todas as tabelas
- Likes: 1 por usuário/post (RPC), ninguém pode alterar manualmente

## 📁 Estrutura

```
app/
  login, signup, feed, post/new, profile, profile/edit,
  ranking, search, chat, stories/new, stories/[userId],
  user/[id], admin, terms, privacy, help
components/
  AppShell, TopBar, BottomNav, Footer,
  PostCard, AdCard, StoriesCarousel
lib/
  supabase.ts (cliente Supabase)
  helpers.ts
hooks/
  useAuth.ts, useNSFWCheck.ts
sql/
  mishh_schema.sql, mishh_rls.sql,
  mishh_policies.sql, seed_demo.sql
```

Suporte: **mishh.suport@gmail.com**