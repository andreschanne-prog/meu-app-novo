'use client'

import { useEffect, useState } from 'react'
import AppShell from '@/components/AppShell'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { timeAgo, isAdmin } from '@/lib/helpers'

type R = {
  id: string
  reporter_id: string
  reported_user_id: string
  reported_post_id: string | null
  reported_comment_id: string | null
  reason: string
  status: string
  created_at: string
  reporter?: { username: string; avatar_url: string } | null
  reported_user?: { username: string; avatar_url: string } | null
  reported_post?: { image_url: string } | null
  reported_comment?: { text: string } | null
}

const RL: Record<string, string> = {
  spam: 'Spam',
  nudez: 'Nudez',
  violencia: 'Violência',
  fake: 'Perfil Falso',
  assedio: 'Assédio',
  outro: 'Outro',
}

const RE: Record<string, string> = {
  spam: '🚫',
  nudez: '🔞',
  violencia: '⚠️',
  fake: '🎭',
  assedio: '😠',
  outro: '💬',
}

const NIL_UUID = '00000000-0000-0000-0000-000000000000'

export default function AdminReportsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [allowed, setAllowed] = useState<boolean | null>(null)
  const [reports, setReports] = useState<R[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('pending')

  useEffect(() => {
    if (!user) return
    isAdmin(user.id).then((ok) => {
      setAllowed(ok)
      if (!ok) router.replace('/feed')
    })
  }, [user, router])

  useEffect(() => {
    if (allowed) loadReports()
  }, [allowed])

  async function loadReports() {
    setLoading(true)
    const { data, error } = await supabase
      .from('reports')
      .select('id, reporter_id, reported_user_id, reported_post_id, reported_comment_id, reason, status, created_at')
      .order('created_at', { ascending: false })
      .limit(200)

    if (error) {
      toast.error('Erro ao carregar denúncias.')
      setLoading(false)
      return
    }

    const uIds = Array.from(new Set((data || []).flatMap((r: any) => [r.reporter_id, r.reported_user_id]).filter(Boolean)))
    const pIds = Array.from(new Set((data || []).map((r: any) => r.reported_post_id).filter(Boolean) as string[]))
    const cIds = Array.from(new Set((data || []).map((r: any) => r.reported_comment_id).filter(Boolean) as string[]))

    const [{ data: pData }, { data: poData }, { data: coData }] = await Promise.all([
      supabase.from('profiles').select('id, username, avatar_url').in('id', uIds.length ? uIds : [NIL_UUID]),
      supabase.from('posts').select('id, image_url').in('id', pIds.length ? pIds : [NIL_UUID]),
      supabase.from('comments').select('id, text').in('id', cIds.length ? cIds : [NIL_UUID]),
    ])

    const pm: Record<string, any> = {}
    ;(pData || []).forEach((p: any) => { pm[p.id] = p })
    const pom: Record<string, any> = {}
    ;(poData || []).forEach((p: any) => { pom[p.id] = p })
    const com: Record<string, any> = {}
    ;(coData || []).forEach((c: any) => { com[c.id] = c })

    setReports(
      (data || []).map((r: any) => ({
        ...r,
        reporter: pm[r.reporter_id] || null,
        reported_user: pm[r.reported_user_id] || null,
        reported_post: r.reported_post_id ? pom[r.reported_post_id] || null : null,
        reported_comment: r.reported_comment_id ? com[r.reported_comment_id] || null : null,
      }))
    )
    setLoading(false)
  }

  async function setStatus(id: string, s: string) {
    const { error } = await supabase.from('reports').update({ status: s }).eq('id', id)
    if (error) toast.error('Erro ao atualizar.')
    else {
      toast.success('Atualizado!')
      loadReports()
    }
  }

  async function suspendUser(id: string) {
    if (!confirm('Suspender usuário?')) return
    const { error } = await supabase.from('profiles').update({ is_suspended: true }).eq('id', id)
    if (error) toast.error('Erro ao suspender.')
    else {
      toast.success('Suspenso!')
      loadReports()
    }
  }

  async function deletePost(id: string) {
    if (!confirm('Deletar post?')) return
    const { error } = await supabase.from('posts').delete().eq('id', id)
    if (error) toast.error('Erro ao deletar post.')
    else {
      toast.success('Deletado!')
      loadReports()
    }
  }

  async function deleteComment(id: string) {
    if (!confirm('Deletar comentário?')) return
    const { error } = await supabase.from('comments').delete().eq('id', id)
    if (error) toast.error('Erro ao deletar comentário.')
    else {
      toast.success('Deletado!')
      loadReports()
    }
  }

  const filtered = filter === 'all' ? reports : reports.filter((r) => r.status === filter)
  const counts = {
    all: reports.length,
    pending: reports.filter((r) => r.status === 'pending').length,
    reviewed: reports.filter((r) => r.status === 'reviewed').length,
    dismissed: reports.filter((r) => r.status === 'dismissed').length,
    action_taken: reports.filter((r) => r.status === 'action_taken').length,
  }

  return (
    <AppShell>
      <div className="mb-4">
        <h1 className="text-xl font-light text-white tracking-wide">📋 Denúncias</h1>
        <p className="text-xs text-[#a8a8a8] font-light mt-1">Revise e tome ações.</p>
      </div>

      <div className="flex gap-1.5 mb-4 overflow-x-auto no-scrollbar pb-1">
        {(['all', 'pending', 'reviewed', 'dismissed', 'action_taken'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-[10px] font-light whitespace-nowrap ${
              filter === f ? 'bg-white text-black' : 'bg-[#262626] text-[#a8a8a8] hover:bg-[#333]'
            }`}
          >
            {f === 'all'
              ? `Todos (${counts.all})`
              : f === 'pending'
              ? `Pendente (${counts.pending})`
              : f === 'reviewed'
              ? `Análise (${counts.reviewed})`
              : f === 'dismissed'
              ? `Descartado (${counts.dismissed})`
              : `Resolvido (${counts.action_taken})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center text-[#a8a8a8] py-10 text-sm font-light">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-[#a8a8a8] py-10 text-sm font-light">Nenhuma denúncia.</div>
      ) : (
        <div className="space-y-3 pb-8">
          {filtered.map((r) => (
            <div
              key={r.id}
              className={`bg-[#0a0a0a] rounded-2xl p-4 border ${
                r.status === 'pending'
                  ? 'border-yellow-500/30'
                  : r.status === 'action_taken'
                  ? 'border-green-500/30'
                  : 'border-[#262626]'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{RE[r.reason] || '📋'}</span>
                  <span className="text-sm font-medium text-white">{RL[r.reason] || r.reason}</span>
                  {r.reported_comment_id && (
                    <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">Comentário</span>
                  )}
                  {r.reported_post_id && !r.reported_comment_id && (
                    <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">Post</span>
                  )}
                  {!r.reported_post_id && !r.reported_comment_id && (
                    <span className="text-[10px] bg-[#262626] text-[#a8a8a8] px-2 py-0.5 rounded-full">Perfil</span>
                  )}
                </div>
                <span className="text-[10px] text-[#8a8a8a] font-light">{timeAgo(r.created_at)}</span>
              </div>

              {r.reported_post && (
                <div className="mb-3 bg-[#1a1a1a] rounded-xl p-2 flex items-center gap-2">
                  <img src={r.reported_post.image_url} alt="" className="w-12 h-12 rounded-lg object-cover" />
                  <span className="text-xs text-[#a8a8a8]">Post reportado</span>
                </div>
              )}

              {r.reported_comment && (
                <div className="mb-3 bg-[#1a1a1a] rounded-xl p-3 border border-[#333]">
                  <span className="text-[10px] text-red-400 uppercase">Comentário:</span>
                  <p className="text-sm text-white font-light">"{r.reported_comment.text}"</p>
                </div>
              )}

              <div className="flex gap-2 mb-3">
                <div className="flex-1">
                  <span className="text-[10px] text-[#8a8a8a] uppercase">De:</span>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-6 h-6 rounded-full bg-[#262626] overflow-hidden">
                      {r.reporter?.avatar_url && (
                        <img src={r.reporter.avatar_url} className="w-full h-full object-cover rounded-full" alt="" />
                      )}
                    </div>
                    <span className="text-sm text-white">@{r.reporter?.username || '(removido)'}</span>
                  </div>
                </div>
                <div className="flex-1">
                  <span className="text-[10px] text-[#8a8a8a] uppercase">Para:</span>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-6 h-6 rounded-full bg-[#262626] overflow-hidden">
                      {r.reported_user?.avatar_url && (
                        <img src={r.reported_user.avatar_url} className="w-full h-full object-cover rounded-full" alt="" />
                      )}
                    </div>
                    <span className="text-sm text-white">@{r.reported_user?.username || '(removido)'}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 flex-wrap">
                {r.status === 'pending' && (
                  <button onClick={() => setStatus(r.id, 'reviewed')} className="px-3 py-1.5 rounded-full text-[10px] bg-[#262626] text-blue-400 hover:bg-[#333]">
                    Análise
                  </button>
                )}
                {r.status !== 'dismissed' && (
                  <button onClick={() => setStatus(r.id, 'dismissed')} className="px-3 py-1.5 rounded-full text-[10px] bg-[#262626] text-[#a8a8a8] hover:bg-[#333]">
                    Descartar
                  </button>
                )}
                {r.status !== 'action_taken' && r.reported_user && (
                  <button onClick={() => suspendUser(r.reported_user_id)} className="px-3 py-1.5 rounded-full text-[10px] bg-[#262626] text-yellow-400 hover:bg-[#333]">
                    🚫 Suspender
                  </button>
                )}
                {r.reported_post_id && (
                  <button onClick={() => deletePost(r.reported_post_id!)} className="px-3 py-1.5 rounded-full text-[10px] bg-[#262626] text-red-500 hover:bg-[#333]">
                    🗑️ Post
                  </button>
                )}
                {r.reported_comment_id && (
                  <button onClick={() => deleteComment(r.reported_comment_id!)} className="px-3 py-1.5 rounded-full text-[10px] bg-red-500/20 text-red-400 hover:bg-red-500/30">
                    🗑️ Comentário
                  </button>
                )}
                {r.status !== 'action_taken' && (
                  <button onClick={() => setStatus(r.id, 'action_taken')} className="px-3 py-1.5 rounded-full text-[10px] bg-[#262626] text-green-400 ml-auto hover:bg-[#333]">
                    ✓ Resolver
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  )
}