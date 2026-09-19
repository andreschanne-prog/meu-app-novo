import { supabase, ADMIN_EMAILS } from './supabase'

/**
 * Emails que SEMPRE são admin, mesmo sem env var configurada.
 * (Garantia de que o dono do projeto consegue entrar no painel admin
 *  independente de erro de configuração.)
 */
const HARDCODED_ADMIN_EMAILS = ['mishh.suport@gmail.com']

function emailMatchesAdmin(email: string | null | undefined): boolean {
  if (!email) return false
  const normalized = email.toLowerCase().trim()
  const all = [...ADMIN_EMAILS, ...HARDCODED_ADMIN_EMAILS].map(e => e.toLowerCase().trim())
  return all.includes(normalized)
}

/**
 * Checa se o usuário é admin. Considera admin se:
 * 1. A coluna `is_admin = true` no profile dele, OU
 * 2. O email dele está na lista ADMIN_EMAILS (env var + fallback hardcoded),
 * 3. OU o email do auth.users dele está na lista ADMIN_EMAILS.
 */
export async function isAdmin(userId: string): Promise<boolean> {
  // 1. coluna is_admin no profile (fonte da verdade via DB)
  try {
    const { data } = await supabase
      .from('profiles')
      .select('is_admin, email')
      .eq('id', userId)
      .single()
    if (data?.is_admin === true) return true
    if (emailMatchesAdmin(data?.email)) return true
  } catch {
    // profile não existe ou erro de RLS — continua
  }

  // 2. fallback: checar via getUser (email do auth.users)
  try {
    const { data: u } = await supabase.auth.getUser()
    if (u?.user?.email && emailMatchesAdmin(u.user.email)) return true
  } catch {
    // ignora
  }

  return false
}

export function timeAgo(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const s = Math.floor((Date.now() - d.getTime()) / 1000)
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s/60)}m`
  if (s < 86400) return `${Math.floor(s/3600)}h`
  if (s < 604800) return `${Math.floor(s/86400)}d`
  return d.toLocaleDateString('pt-BR')
}

export function classNames(...xs: (string|false|null|undefined)[]) {
  return xs.filter(Boolean).join(' ')
}

/**
 * Retorna classes Tailwind para destacar uma posição no ranking
 * com uma faixa (borda + sombra) na cor da medalha.
 *
 * position: 1 → ouro 🥇 | 2 → prata 🥈 | 3 → bronze 🥉
 *           qualquer outro → sem destaque
 */
export function rankBadgeClass(position: number): string {
  switch (position) {
    case 1:
      return 'bg-gradient-to-br from-yellow-500/20 to-yellow-600/10'
    case 2:
      return 'bg-gradient-to-br from-gray-400/20 to-gray-500/10'
    case 3:
      return 'bg-gradient-to-br from-orange-500/20 to-orange-600/10'
    default:
      return ''
  }
}

export const FILTERS = [
  { key: 'normal', label: 'Normal' },
  { key: 'bw', label: 'P&B' },
  { key: 'sepia', label: 'Sépia' },
  { key: 'vintage', label: 'Vintage' },
  { key: 'vibrant', label: 'Vibrante' },
  { key: 'soft', label: 'Suave' },
  { key: 'contrast', label: 'Contraste Alto' },
  { key: 'blur', label: 'Desfoque' },
]

export function extractHashtags(text: string): string[] {
  return Array.from(text.matchAll(/#(\w+)/g)).map(m => m[1].toLowerCase())
}