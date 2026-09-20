'use client'

import { FormEvent, useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { isUserOnline } from '@/hooks/usePresence'
import { useRouter } from 'next/navigation'
import { Heart, MessageCircle, MoreHorizontal, Send, X, Link2, UserX, Flag, ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { notifyMentionedUsers, sendPushNotification } from '@/lib/push'
import { VerifiedBadge } from './VerifiedBadge'
import OnlineBadge from './OnlineBadge'
import type { ReportReason } from './ReportModal'

type ProfileLite = { id: string; username: string; full_name: string; avatar_url: string; verificado?: boolean; online?: boolean | null; last_seen?: string | null }
type Comment = { id: string; post_id: string; user_id: string; text: string; created_at: string; profiles?: ProfileLite }
type Post = {
  id: string;
  user_id: string;
  image_url?: string | string[] | null;
  images?: string[] | string | null;
  filter?: string;
  caption?: string;
  created_at: string;
  profiles?: ProfileLite;
  like_count?: number;
  user_liked?: boolean
}
type Liker = { id: string; username: string; full_name: string; avatar_url: string }

const REPORT_REASONS: { v: ReportReason; l: string }[] = [
  { v: 'spam', l: 'É spam' },
  { v: 'nudez', l: 'Nudez' },
  { v: 'violencia', l: 'Violência' },
  { v: 'fake', l: 'Conta falsa' },
  { v: 'outro', l: 'Outro' },
]

function formatTime(d: string) {
  const now = new Date(); const at = new Date(d); const x = Math.floor((now.getTime() - at.getTime()) / 1000)
  if (x < 60) return 'agora'; if (x < 3600) return Math.floor(x / 60) + 'm'; if (x < 86400) return Math.floor(x / 3600) + 'h'; if (x < 604800) return Math.floor(x / 86400) + 'd'
  return at.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}
function unwrapProfile<T>(value: T | T[] | null | undefined): T | undefined {
  if (!value) return undefined; return Array.isArray(value)? value[0] : value
}

function MentionList({ users, onSelect }: { users: ProfileLite[]; onSelect: (user: ProfileLite) => void }) {
  return <div className="absolute bottom-full left-0 z-20 mb-2 w-full overflow-hidden rounded-xl border border-[#333] bg-[#161616] shadow-xl">
    {users.map(profile => <button key={profile.id} type="button" onClick={() => onSelect(profile)} className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-[#262626]">
      <img src={profile.avatar_url || 'https://picsum.photos/40/40?grayscale'} alt="" className="h-9 w-9 rounded-full object-cover" />
      <span className="text-sm text-white">@{profile.username}</span>
      {profile.verificado && <VerifiedBadge size={12} />}
    </button>)}
  </div>
}

export default function PostCard({ post }: { post: Post }) {
  const { user } = useAuth(); const router = useRouter(); const postProfile = unwrapProfile(post.profiles)
  const [liked, setLiked] = useState(post.user_liked?? false); const [likeCount, setLikeCount] = useState(post.like_count?? 0)
  const [showComments, setShowComments] = useState(false); const [comments, setComments] = useState<Comment[]>([])
  const [loadingComments, setLoadingComments] = useState(false); const [commentText, setCommentText] = useState(''); const [postingComment, setPostingComment] = useState(false)
  const [showMenu, setShowMenu] = useState(false); const [showReportPost, setShowReportPost] = useState(false); const [showReportComment, setShowReportComment] = useState<string | null>(null)
  const [showLikers, setShowLikers] = useState(false); const [likers, setLikers] = useState<Liker[]>([]); const [showBlock, setShowBlock] = useState(false)
  const [mentionUsers, setMentionUsers] = useState<ProfileLite[]>([]); const [showMentions, setShowMentions] = useState(false)

  // CORREÇÃO DO ERRO allImages.map - SEMPRE GARANTE ARRAY
  const allImages: string[] = (() => {
    const out: string[] = []
    // @ts-ignore
    const rawImages = (post as any).images?? post.image_url?? (post as any).media_url?? (post as any).photo_url
    if (Array.isArray(rawImages)) {
      out.push(...rawImages.filter(Boolean).flat().map((s:any)=> typeof s === 'string'? s : ''))
    } else if (typeof rawImages === 'string' && rawImages) {
      // pode vir como JSON string '["url1","url2"]'
      try {
        const parsed = JSON.parse(rawImages)
        if (Array.isArray(parsed)) out.push(...parsed.filter(Boolean))
        else out.push(rawImages)
      } catch {
        out.push(rawImages)
      }
    }
    return out.filter(Boolean) as string[]
  })()

  const [currentIndex, setCurrentIndex] = useState(0)
  const touchStartX = useRef<number | null>(null)

  const next = () => setCurrentIndex(i => Math.min(i+1, allImages.length -1))
  const prev = () => setCurrentIndex(i => Math.max(i-1, 0))

  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const diff = touchStartX.current - e.changedTouches[0].clientX
    if (Math.abs(diff) > 50) {
      if (diff > 0) next()
      else prev()
    }
    touchStartX.current = null
  }

  useEffect(() => { if (showComments && comments.length === 0) loadComments() }, [showComments])
  useEffect(() => { if (showLikers && likers.length === 0) loadLikers() }, [showLikers])

  async function loadComments() {
    setLoadingComments(true)
    const { data } = await supabase.from('comments').select('*, profiles(id, username, full_name, avatar_url, verificado)').eq('post_id', post.id).order('created_at', { ascending: true }).limit(20)
    setComments((data || []).map((row: any) => ({...row, profiles: unwrapProfile(row.profiles)}))); setLoadingComments(false)
  }
  async function loadLikers() {
    const { data } = await supabase.from('likes').select('profiles(id, username, full_name, avatar_url)').eq('post_id', post.id).order('created_at', { ascending: false }).limit(50)
    setLikers((data || []).map((row: any) => unwrapProfile(row.profiles)).filter(Boolean) as Liker[])
  }
  async function toggleLike() {
    if (!user) { toast.error('Faça login'); return }
    const was = liked; setLiked(!was); setLikeCount((p: number) => was? p-1 : p+1)
    const { error } = await supabase.rpc('toggle_like', { p_post_id: post.id })
    if (error) { setLiked(was); setLikeCount((p: number) => was? p+1 : p-1); toast.error('Erro ao curtir'); return }
    if (!was && post.user_id!== user.id) {
      void sendPushNotification({ userId: post.user_id, title: 'Nova curtida no MISHH', body: `@${postProfile?.username || 'Alguém'} curtiu seu post.`, url: `/post/${post.id}` })
    }
  }
  async function submitComment(e: FormEvent) {
    e.preventDefault(); if (!user ||!commentText.trim()) return; setPostingComment(true)
    const textToSubmit = commentText.trim()
    const { data, error } = await supabase.rpc('add_comment', { p_post_id: post.id, p_text: textToSubmit })
    const result = data as any
    if (error) {
      const { data: insData } = await supabase.from('comments').insert({ post_id: post.id, user_id: user.id, text: textToSubmit }).select('*, profiles(id, username, full_name, avatar_url, verificado)').single()
      if (insData) { setComments((p: any) => [...p, {...insData, profiles: unwrapProfile(insData.profiles)}]); setCommentText(''); toast.success('Comentário!'); void notifyMentionedUsers({ actorId: user.id, text: textToSubmit, body: `@${postProfile?.username || 'Alguém'} marcou você em um comentário.`, url: `/post/${post.id}` }) }
    } else if (result?.comment) { setComments((p: any) => [...p, {...result.comment!, profiles: result.profile}]); setCommentText(''); toast.success('Comentário!'); void notifyMentionedUsers({ actorId: user.id, text: textToSubmit, body: `@${postProfile?.username || 'Alguém'} marcou você em um comentário.`, url: `/post/${post.id}` }) }
    setPostingComment(false)
  }
  async function searchMentionUsers(query: string) {
    if (!user) return
    const { data: follows } = await supabase.from('follows').select('following_id').eq('follower_id', user.id).limit(50)
    const ids = (follows || []).map((follow: any) => follow.following_id)
    if (!ids.length) { setMentionUsers([]); return }
    const cleanQuery = query.trim()
    let request = supabase.from('profiles').select('id, username, full_name, avatar_url, verificado').in('id', ids).limit(6)
    if (cleanQuery) request = request.ilike('username', `%${cleanQuery}%`)
    const { data } = await request
    setMentionUsers((data || []) as ProfileLite[])
  }
  function handleCommentChange(value: string) {
    setCommentText(value)
    const match = value.match(/@(\w*)$/)
    if (!match) { setShowMentions(false); return }
    setShowMentions(true)
    searchMentionUsers(match[1])
  }
  function selectMention(profile: ProfileLite) {
    setCommentText(commentText.replace(/@\w*$/, `@${profile.username} `)); setShowMentions(false)
  }
  function copyLink() { navigator.clipboard.writeText(window.location.origin + '/post/' + post.id); toast.success('Link copiado!'); setShowMenu(false) }
  async function blockUser() { if (!user) return; await supabase.from('blocks').insert({ blocker_id: user.id, blocked_id: post.user_id }); toast.success('Bloqueado'); setShowBlock(false); setShowMenu(false) }
  async function reportPost(reason: ReportReason) { if (!user) return; await supabase.from('reports').insert({ reporter_id: user.id, reported_user_id: post.user_id, reported_post_id: post.id, reason, details: '' }); toast.success('Reportado'); setShowReportPost(false); setShowMenu(false) }
  async function reportComment(id: string, reason: ReportReason, uid: string) { if (!user) return; await supabase.from('reports').insert({ reporter_id: user.id, reported_user_id: uid, reported_post_id: post.id, reported_comment_id: id, reason, details: '' }); toast.success('Reportado'); setShowReportComment(null) }

  const showOnline = isUserOnline(postProfile) &&!postProfile?.verificado
  const isOldFilteredPost = post.filter && post.filter!== 'normal' && allImages.length<=1

  return (
    <>
      <article className="bg-[#0a0a0a] rounded-2xl mb-4 overflow-hidden mx-auto w-full max-w- border border-[#262626]">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => router.push('/user/' + post.user_id)} className="flex items-center gap-2.5">
            <div className="relative">
              <img src={postProfile?.avatar_url || 'https://picsum.photos/100/100?grayscale'} alt="" className="w-9 h-9 rounded-full object-cover bg-[#262626]" />
              {postProfile?.verificado && <div className="absolute -bottom-1 -right-1"><VerifiedBadge size={15} /></div>}
              {showOnline && <OnlineBadge size={10} className="-bottom-0.5 -right-0.5" />}
            </div>
            <span className="text-sm font-medium text-white">@{postProfile?.username || 'usuário'}</span>
          </button>
          <div className="relative">
            <button onClick={() => setShowMenu(!showMenu)} className="p-2 text-[#a8a8a8] hover:text-white"><MoreHorizontal className="w-5 h-5" /></button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 bg-[#262626] rounded-xl py-1 min-w- z-10 border border-[#3a3a3a] shadow-xl">
                <button onClick={copyLink} className="w-full px-4 py-2.5 flex items-center gap-3 text-left text-sm text-[#a8a8a8] hover:text-white"><Link2 className="w-4 h-4" /> Copiar link</button>
                {user && user.id!== post.user_id && (<><button onClick={() => { setShowReportPost(true); setShowMenu(false) }} className="w-full px-4 py-2.5 flex gap-3 text-left text-sm text-[#a8a8a8] hover:text-white"><Flag className="w-4 h-4" /> Denunciar</button><button onClick={() => { setShowBlock(true); setShowMenu(false) }} className="w-full px-4 py-2.5 flex gap-3 text-left text-sm text-red-400 hover:bg-[#333]"><UserX className="w-4 h-4" /> Bloquear</button></>)}
                {user && user.id === post.user_id && (<button onClick={async () => { if (!confirm('Deletar?')) return; await supabase.from('posts').delete().eq('id', post.id); window.location.reload() }} className="w-full px-4 py-2.5 flex gap-3 text-left text-sm text-red-500"><X className="w-4 h-4" /> Deletar</button>)}
              </div>
            )}
          </div>
        </div>

        {allImages.length > 0? (
          <div className="relative w-full aspect-square bg-[#1a1a1a] overflow-hidden group" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
            <div className="flex h-full transition-transform duration-300 ease-out" style={{ transform: `translateX(-${currentIndex * 100}%)` }}>
              {allImages.map((url, idx) => (
                <div key={idx} className="w-full h-full shrink-0">
                  <img
                    src={url}
                    alt=""
                    className="w-full h-full object-cover select-none"
                    style={isOldFilteredPost? { filter: post.filter } : {}}
                    onDoubleClick={toggleLike}
                    draggable={false}
                  />
                </div>
              ))}
            </div>

            {allImages.length > 1 && (
              <>
                {currentIndex > 0 && (
                  <button onClick={prev} className="absolute left-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/60 backdrop-blur grid place-items-center text-white opacity-0 group-hover:opacity-100 transition">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                )}
                {currentIndex < allImages.length -1 && (
                  <button onClick={next} className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/60 backdrop-blur grid place-items-center text-white opacity-0 group-hover:opacity-100 transition">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
                <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur text- text-white font-medium">
                  {currentIndex + 1}/{allImages.length}
                </div>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {allImages.map((_, i) => (
                    <div key={i} className={`h-1.5 rounded-full transition-all ${i===currentIndex? 'w-4 bg-white' : 'w-1.5 bg-white/40'}`} />
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="px-4 py-4 bg-[#0f0f0f] border-y border-[#1f1f1f]">
            <p className="text- leading- text-white whitespace-pre-wrap break-words font-light">{post.caption}</p>
          </div>
        )}

        <div className="px-4 py-3">
          <div className="flex items-center gap-1">
            <button onClick={toggleLike} className={'p-2 -ml-2 active:scale-90 transition ' + (liked? 'text-red-500' : 'text-white')}><Heart className={'w-6 h-6 ' + (liked? 'fill-current' : '')} /></button>
            <button onClick={() => setShowComments(!showComments)} className="p-2 text-white"><MessageCircle className="w-6 h-6" /></button>
          </div>
          {likeCount > 0? (<button onClick={() => setShowLikers(true)} className="mt-1 text-sm font-medium text-white">{likeCount} curtidas</button>) : (<p className="mt-1 text-sm text-[#8a8a8a]">Seja o primeiro a curtir</p>)}
          {allImages.length > 0 && post.caption && (<p className="mt-2 text-sm text-white"><span className="font-medium mr-2">@{postProfile?.username}</span><span className="font-light">{post.caption}</span></p>)}
          <p className="mt-2 text- text-[#8a8a8a] uppercase tracking-wider">{formatTime(post.created_at)}</p>
        </div>

        {user && (
          <form onSubmit={submitComment} className="flex items-center gap-2 px-4 pb-3 border-t border-[#1f1f1f] pt-3">
            <div className="relative flex-1">
              <input type="text" value={commentText} onChange={(e) => handleCommentChange(e.target.value)} placeholder="Adicione um comentário..." maxLength={500} className="w-full bg-transparent text-sm text-white placeholder:text-[#8a8a8a] font-light outline-none" />
              {showMentions && mentionUsers.length > 0 && <MentionList users={mentionUsers} onSelect={selectMention} />}
            </div>
            <button type="submit" disabled={!commentText.trim() || postingComment} className="text-[#a8a8a8] disabled:opacity-40"><Send className="w-5 h-5" /></button>
          </form>
        )}
      </article>

      {showLikers && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setShowLikers(false)}>
          <div className="bg-[#0a0a0a] w-full sm:w- rounded-t-3xl sm:rounded-2xl flex flex-col max-h- border border-[#262626]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#262626]"><div className="w-8" /><h3 className="font-medium text-white">Curtido por</h3><button onClick={() => setShowLikers(false)}><X className="w-6 h-6 text-white" /></button></div>
            <div className="flex-1 overflow-y-auto p-3">{likers.map(l => (<button key={l.id} onClick={() => { setShowLikers(false); router.push('/user/' + l.id) }} className="flex items-center gap-3 w-full p-2 hover:bg-[#1a1a1a] rounded-xl"><img src={l.avatar_url} className="w-11 h-11 rounded-full" alt="" /><div className="text-left"><p className="text-sm text-white">@{l.username}</p><p className="text-xs text-[#8a8a8a]">{l.full_name}</p></div></button>))}</div>
          </div>
        </div>
      )}

      {showComments && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setShowComments(false)}>
          <div className="bg-[#0a0a0a] w-full sm:w- rounded-t-3xl sm:rounded-2xl flex flex-col max-h- border border-[#262626]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#262626]"><button onClick={() => setShowComments(false)}><X className="w-6 h-6 text-white" /></button><h3 className="font-medium text-white">Comentários</h3><div className="w-8" /></div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {loadingComments? <p className="text-sm text-[#8a8a8a]">Carregando...</p> : comments.map(c => (<div key={c.id} className="flex gap-3 group"><div className="relative shrink-0"><img src={c.profiles?.avatar_url} className="w-8 h-8 rounded-full" alt="" />{c.profiles?.verificado && <div className="absolute -bottom-1 -right-1"><VerifiedBadge size={13} /></div>}</div><div className="flex-1"><p className="text-sm text-white"><span className="font-medium">@{c.profiles?.username}</span> <span className="font-light ml-2">{c.text}</span></p><p className="text- text-[#8a8a8a] mt-1">{formatTime(c.created_at)}</p></div><button onClick={() => setShowReportComment(c.id)} className="opacity-0 group-hover:opacity-100 p-1"><Flag className="w-3 h-3 text-[#8a8a8a]" /></button></div>))}
            </div>
            {user && (<form onSubmit={submitComment} className="flex gap-3 p-4 border-t border-[#262626]"><div className="relative flex-1"><input value={commentText} onChange={e => handleCommentChange(e.target.value)} placeholder="Comentar..." className="w-full bg-transparent text-sm text-white outline-none" />{showMentions && mentionUsers.length > 0 && <MentionList users={mentionUsers} onSelect={selectMention} />}</div><button type="submit" disabled={postingComment} className="text-sm text-white disabled:opacity-50">Postar</button></form>)}
          </div>
        </div>
      )}

      {showReportPost && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"><div className="bg-[#0a0a0a] w-full max-w-sm rounded-2xl border border-[#262626] p-2">{REPORT_REASONS.map(r => (<button key={r.v} onClick={() => reportPost(r.v)} className="w-full p-4 text-left text-white hover:bg-[#1a1a1a] rounded-xl">{r.l}</button>))}<button onClick={() => setShowReportPost(false)} className="w-full p-3 text-[#8a8a8a]">Cancelar</button></div></div>)}
      {showBlock && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"><div className="bg-[#0a0a0a] w-full max-w-sm rounded-2xl p-5 border border-[#262626]"><h3 className="text-white font-medium">Bloquear @{postProfile?.username}?</h3><button onClick={blockUser} className="w-full mt-4 p-3 bg-red-500 rounded-xl text-white">Bloquear</button><button onClick={() => setShowBlock(false)} className="w-full mt-2 p-3 text-[#8a8a8a]">Cancelar</button></div></div>)}
      {showReportComment && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"><div className="bg-[#0a0a0a] w-full max-w-sm rounded-2xl border border-[#262626] p-2">{REPORT_REASONS.map(r => (<button key={r.v} onClick={() => { const c = comments.find(x=>x.id===showReportComment); if(c) reportComment(showReportComment, r.v, c.user_id) }} className="w-full p-4 text-left text-white hover:bg-[#1a1a1a] rounded-xl">{r.l}</button>))}<button onClick={() => setShowReportComment(null)} className="w-full p-3 text-[#8a8a8a]">Cancelar</button></div></div>)}
    </>
  )
}