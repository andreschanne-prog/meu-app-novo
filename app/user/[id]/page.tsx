'use client'
import { useEffect, useState, useRef } from 'react'
import AppShell from '@/components/AppShell'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import toast from 'react-hot-toast'
import { Heart, MoreHorizontal, MapPin, Lock, Grid3x3, Clapperboard, Repeat2, UserSquare2, X, Bell, ArrowLeft, UserPlus, Link2, BadgeCheck } from 'lucide-react'
import ReportModal from '@/components/ReportModal'
import { VerifiedBadge } from '@/components/VerifiedBadge'
import OnlineBadge from '@/components/OnlineBadge'
import { isUserOnline } from '@/hooks/usePresence'
import PostCard from '@/components/PostCard'

type FollowUser = { id: string; username: string; full_name: string; avatar_url: string; verificado?: boolean }

const RELATIONSHIP_LABELS: Record<string, string> = {
  solteiro: 'Solteiro(a)', relacionamento: 'Em um relacionamento', noivo: 'Noivo(a)', casado: 'Casado(a)',
  uniao_estavel: 'Em união estável', complicado: 'É complicado', aberto: 'Em um relacionamento aberto',
  separado: 'Separado(a)', divorciado: 'Divorciado(a)', viuvo: 'Viúvo(a)',
}

