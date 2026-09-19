'use client'
import { useState } from 'react'
import AppShell from '@/components/AppShell'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { VerifiedBadge } from '@/components/VerifiedBadge'
import OnlineBadge from '@/components/OnlineBadge'
import { isUserOnline } from '@/hooks/usePresence'

type Result = {
  type: 'user' | 'hashtag'
  id: string
  name: string
  info?: string
  avatar_url?: string
  verificado?: boolean
  online?: boolean
  last_seen?: string | null
}

export default function SearchPage() {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(false)

  async function search() {
    if (!q.trim()) return
    setLoading(true)
    const term = q.trim().toLowerCase()
    const out: Result[] = []

    if (term.startsWith('@')) {
      const t = term.slice(1)
      const { data } = await supabase.from('profiles')
        .select('id, username, full_name, avatar_url, verificado, online, last_seen')
        .ilike('username', `${t}%`).limit(20)
      ;(data||[]).forEach(d => out.push({
        type: 'user',
        id: d.id,
        name: d.username,
        info: d.full_name,
        avatar_url: d.avatar_url,
        verificado: d.verificado,
        online: d.online,
        last_seen: d.last_seen,
      }))
    } else if (term.startsWith('#')) {
      const t = term.slice(1)
      const { data } = await supabase.from('posts')
        .select('id, hashtags, image_url')
        .ilike('hashtags', `%${t}%`).limit(20)
      ;(data||[]).forEach(d => out.push({ type: 'hashtag', id: d.id, name: `#${t}` }))
    } else {
      const { data } = await supabase.from('profiles')
        .select('id, username, full_name, avatar_url, verificado, online, last_seen')
        .ilike('username', `${term}%`).limit(20)
      ;(data||[]).forEach(d => out.push({
        type: 'user',
        id: d.id,
        name: d.username,
        info: d.full_name,
        avatar_url: d.avatar_url,
        verificado: d.verificado,
        online: d.online,
        last_seen: d.last_seen,
      }))
    }
    setResults(out)
    setLoading(false)
  }

  return (
    <AppShell>
      <h2 className="text-xl sm:text-2xl font-light mb-6 text-white tracking-wide">Pesquisar</h2>
      <div className="flex gap-2 mb-3 sm:mb-4">
        <input value={q} onChange={e=>setQ(e.target.value)}
          onKeyDown={e=>e.key==='Enter' && search()}
          placeholder="@usuário ou #hashtag"
          className="flex-1 min-w-0 p-3 text-sm sm:text-base rounded-full bg-[#262626] text-white placeholder:text-[#a8a8a8] font-light" />
        <button onClick={search} className="bg-white text-black px-5 rounded-full text-sm sm:text-base font-light hover:opacity-90 active:scale-95 transition shrink-0 tracking-wide">
          Buscar
        </button>
      </div>

      {loading && <div className="text-center text-[#a8a8a8] py-6 text-sm sm:text-base font-light">Buscando...</div>}

      {!loading && results.length === 0 && q.trim() && (
        <div className="py-10 text-center text-sm sm:text-base text-[#a8a8a8] font-light">
          Nenhum resultado para "{q}".
        </div>
      )}

      <div className="space-y-3">
        {results.map(r => (
          r.type === 'user' ? (
            <Link
              key={`user-${r.id}`}
              href={`/user/${r.id}`}
              className="block bg-[#0a0a0a] p-3 rounded-2xl hover:bg-[#1a1a1a] transition active:scale-[0.99]"
            >
              <div className="flex items-center gap-3">
                <div className="relative shrink-0">
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#262626] overflow-hidden ${r.verificado ? 'ring-2 ring-[#D4AF37] ring-offset-2 ring-offset-[#0a0a0a]' : ''}`}>
                    {r.avatar_url ? (
                      <img src={r.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-mishh-orange to-orange-300 flex items-center justify-center text-white font-light text-sm sm:text-base">
                        {r.name?.[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                  </div>
                  {isUserOnline({ online: r.online, last_seen: r.last_seen }) && !r.verificado && (
                    <OnlineBadge size={12} />
                  )}
                  {r.verificado && (
                    <div className="absolute -bottom-0.5 -right-0.5">
                      <VerifiedBadge size={16} />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="font-light text-sm sm:text-base truncate flex items-center gap-1.5 text-white tracking-wide">
                    <span>@{r.name}</span>
                    {r.verificado && (
                      <span className="text-[#D4AF37] text-[10px] sm:text-xs font-light inline-flex items-center gap-0.5">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="shrink-0">
                          <path d="M12 2l2.39 4.84L20 6.27l-4 3.9.94 5.5L12 13l-4.94 2.67L8 10.17 4 6.27l5.61.57L12 2z"/>
                        </svg>
                      </span>
                    )}
                  </div>
                  <div className="text-xs sm:text-sm text-[#a8a8a8] truncate font-light">{r.info}</div>
                </div>
              </div>
            </Link>
          ) : (
            <Link
              key={`tag-${r.id}`}
              href={`/feed?tag=${encodeURIComponent(r.name)}`}
              className="block bg-[#0a0a0a] p-3 rounded-2xl hover:bg-[#1a1a1a] transition active:scale-[0.99]"
            >
              <div className="font-light text-sm sm:text-base text-white tracking-wide">{r.name}</div>
            </Link>
          )
        ))}
      </div>
    </AppShell>
  )
}