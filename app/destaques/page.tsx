'use client'
import { useEffect, useState } from 'react'
import AppShell from '@/components/AppShell'
import PostCard from '@/components/PostCard'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'
import { Trophy } from 'lucide-react'

const CARD_SIZE = "w-full max-w- mx-auto"

export default function DestaquesPage() {
  const { user } = useAuth()
  const [postsDestaques, setPostsDestaques] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadPostsDestaques() }, [user])

  async function loadPostsDestaques() {
    setLoading(true)
    const { data } = await supabase
    .from('posts')
    .select('*, profiles(id, username, full_name, avatar_url, verificado, online, last_seen), likes(count)')
    .ilike('hashtags', '%destaques%')
    .neq('image_url', '')
    .order('created_at', { ascending: false })
    .limit(100)

    if (data) {
      let likedIds = new Set<string>()
      if (user) {
        const { data: likes } = await supabase.from('likes').select('post_id').eq('user_id', user.id)
        likedIds = new Set(((likes as any) || []).map((l: any) => l.post_id))
      }
      const enriched = data.map((p: any) => ({
      ...p,
        like_count: p.likes?.[0]?.count?? 0,
        user_liked: likedIds.has(p.id)
      }))
      setPostsDestaques(enriched)
    }
    setLoading(false)
  }

  return (
    <AppShell>
      {/* FUNDO TAPETE VERMELHO HOLLYWOOD */}
      <div className="min-h-screen -m-2 sm:-mx-0 px-2 sm:px-0 pt-2 pb-10"
        style={{
          background: `
            radial-gradient(ellipse at top, rgba(120, 10, 20, 0.35) 0%, transparent 60%),
            radial-gradient(ellipse at bottom, rgba(80, 0, 10, 0.4) 0%, transparent 70%),
            linear-gradient(180deg, #0a0002 0%, #140008 20%, #1a0005 40%, #0f0003 70%, #050000 100%)
          `,
        }}
      >
        {/* textura de tapete sutil */}
        <div
          className="pointer-events-none fixed inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(255,0,30,0.5) 2px, rgba(255,0,30,0.5) 3px)`,
          }}
        />

        <div className={CARD_SIZE}>
          {/* BARRA SUPERIOR FIXADA LARANJADA COM BRILHO VERMELHO */}
          <div className="sticky top-0 z-40 -mx-2 sm:mx-0 mb-6 border-b border-[#4a1018]/50 bg-black/80 backdrop-blur-md px-3 py-3 sm:px-0 shadow-[0_4px_30px_rgba(120,10,20,0.3)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#ff6a00] to-[#8a0a14] shadow-[0_0_15px_rgba(255,100,0,0.4)]">
                  <Trophy className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h1 className="text-sm font-bold text-white tracking-wider">Destaques do MISHH</h1>
                  <p className="text-[9px] tracking-[0.2em] text-[#ff6a00]/70 -mt-1">RED CARPET EDITION</p>
                </div>
              </div>
              <Link href="/feed" className="text-xs text-[#666] hover:text-white border border-[#2a1015] px-3 py-1 rounded-full hover:border-[#4a1018] transition">
                ← Voltar
              </Link>
            </div>
          </div>

          {loading? (
            <div className="rounded-2xl border border-[#3a1015]/30 bg-[#0a0002]/60 backdrop-blur p-10 text-center text-sm text-[#777] shadow-[0_0_40px_rgba(80,0,10,0.2)]">
              Carregando destaques...
            </div>
          ) : postsDestaques.length === 0? (
            <div className="rounded-2xl border border-dashed border-[#4a1520]/40 bg-[#0f0005]/50 backdrop-blur p-10 text-center shadow-[inset_0_0_50px_rgba(100,0,20,0.1)]">
              <p className="text-sm text-[#666]">Nenhum destaque ainda</p>
              <p className="mt-1 text-xs text-[#444]">As fotos que você postar lá no admin vão aparecer aqui no tapete vermelho</p>
            </div>
          ) : (
            postsDestaques.map((p) => (
              <div key={p.id} className="mb-6 rounded-2xl p-[1px] bg-gradient-to-b from-[#4a1018]/50 to-transparent shadow-[0_8px_40px_rgba(0,0,0,0.8),0_0_20px_rgba(120,10,20,0.15)]">
                <div className="rounded-2xl bg-black/40 backdrop-blur">
                  <PostCard post={p} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </AppShell>
  )
}