export default function UserPage() {
  const { id } = useParams<{ id: string }>()
  const { user: me } = useAuth()
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [posts, setPosts] = useState<any[]>([])
  const [totalLikes, setTotalLikes] = useState(0)
  const [following, setFollowing] = useState(false)
  const [requested, setRequested] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [postAberto, setPostAberto] = useState<any>(null)
  const [counts, setCounts] = useState({ followers: 0, following: 0, posts: 0 })
  const [activeTab, setActiveTab] = useState<'fotos' | 'textos'>('fotos')
  const [showFollowers, setShowFollowers] = useState(false)
  const [showFollowing, setShowFollowing] = useState(false)
  const [followersList, setFollowersList] = useState<FollowUser[]>([])
  const [followingList, setFollowingList] = useState<FollowUser[]>([])
  const [loadingList, setLoadingList] = useState(false)
  const [searchFollow, setSearchFollow] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => { if (menuRef.current &&!menuRef.current.contains(e.target as Node)) setMenuOpen(false) }
    if (menuOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  async function fetchCounts(targetId: string) {
    const { data: cts } = await supabase.rpc('get_follow_counts', { p_target_id: targetId })
    if (cts?.[0]?.followers_count!= null) {
      setCounts(c => ({...c, followers: Number(cts[0].followers_count), following: Number(cts[0].following_count)}))
    } else {
      const [{ count: f1 }, { count: f2 }] = await Promise.all([
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', targetId),
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', targetId),
      ])
      setCounts(c => ({...c, followers: f1 || 0, following: f2 || 0}))
    }
  }

  useEffect(() => {
    if (!id) return
    const loadData = async () => {
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', id).single()
      setProfile(prof)
      await fetchCounts(id as string)
      const { data: ps } = await supabase.from('posts').select('*, likes(count)').eq('user_id', id).order('created_at', { ascending: false })
      const mapped = (ps || []).map((p: any) => ({...p, profiles: prof, like_count: p.likes?.[0]?.count?? 0 }))
      setPosts(mapped)
      setCounts(c => ({...c, posts: mapped.filter((p:any)=>p.image_url||p.media_url||p.photo_url).length }))
      const { data: tl } = await supabase.rpc('get_total_likes_for_user', { p_user_id: id })
      setTotalLikes(Number(tl || 0))
      if (me) {
        const { data: f } = await supabase.from('follows').select('*').eq('follower_id', me.id).eq('following_id', id).maybeSingle()
        setFollowing(!!f)
        const { data: r } = await supabase.from('follow_requests').select('*').eq('requester_id', me.id).eq('target_id', id).eq('status','pending').maybeSingle()
        setRequested(!!r)
      }
    }
    loadData()
  }, [id, me])

  async function loadFollowers() {
    setLoadingList(true)
    const { data: rel } = await supabase.from('follows').select('follower_id').eq('following_id', id)
    const ids = rel?.map((r: any) => r.follower_id) || []
    if (!ids.length) { setFollowersList([]); setLoadingList(false); return }
    const { data } = await supabase.from('profiles').select('id, username, full_name, avatar_url, verificado').in('id', ids)
    setFollowersList(data as any || []); setLoadingList(false)
  }
  async function loadFollowing() {
    setLoadingList(true)
    const { data: rel } = await supabase.from('follows').select('following_id').eq('follower_id', id)
    const ids = rel?.map((r: any) => r.following_id) || []
    if (!ids.length) { setFollowingList([]); setLoadingList(false); return }
    const { data } = await supabase.from('profiles').select('id, username, full_name, avatar_url, verificado').in('id', ids)
    setFollowingList(data as any || []); setLoadingList(false)
  }

  async function follow() {
    if (!me) return toast.error('Faça login.')
    if (profile.is_private) {
      await supabase.from('follow_requests').insert({ requester_id: me.id, target_id: id, status: 'pending' })
      setRequested(true); toast.success('Solicitação enviada.')
    } else {
      await supabase.from('follows').insert({ follower_id: me.id, following_id: id })
      setFollowing(true); setCounts(c => ({...c, followers: c.followers + 1 })); toast.success('Seguindo!')
    }
  }

  async function startChat() {
    if (!me || me.id === id) return
    const { data: myConvs } = await supabase.from('conversation_participants').select('conversation_id').eq('user_id', me.id)
    let convId = null
    if (myConvs?.length) {
      const ids = myConvs.map(e => e.conversation_id)
      const { data: shared } = await supabase.from('conversation_participants').select('conversation_id').eq('user_id', id).in('conversation_id', ids).limit(1)
      convId = shared?.[0]?.conversation_id
    }
    if (!convId) {
      const { data: c } = await supabase.from('conversations').insert({}).select('id').single()
      convId = c!.id
      await supabase.from('conversation_participants').insert([{ conversation_id: convId, user_id: me.id }, { conversation_id: convId, user_id: id }])
    }
    router.push(`/chat?id=${convId}`)
  }

  if (!profile) return <AppShell><div className="py-10 text-center text-[#a8a8a8]">Carregando...</div></AppShell>

  const isOwnProfile = me?.id === id
  const restrictedAndHidden = profile.is_private &&!isOwnProfile &&!following
  const canSeeInfo =!profile.is_private || isOwnProfile || following
  const locationText = [profile.city, profile.state, profile.country].filter(Boolean).join(', ')
  const postsComFoto = posts.filter((p: any) => p.image_url || p.media_url || p.photo_url)
  const filteredFollowers = followersList.filter(u => u.username.toLowerCase().includes(searchFollow.toLowerCase()))
  const filteredFollowing = followingList.filter(u => u.username.toLowerCase().includes(searchFollow.toLowerCase()))

  return (
    <AppShell>
      <div className="mx-auto max-w- min-h-screen bg-black text-white">
        {/* HEADER IGUAL PRINT */}
        <div className="flex items-center justify-between px-4 h- border-b border-[#262626]/0">
          <div className="flex items-center gap-3">
            <button onClick={()=>router.back()} className="p-1"><ArrowLeft className="w-6 h-6" /></button>
            <h1 className="text- font-bold flex items-center gap-1">{profile.username} {profile.verificado && <BadgeCheck className="w-5 h-5 text-[#0095f6] fill-[#0095f6]" />}</h1>
          </div>
          <div className="flex items-center gap-4">
            <Bell className="w-6 h-6" />
            <div ref={menuRef} className="relative">
              <button onClick={()=>setMenuOpen(v=>!v)} className="p-1"><MoreHorizontal className="w-6 h-6" /></button>
              {menuOpen && <div className="absolute right-0 mt-2 w-44 bg-[#1a1a1a] border border-[#262626] rounded-xl overflow-hidden z-10"><button onClick={()=>{setMenuOpen(false);setReportOpen(true)}} className="w-full text-left px-4 py-3 text-sm hover:bg-[#262626]">Denunciar</button></div>}
            </div>
          </div>
        </div>

        {/* AVATAR + STATS IGUAL PRINT */}
        <div className="px-4 pt-3">
          <div className="flex items-center gap-5">
            {/* ANEL DEGRADE IGUAL INSTAGRAM */}
            <div className="h-[130px] w-[130px] rounded-full p- bg-gradient-to-tr from-[#feda75] via-[#fa7e1e] via-[#d62976] to-[#962fbf]">
              <div className="h-full w-full rounded-full bg-black p-">
                <div className="h-full w-full rounded-full overflow-hidden bg-[#1d1d1d]">
                  {profile.avatar_url? <img src={profile.avatar_url} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-2xl">{profile.username?.[0]?.toUpperCase()}</div>}
                </div>
              </div>
            </div>

            <div className="flex flex-1 justify-between text-center">
              <div className="flex flex-col"><span className="text- font-bold leading-none">{counts.posts}</span><span className="text- mt-1 text-[#a8a8a8]">posts</span></div>
              <button onClick={async()=>{ setShowFollowers(true); await loadFollowers()}} className="flex flex-col"><span className="text- font-bold leading-none">{counts.followers>1000? `${(counts.followers/1000).toFixed(0)} mil` : counts.followers}</span><span className="text- mt-1 text-[#a8a8a8]">seguidores</span></button>
              <button onClick={async()=>{ setShowFollowing(true); await loadFollowing()}} className="flex flex-col"><span className="text- font-bold leading-none">{counts.following>1000? `${(counts.following/1000).toFixed(1).replace('.',',')} mil` : counts.following}</span><span className="text- mt-1 text-[#a8a8a8]">seguindo</span></button>
            </div>
          </div>

          {/* NOME + BIO */}
          <div className="mt-3">
            <h2 className="text- font-bold">{profile.full_name}</h2>
            {canSeeInfo && profile.bio && <p className="text- leading- mt-1 whitespace-pre-wrap">{profile.bio}</p>}
            {canSeeInfo && locationText && <p className="text- mt-1 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />Mora em {locationText}</p>}
            {canSeeInfo && profile.relationship_status && <p className="text- mt-1">{RELATIONSHIP_LABELS[profile.relationship_status]}</p>}
          </div>

          {/* LINK TIPO THREADS PILULA */}
          <div className="mt-3">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#1a1a1a] px-3 py-1.5 text-">
              <span className="font-bold">@</span>{profile.username}
            </div>
          </div>

          {/* CONTADOR DE LIKE SEMPRE LARANJADO DESTACADO */}
          <div className="mt-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#ff6a00] px-3.5 py-1.5 shadow-[0_0_15px_rgba(255,106,0,0.3)]">
              <div className="h-5 w-5 rounded-full bg-white/20 grid place-items-center">
                <Heart className="w-3 h-3 text-white fill-white" />
              </div>
              <span className="text- font-bold text-white tracking-wide">
                {restrictedAndHidden? '—' : `${totalLikes.toLocaleString('pt-BR')} curtidas totais`}
              </span>
            </div>
          </div>

          {/* BOTÕES SEGUINDO / MENSAGEM IGUAL PRINT */}
          {!isOwnProfile && (
            <div className="mt-4 flex gap-2">
              {!following &&!requested && <button onClick={follow} className="flex-1 h- rounded-lg bg-[#0095f6] text- font-bold">Seguir</button>}
              {following && <button className="flex-1 h- rounded-lg bg-[#262626] text- font-bold flex items-center justify-center gap-1">Seguindo <span className="text-">▼</span></button>}
              {requested && <button className="flex-1 h- rounded-lg bg-[#262626] text- font-bold">Solicitado</button>}
              <button onClick={startChat} className="flex-1 h- rounded-lg bg-[#262626] text- font-bold">Mensagem</button>
              <button className="w- h- rounded-lg bg-[#262626] grid place-items-center"><UserPlus className="w-4 h-4" /></button>
            </div>
          )}
        </div>

        {/* TABS IGUAL PRINT */}
        <div className="mt-5 border-t border-[#262626] flex">
          <button onClick={()=>setActiveTab('fotos')} className={`flex-1 h- grid place-items-center border-t ${activeTab==='fotos'? 'border-white text-white' : 'border-transparent text-[#666]'}`}><Grid3x3 className="w-6 h-6" /></button>
          <button className="flex-1 h- grid place-items-center border-t border-transparent text-[#666]"><Clapperboard className="w-5 h-5" /></button>
          <button className="flex-1 h- grid place-items-center border-t border-transparent text-[#666]"><Repeat2 className="w-6 h-6" /></button>
          <button className="flex-1 h- grid place-items-center border-t border-transparent text-[#666]"><UserSquare2 className="w-6 h-6" /></button>
        </div>

        {/* GRID */}
        <div>
          {restrictedAndHidden? <div className="py-16 text-center text-sm text-[#a8a8a8]"><Lock className="w-8 h-8 mx-auto mb-2" />Conta privada</div> :
            postsComFoto.length===0? <div className="py-16 text-center text-sm text-[#a8a8a8]">Nenhuma foto</div> :
            <div className="grid grid-cols-3 gap-">
              {postsComFoto.map((p:any)=><button key={p.id} onClick={()=>setPostAberto(p)} className="relative aspect-square bg-[#111] overflow-hidden"><img src={p.image_url||p.media_url||p.photo_url} className="h-full w-full object-cover" /><div className="absolute top-1.5 right-1.5"><Clapperboard className="w-4 h-4 text-white drop-shadow" /></div></button>)}
            </div>
          }
        </div>
      </div>

      {showFollowers && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/80 p-0 sm:p-4" onClick={()=>setShowFollowers(false)}>
          <div className="w-full sm:max-w-md bg-[#111] rounded-t-xl sm:rounded-xl border border-[#262626] max-h- overflow-hidden" onClick={e=>e.stopPropagation()}>
            <div className="p-4 border-b border-[#262626] flex justify-between"><h3 className="font-bold">Seguidores</h3><button onClick={()=>setShowFollowers(false)}><X className="w-5 h-5" /></button></div>
            <div className="overflow-y-auto p-2">{followersList.map((u:any)=><div key={u.id} onClick={()=>{setShowFollowers(false); router.push(`/user/${u.id}`)}} className="flex items-center gap-3 p-3 hover:bg-[#1a1a1a] rounded-lg cursor-pointer"><img src={u.avatar_url} className="w-10 h-10 rounded-full" /><div><p className="text-sm font-bold">@{u.username}</p><p className="text-xs text-[#a8a8a8]">{u.full_name}</p></div></div>)}</div>
          </div>
        </div>
      )}
      {showFollowing && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/80 p-0 sm:p-4" onClick={()=>setShowFollowing(false)}>
          <div className="w-full sm:max-w-md bg-[#111] rounded-t-xl sm:rounded-xl border border-[#262626] max-h- overflow-hidden" onClick={e=>e.stopPropagation()}>
            <div className="p-4 border-b border-[#262626] flex justify-between"><h3 className="font-bold">Seguindo</h3><button onClick={()=>setShowFollowing(false)}><X className="w-5 h-5" /></button></div>
            <div className="overflow-y-auto p-2">{followingList.map((u:any)=><div key={u.id} onClick={()=>{setShowFollowing(false); router.push(`/user/${u.id}`)}} className="flex items-center gap-3 p-3 hover:bg-[#1a1a1a] rounded-lg cursor-pointer"><img src={u.avatar_url} className="w-10 h-10 rounded-full" /><div><p className="text-sm font-bold">@{u.username}</p><p className="text-xs text-[#a8a8a8]">{u.full_name}</p></div></div>)}</div>
          </div>
        </div>
      )}

      {postAberto && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/95 p-4" onClick={() => setPostAberto(null)}>
          <button className="absolute right-4 top-4 p-2 bg-black/50 rounded-full"><X className="h-6 w-6 text-white" /></button>
          <div className="w-full max-w- max-h- overflow-y-auto rounded-xl" onClick={e=>e.stopPropagation()}><PostCard post={postAberto} /></div>
        </div>
      )}
      <ReportModal open={reportOpen} onClose={()=>setReportOpen(false)} reportedUserId={id as string} reportedPostId={null} target="profile" />
    </AppShell>
  )
}