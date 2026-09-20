'use client'
import { useEffect, useState } from 'react'
import AppShell from '@/components/AppShell'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { VerifiedBadge } from '@/components/VerifiedBadge'
import OnlineBadge from '@/components/OnlineBadge'
import { isAdmin } from '@/lib/helpers'
import { Shield, Menu, X, Lock, Globe, UserX, LogOut, Share2, Pencil, ChevronRight, Heart, Grid3x3, Clapperboard, UserSquare2, MapPin, Trash2, Search, Plus, Link2 } from 'lucide-react'
import PostCard from '@/components/PostCard'

type BlockedUser = { id: string; username: string; full_name: string; avatar_url: string }
type FollowUser = { id: string; username: string; full_name: string; avatar_url: string }

const RELATIONSHIP_LABELS: any = {
  '': '', solteiro: 'Solteiro(a)', relacionamento: 'Em um relacionamento', noivo: 'Noivo(a)', casado: 'Casado(a)',
  uniao_estavel: 'Em união estável', complicado: 'É complicado', aberto: 'Em um relacionamento aberto',
  separado: 'Separado(a)', divorciado: 'Divorciado(a)', viuvo: 'Viúvo(a)',
}

export default function ProfilePage() {
  const { user } = useAuth()
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [posts, setPosts] = useState<any[]>([])
  const [totalLikes, setTotalLikes] = useState(0)
  const [followers, setFollowers] = useState(0)
  const [following, setFollowing] = useState(0)
  const [loading, setLoading] = useState(true)
  const [isUserAdmin, setIsUserAdmin] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [showBlocked, setShowBlocked] = useState(false)
  const [showAvatarModal, setShowAvatarModal] = useState(false)
  const [postAberto, setPostAberto] = useState<any>(null)
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([])
  const [loadingBlocked, setLoadingBlocked] = useState(false)
  const [activeTab, setActiveTab] = useState<'fotos' | 'textos'>('fotos')
  const [showFollowers, setShowFollowers] = useState(false)
  const [showFollowing, setShowFollowing] = useState(false)
  const [followersList, setFollowersList] = useState<FollowUser[]>([])
  const [followingList, setFollowingList] = useState<FollowUser[]>([])
  const [loadingList, setLoadingList] = useState(false)
  const [searchFollow, setSearchFollow] = useState('')

  async function load() {
    if (!user) return
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(prof)
    const { data: ps } = await supabase.from('posts').select('*, likes(count)').eq('user_id', user.id).order('created_at', { ascending: false })
    setPosts((ps || []).map((p: any) => ({...p, profiles: prof, like_count: p.likes?.[0]?.count?? 0 })))
    const { data: tl } = await supabase.rpc('get_total_likes_for_user', { p_user_id: user.id })
    setTotalLikes(Number(tl || 0))
    const [{ count: followersCount }, { count: followingCount }] = await Promise.all([
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', user.id),
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', user.id),
    ])
    setFollowers(followersCount || 0)
    setFollowing(followingCount || 0)
    setLoading(false)
  }

  useEffect(() => { load() }, [user])
  useEffect(() => {
    if (!user) { setIsUserAdmin(false); return }
    let cancelled = false
    isAdmin(user.id).then(ok => { if (!cancelled) setIsUserAdmin(ok) })
    return () => { cancelled = true }
  }, [user?.id])
  useEffect(() => {
    if (menuOpen || showBlocked || showFollowers || showFollowing || showAvatarModal || postAberto) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [menuOpen, showBlocked, showFollowers, showFollowing, showAvatarModal, postAberto])

  async function togglePrivate() {
    if (!profile) return
    const next =!profile.is_private
    const { error } = await supabase.from('profiles').update({ is_private: next }).eq('id', user!.id)
    if (error) return toast.error(error.message)
    setProfile({...profile, is_private: next })
    toast.success(next? 'Conta Restrita ativada.' : 'Conta pública.')
  }
  async function shareProfile() {
    const url = `${window.location.origin}/user/${profile.id}`
    if (navigator.share) {
      try { await navigator.share({ title: `@${profile.username} no MISHH`, text: `Veja o perfil de @${profile.username} no MISHH!`, url }) } catch {}
    } else if (navigator.clipboard) {
      try { await navigator.clipboard.writeText(url); toast.success('Link copiado!') } catch { toast.error('Não foi possível copiar o link.') }
    }
  }
  async function signOut() { await supabase.auth.signOut(); router.replace('/login') }
  async function loadBlocked() {
    if (!user) return
    setLoadingBlocked(true)
    const { data } = await supabase.from('blocks').select('blocked_id').eq('blocker_id', user.id)
    const ids = (data || []).map((b: any) => b.blocked_id)
    if (ids.length === 0) { setBlockedUsers([]); setLoadingBlocked(false); return }
    const { data: profiles } = await supabase.from('profiles').select('id, username, full_name, avatar_url').in('id', ids)
    setBlockedUsers(profiles || [])
    setLoadingBlocked(false)
  }
  async function unblock(blockedId: string) {
    if (!user) return
    const { error } = await supabase.from('blocks').delete().eq('blocker_id', user.id).eq('blocked_id', blockedId)
    if (error) { toast.error('Erro ao desbloquear.'); return }
    toast.success('Usuário desbloqueado.')
    setBlockedUsers(prev => prev.filter(u => u.id!== blockedId))
  }
  async function loadFollowers() {
    if (!user) return
    setLoadingList(true); setSearchFollow('')
    const { data: rel } = await supabase.from('follows').select('follower_id').eq('following_id', user.id)
    const ids = rel?.map((r: any) => r.follower_id) || []
    if (ids.length === 0) { setFollowersList([]); setLoadingList(false); return }
    const { data } = await supabase.from('profiles').select('id, username, full_name, avatar_url').in('id', ids)
    setFollowersList(data as any || []); setLoadingList(false)
  }
  async function loadFollowing() {
    if (!user) return
    setLoadingList(true); setSearchFollow('')
    const { data: rel } = await supabase.from('follows').select('following_id').eq('follower_id', user.id)
    const ids = rel?.map((r: any) => r.following_id) || []
    if (ids.length === 0) { setFollowingList([]); setLoadingList(false); return }
    const { data } = await supabase.from('profiles').select('id, username, full_name, avatar_url').in('id', ids)
    setFollowingList(data as any || []); setLoadingList(false)
  }
  async function goToPartner(username: string) {
    if (!username) return
    const { data } = await supabase.from('profiles').select('id').eq('username', username.toLowerCase()).single()
    if (data?.id) router.push(`/user/${data.id}`)
    else toast.error('Usuário não encontrado')
  }

  if (loading) return <AppShell><div className="py-10 text-center text-[#a8a8a8]">Carregando...</div></AppShell>
  if (!profile) return <AppShell><div className="py-10 text-center text-[#a8a8a8]">Perfil não encontrado.</div></AppShell>

  const postsComFoto = posts.filter(p => p.image_url || p.media_url || p.photo_url)
  const locationText = [profile.city, profile.state, profile.country].filter(Boolean).join(', ')
  const filteredFollowers = followersList.filter(u => u.username.toLowerCase().includes(searchFollow.toLowerCase()) || u.full_name?.toLowerCase().includes(searchFollow.toLowerCase()))
  const filteredFollowing = followingList.filter(u => u.username.toLowerCase().includes(searchFollow.toLowerCase()) || u.full_name?.toLowerCase().includes(searchFollow.toLowerCase()))

  return (
    <AppShell>
      {/* TOP SEM O mishh ▼ QUE VOCÊ CIRCULOU - SÓ MENU */}
      <div className="mx-auto max-w- flex justify-end px-4 pt-2 pb-2">
        <button onClick={() => setMenuOpen(true)} className="p-2"><Menu className="w-6 h-6 text-white" /></button>
      </div>

      {menuOpen && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setMenuOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative z-10 w-[70%] max-w-xs h-full bg-[#0a0a0a] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#262626]">
              <div><p className="text-white text-sm">@{profile.username}</p><p className="text-[#a8a8a8] text-xs">{profile.full_name}</p></div>
              <button onClick={() => setMenuOpen(false)} className="p-2 text-[#a8a8a8]"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto py-3 space-y-1">
              <button onClick={() => { setMenuOpen(false); router.push('/profile/edit') }} className="flex w-full items-center justify-between px-5 py-3.5 hover:bg-[#1a1a1a]"><span className="flex items-center gap-3 text-sm text-white"><Pencil className="w-5 h-5 text-[#a8a8a8]" />Editar Perfil</span><ChevronRight className="w-4 h-4 text-[#a8a8a8]" /></button>
              <button onClick={() => { setMenuOpen(false); shareProfile() }} className="flex w-full items-center justify-between px-5 py-3.5 hover:bg-[#1a1a1a]"><span className="flex items-center gap-3 text-sm text-white"><Share2 className="w-5 h-5 text-[#a8a8a8]" />Compartilhar</span><ChevronRight className="w-4 h-4 text-[#a8a8a8]" /></button>
              <button onClick={() => { setMenuOpen(false); setShowBlocked(true); loadBlocked() }} className="flex w-full items-center justify-between px-5 py-3.5 hover:bg-[#1a1a1a]"><span className="flex items-center gap-3 text-sm text-white"><UserX className="w-5 h-5 text-[#a8a8a8]" />Bloqueados</span><ChevronRight className="w-4 h-4 text-[#a8a8a8]" /></button>
              <button onClick={() => { setMenuOpen(false); togglePrivate() }} className="flex w-full items-center justify-between px-5 py-3.5 hover:bg-[#1a1a1a]"><span className="flex items-center gap-3 text-sm text-white">{profile.is_private? <Globe className="w-5 h-5" /> : <Lock className="w-5 h-5" />}{profile.is_private? 'Público' : 'Privado'}</span><ChevronRight className="w-4 h-4" /></button>
              {isUserAdmin && <button onClick={() => { setMenuOpen(false); router.push('/admin') }} className="flex w-full items-center justify-between px-5 py-3.5 hover:bg-[#1a1a1a]"><span className="flex items-center gap-3 text-sm text-red-500"><Shield className="w-5 h-5" />Admin</span><ChevronRight className="w-4 h-4 text-red-500" /></button>}
              <div className="border-t border-[#262626] mt-3 pt-3">
                <button onClick={() => { setMenuOpen(false); router.push('/profile/delete') }} className="flex w-full items-center gap-3 px-5 py-3.5 text-sm text-red-500"><Trash2 className="w-5 h-5" />Excluir Conta</button>
                <button onClick={signOut} className="flex w-full items-center gap-3 px-5 py-3.5 text-sm text-white"><LogOut className="w-5 h-5 text-[#a8a8a8]" />Sair</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showBlocked && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setShowBlocked(false)}>
          <div className="absolute inset-0 bg-black/70" />
          <div className="relative w-full max-w-md bg-[#0a0a0a] rounded-t-lg sm:rounded-lg border border-[#262626]" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#262626]"><p className="text-white text-sm">Bloqueados</p><button onClick={() => setShowBlocked(false)}><X className="w-5 h-5 text-[#a8a8a8]" /></button></div>
            <div className="p-3 max-h- overflow-y-auto">{loadingBlocked? <div className="text-center py-10 text-[#a8a8a8]">Carregando...</div> : blockedUsers.map(u=><div key={u.id} className="flex items-center justify-between py-3"><div className="flex items-center gap-3"><img src={u.avatar_url} className="h-10 w-10 rounded-full" /><div><p className="text-white text-sm">@{u.username}</p></div></div><button onClick={()=>unblock(u.id)} className="bg-white text-black px-4 py-1.5 rounded-full text-xs">Desbloquear</button></div>)}</div>
          </div>
        </div>
      )}

      {(showFollowers || showFollowing) && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => { setShowFollowers(false); setShowFollowing(false) }}>
          <div className="absolute inset-0 bg-black/80" />
          <div className="relative w-full sm:max-w-md bg-[#0a0a0a] rounded-t-lg sm:rounded-lg border border-[#262626] overflow-hidden" onClick={e=>e.stopPropagation()}>
            <div className="px-5 pt-5 pb-3 border-b border-[#262626]"><div className="flex items-center justify-between mb-4"><h3 className="text-white">{showFollowers? 'Seguidores' : 'Seguindo'}</h3><button onClick={() => { setShowFollowers(false); setShowFollowing(false) }} className="p-2 rounded-full bg-[#1a1a1a]"><X className="w-4 h-4 text-white" /></button></div><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666]" /><input value={searchFollow} onChange={e=>setSearchFollow(e.target.value)} placeholder="Buscar..." className="w-full bg-[#141414] border border-[#262626] rounded-full pl-10 pr-4 py-2.5 text-sm text-white outline-none" /></div></div>
            <div className="max-h- overflow-y-auto">{loadingList? <div className="py-20 text-center text-[#666] text-sm">Carregando...</div> : (showFollowers? filteredFollowers : filteredFollowing).map((u:any)=>(<div key={u.id} onClick={()=>{ setShowFollowers(false); setShowFollowing(false); router.push(`/user/${u.id}`)}} className="flex items-center justify-between px-5 py-3 hover:bg-[#141414] cursor-pointer"><div className="flex items-center gap-3"><img src={u.avatar_url} className="h-10 w-10 rounded-full bg-[#222]" /><div><p className="text-white text-sm">@{u.username}</p><p className="text-xs text-[#777]">{u.full_name}</p></div></div><ChevronRight className="w-4 h-4 text-[#444]" /></div>))}</div>
          </div>
        </div>
      )}

      {showAvatarModal && profile.avatar_url && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4" onClick={() => setShowAvatarModal(false)}>
          <button className="absolute right-4 top-4 rounded-full bg-black/50 p-2 text-white"><X className="h-6 w-6" /></button>
          <img src={profile.avatar_url} onClick={e=>e.stopPropagation()} className="max-h- max-w- rounded-lg object-contain" />
        </div>
      )}

      {postAberto && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/95 p-4" onClick={() => setPostAberto(null)}>
          <button className="absolute right-4 top-4 rounded-full bg-black/50 p-2 text-white"><X className="h-6 w-6" /></button>
          <div className="w-full max-w-" onClick={e=>e.stopPropagation()}><PostCard post={postAberto} /></div>
        </div>
      )}

      <div className="mx-auto max-w- px-4 pb-20">
        {/* AVATAR DIMINUIDO DE 150px PRA 72px */}
        <div className="flex gap-5 items-center mt-2">
          <div className="relative shrink-0">
            <button onClick={() => profile.avatar_url && setShowAvatarModal(true)} className="block h-[100px] w-[100px] rounded-full overflow-hidden bg-[#1d1d1d] border border-[#262626]">
              {profile.avatar_url? <img src={profile.avatar_url} alt={profile.username} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-xl text-[#a8a8a8]">{profile.username?.[0]?.toUpperCase()}</div>}
            </button>
            {profile.is_verified && <VerifiedBadge className="absolute -bottom-1 -right-1 scale-90" />}
          </div>
          <div className="flex flex-1 justify-between text-center">
            <div className="flex flex-col items-center"><span className="text- font-bold text-white leading-none">{postsComFoto.length}</span><span className="text- text-white mt-1">posts</span></div>
            <button onClick={async()=>{ setShowFollowers(true); await loadFollowers()}} className="flex flex-col items-center"><span className="text- font-bold text-white leading-none">{followers}</span><span className="text- text-white mt-1">seguidores</span></button>
            <button onClick={async()=>{ setShowFollowing(true); await loadFollowing()}} className="flex flex-col items-center"><span className="text- font-bold text-white leading-none">{following}</span><span className="text- text-white mt-1">seguindo</span></button>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center gap-1.5">
            <h2 className="text- font-bold text-white">{profile.full_name || 'Mishh'}</h2>
            {profile.is_online && <OnlineBadge />}
          </div>
          {profile.bio && <p className="mt-1 text- text-white leading- whitespace-pre-wrap">{profile.bio}</p>}
          {locationText && <div className="mt-1 flex items-center gap-1 text- text-white"><MapPin className="w-3.5 h-3.5" />{locationText}</div>}
          {profile.relationship_status && (
            <div className="mt-1 flex items-center gap-1.5 text- text-white">
              <Heart className="w-3.5 h-3.5 fill-[#ff4d6d] text-[#ff4d6d]" />
              <span>{RELATIONSHIP_LABELS[profile.relationship_status]}</span>
              {profile.relationship_with && <button onClick={() => goToPartner(profile.relationship_with)} className="font-bold hover:underline">@{profile.relationship_with}</button>}
            </div>
          )}
          <div className="mt-1 flex items-center gap-1.5">
            <Link2 className="w-3.5 h-3.5 text-white" />
            <a href="https://mishh.vercel.app" target="_blank" className="text- font-bold text-[#0095f6]">mishh.vercel.app</a>
          </div>
        </div>

        <div className="mt-3">
          <button className="h- px-3 rounded-full bg-[#1a1a1a] border border-[#262626] text- font-semibold text-white flex items-center gap-1">
            <Plus className="w-4 h-4" /> Adicionar banners
          </button>
        </div>

        <div className="mt-4 flex gap-2">
          <button onClick={() => router.push('/profile/edit')} className="flex-1 h- rounded-lg bg-[#262626] text- font-bold text-white active:scale-[0.98]">Editar</button>
          <button onClick={shareProfile} className="flex-1 h- rounded-lg bg-[#262626] text- font-bold text-white active:scale-[0.98]">Compartilhar perfil</button>
        </div>

        {/* SÓ O CONTADOR EM LARANJADO DESTACADO */}
        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#ff6a00] px-3.5 py-1.5 shadow-[0_0_12px_rgba(255,106,0,0.3)]">
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20">
            <Heart className="w-3 h-3 text-white fill-white" />
          </div>
          <span className="text- font-bold tracking-wide text-white">
            {totalLikes.toLocaleString('pt-BR')} curtidas totais
          </span>
        </div>

        <div className="mt-6 border-t border-[#262626] flex">
          <button onClick={() => setActiveTab('fotos')} className={`flex-1 h- flex items-center justify-center border-t ${activeTab==='fotos'? 'border-white text-white' : 'border-transparent text-[#666]'}`}><Grid3x3 className="w-6 h-6" /></button>
          <button onClick={() => setActiveTab('textos')} className={`flex-1 h- flex items-center justify-center border-t ${activeTab==='textos'? 'border-white text-white' : 'border-transparent text-[#666]'}`}><Clapperboard className="w-6 h-6" /></button>
          <button className="flex-1 h- flex items-center justify-center border-t border-transparent text-[#666]"><UserSquare2 className="w-6 h-6" /></button>
        </div>

        <div className="mt-1">
          {activeTab === 'fotos'? (
            postsComFoto.length === 0? <div className="py-16 text-center text-sm text-[#a8a8a8]">Nenhuma foto ainda.</div> : (
              <div className="grid grid-cols-3 gap-">
                {postsComFoto.map((post) => (
                  <button key={post.id} onClick={() => setPostAberto(post)} className="aspect-square bg-[#171717] overflow-hidden">
                    <img src={post.image_url || post.media_url || post.photo_url} alt="post" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )
          ) : (
            posts.length === 0? <div className="py-16 text-center text-sm text-[#a8a8a8]">Nenhum texto ainda.</div> : (
              <div className="space-y-2 mt-2">
                {posts.map((post) => (
                  <div key={post.id} className="rounded-lg border border-[#262626] bg-[#111111] p-3"><p className="text-sm text-[#f5f5f5] whitespace-pre-wrap">{post.content}</p></div>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </AppShell>
  )
}