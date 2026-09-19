'use client'
import { useEffect, useState, useRef } from 'react'
import AppShell from '@/components/AppShell'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import toast from 'react-hot-toast'
import { Heart, MoreHorizontal, MapPin, Lock, Grid3X3, FileText, Flame, X, Search } from 'lucide-react'
import ReportModal from '@/components/ReportModal'
import { VerifiedBadge } from '@/components/VerifiedBadge'
import OnlineBadge from '@/components/OnlineBadge'
import { isUserOnline } from '@/hooks/usePresence'

type FollowUser = { id: string; username: string; full_name: string; avatar_url: string; verificado?: boolean }

const RELATIONSHIP_LABELS: Record<string, string> = {
  solteiro: 'Solteiro(a)',
  relacionamento: 'Em um relacionamento',
  noivo: 'Noivo(a)',
  casado: 'Casado(a)',
  uniao_estavel: 'Em união estável',
  complicado: 'É complicado',
  aberto: 'Em um relacionamento aberto',
  separado: 'Separado(a)',
  divorciado: 'Divorciado(a)',
  viuvo: 'Viúvo(a)',
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
  const [counts, setCounts] = useState({ followers: 0, following: 0 })
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

  useEffect(() => {
    document.body.style.overflow = showFollowers || showFollowing? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [showFollowers, showFollowing])

  async function fetchCounts(targetId: string) {
    const { data: cts } = await supabase.rpc('get_follow_counts', { p_target_id: targetId })
    if (cts?.[0]?.followers_count!= null) {
      setCounts({ followers: Number(cts[0].followers_count), following: Number(cts[0].following_count) })
    } else {
      const [{ count: f1 }, { count: f2 }] = await Promise.all([
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', targetId),
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', targetId),
      ])
      setCounts({ followers: f1 || 0, following: f2 || 0 })
    }
  }

  useEffect(() => {
    if (!id) return
    const loadData = async () => {
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', id).single()
      setProfile(prof)
      await fetchCounts(id as string)
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

  useEffect(() => {
    if (!id ||!profile) return
    if (profile.is_private && me?.id!== id &&!following) { setPosts([]); return }
    supabase.from('posts').select('*, likes(count)').eq('user_id', id).order('created_at', { ascending: false }).then(({ data: ps }) => {
      setPosts((ps || []).map((p: any) => ({...p, like_count: p.likes?.[0]?.count?? 0 })))
    })
  }, [id, profile, following, me])

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

  async function goToPartner(username: string) {
    if (!username) return
    const { data } = await supabase.from('profiles').select('id').eq('username', username.toLowerCase()).single()
    if (data?.id) router.push(`/user/${data.id}`)
    else toast.error('Usuário não encontrado')
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
  const isVerificado = profile.verificado || profile.is_verified

  const FollowListModal = ({ title, list, filtered, onClose }: any) => (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4" onClick={onClose}>
      <div className="w-full sm:max-w-md h- sm:h- rounded-t-3xl sm:rounded-2xl bg-[#111] border border-[#262626] flex flex-col overflow-hidden" onClick={e=>e.stopPropagation()}>
        <div className="shrink-0 p-5 border-b border-[#262626]">
          <div className="flex items-center justify-between mb-4"><h3 className="text-white font-light">{title}</h3><button onClick={onClose} className="p-2 rounded-full bg-[#1a1a1a]"><X className="w-4 h-4 text-white" /></button></div>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {filtered.map((u:any) => (
            <div key={u.id} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-[#171717] cursor-pointer" onClick={()=>{onClose(); router.push(`/user/${u.id}`)}}>
              <div className="w-10 h-10 rounded-full bg-[#262626] overflow-hidden">{u.avatar_url? <img src={u.avatar_url} className="w-full h-full object-cover" /> : u.username[0]}</div>
              <div><p className="text-sm text-white">@{u.username}</p><p className="text-xs text-[#a8a8a8]">{u.full_name}</p></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-4 pb-20 pt-4">
        <div className="rounded-2xl border border-[#262626] bg-[#111111]/80 p-5">
          <div className="flex gap-5">
            <div className="relative shrink-0">
              <div className={`h-24 w-24 overflow-hidden rounded-full bg-[#1d1d1d] ${isVerificado? 'ring-2 ring-[#D4AF37] ring-offset-2 ring-offset-[#111]' : 'border border-[#3a3a3a]'}`}>
                {profile.avatar_url? <img src={profile.avatar_url} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-3xl text-[#a8a8a8]">{profile.username?.[0]?.toUpperCase()}</div>}
              </div>
              {isVerificado && <div className="absolute -bottom-1 -right-1"><VerifiedBadge size={28} /></div>}
              {isUserOnline(profile) &&!isVerificado && <div className="absolute bottom-0 right-0"><OnlineBadge size={14} /></div>}
            </div>

            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-light text-white truncate flex items-center gap-2">@{profile.username} {isVerificado && <span className="text-[#D4AF37] text- uppercase">Verificado</span>}</h1>
              <p className="text-sm font-medium text-white mt-1">{profile.full_name}</p>

              {/* CIDADE E RELACIONAMENTO - NOVO IGUAL FACEBOOK */}
              <div className="mt-3 flex flex-wrap gap-2">
                {canSeeInfo && locationText? (
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-[#1e1e1e] border border-[#2a2a2a] px-3.5 py-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#ff7a18]" />
                    <span className="text-xs text-white font-light">{profile.city} - {String(profile.state).toUpperCase()}</span>
                  </div>
                ) :!canSeeInfo? (
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-[#141414] border border-[#262626] px-3.5 py-1.5"><Lock className="w-3 h-3 text-[#a8a8a8]" /><span className="text-xs text-[#a8a8a8]">Privado</span></div>
                ) : null}

                {canSeeInfo && profile.relationship_status && (
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-[#1e1e1e] border border-[#2a2a2a] px-3.5 py-1.5">
                    <Heart className="w-3.5 h-3.5 text-[#ff4d6d] fill-[#ff4d6d]" />
                    <span className="text-xs text-white">{RELATIONSHIP_LABELS[profile.relationship_status]}</span>
                    {profile.relationship_with && (
                      <>
                        <span className="text-xs text-[#a8a8a8]">com</span>
                        <button onClick={() => goToPartner(profile.relationship_with)} className="text-xs text-white font-medium hover:underline">@{profile.relationship_with}</button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {canSeeInfo && locationText && <p className="mt-2 text- text-[#a8a8a8]">Mora em {locationText}</p>}
              {profile.bio && <p className="mt-3 text-sm text-[#d4d4d4] whitespace-pre-wrap leading-relaxed">{profile.bio}</p>}

              {me && me.id!== id && (
                <div className="mt-4 flex items-center gap-2">
                  {!following &&!requested && <button onClick={follow} className="bg-white text-black px-5 py-2 rounded-full text-sm">{profile.is_private? '🔒 Solicitar' : 'Seguir'}</button>}
                  {following && <span className="text-sm text-[#a8a8a8]">✓ Seguindo</span>}
                  {requested && <span className="text-sm text-[#a8a8a8]">⏳ Solicitado</span>}
                  <button onClick={startChat} className="bg-[#262626] text-white px-5 py-2 rounded-full text-sm">Mensagem</button>
                  <div ref={menuRef} className="relative ml-auto">
                    <button onClick={()=>setMenuOpen(v=>!v)} className="w-9 h-9 rounded-full bg-[#262626] flex items-center justify-center text-white"><MoreHorizontal className="w-5 h-5" /></button>
                    {menuOpen && <div className="absolute right-0 mt-2 w-44 bg-[#0a0a0a] border border-[#262626] rounded-2xl overflow-hidden z-10"><button onClick={()=>{setMenuOpen(false);setReportOpen(true)}} className="w-full text-left px-4 py-3 text-sm text-white hover:bg-[#262626]">🚩 Denunciar</button></div>}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <button disabled={restrictedAndHidden} onClick={async()=>{ if(restrictedAndHidden) return; setShowFollowers(true); await loadFollowers()}} className="rounded-2xl border border-[#262626] bg-[#171717] p-4 text-center"><p className="text-xl text-white">{restrictedAndHidden? '—' : counts.followers}</p><p className="text- text-[#a8a8a8] uppercase">Seguidores</p></button>
            <button disabled={restrictedAndHidden} onClick={async()=>{ if(restrictedAndHidden) return; setShowFollowing(true); await loadFollowing()}} className="rounded-2xl border border-[#262626] bg-[#171717] p-4 text-center"><p className="text-xl text-white">{restrictedAndHidden? '—' : counts.following}</p><p className="text- text-[#a8a8a8] uppercase">Seguindo</p></button>
          </div>

          <div className="mt-4 rounded-2xl bg-gradient-to-br from-[#ff7a18] to-[#ff4e00] p-4 flex items-center justify-between">
            <div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 border border-white/20"><Heart className="w-6 h-6 text-white fill-white" /></div><div><p className="text- uppercase text-white/80">Total de curtidas</p></div></div>
            <p className="text-3xl font-light text-white">{restrictedAndHidden? '—' : totalLikes.toLocaleString('pt-BR')}</p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-[#262626] bg-[#111111]/80 overflow-hidden">
          <div className="flex border-b border-[#262626]">
            <button onClick={()=>setActiveTab('fotos')} className={`flex flex-1 items-center justify-center gap-2 py-4 text-sm uppercase ${activeTab==='fotos'?'text-white border-b border-white':'text-[#a8a8a8]'}`}><Grid3X3 className="w-4 h-4" /> Fotos</button>
            <button onClick={()=>setActiveTab('textos')} className={`flex flex-1 items-center justify-center gap-2 py-4 text-sm uppercase ${activeTab==='textos'?'text-white border-b border-white':'text-[#a8a8a8]'}`}><FileText className="w-4 h-4" /> Textos</button>
          </div>
          <div className="p-2">
            {restrictedAndHidden? <div className="py-16 text-center text-sm text-[#a8a8a8]">🔒 Conta restrita. Siga para ver.</div> :
             activeTab==='fotos'? (posts.filter((p:any)=>p.image_url||p.media_url||p.photo_url).length===0? <div className="py-16 text-center text-[#a8a8a8] text-sm">Nenhuma foto</div> : <div className="grid grid-cols-3 gap-1">{posts.filter((p:any)=>p.image_url||p.media_url||p.photo_url).map((p:any)=><div key={p.id} className="aspect-square bg-[#171717] rounded-xl overflow-hidden"><img src={p.image_url||p.media_url||p.photo_url} className="h-full w-full object-cover" /></div>)}</div>)
             : (posts.length===0? <div className="py-16 text-center text-[#a8a8a8] text-sm">Nenhum post</div> : <div className="space-y-3 p-2">{posts.map((p:any)=><div key={p.id} className="rounded-2xl border border-[#262626] bg-[#111] p-4"><p className="text-sm text-white whitespace-pre-wrap">{p.content}</p></div>)}</div>)}
          </div>
        </div>
      </div>

      {showFollowers && <FollowListModal title="Seguidores" list={followersList} filtered={filteredFollowers} onClose={()=>setShowFollowers(false)} />}
      {showFollowing && <FollowListModal title="Seguindo" list={followingList} filtered={filteredFollowing} onClose={()=>setShowFollowing(false)} />}
      <ReportModal open={reportOpen} onClose={()=>setReportOpen(false)} reportedUserId={id as string} reportedPostId={null} target="profile" />
    </AppShell>
  )
}