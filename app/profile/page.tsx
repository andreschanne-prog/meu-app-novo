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
import { Shield, Menu, X, Lock, Globe, UserX, LogOut, Share2, Pencil, ChevronRight, Heart, Grid3x3, FileText, Flame, Megaphone, MapPin, Trash2, Search } from 'lucide-react'

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
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([])
  const [loadingBlocked, setLoadingBlocked] = useState(false)
  const [activeTab, setActiveTab] = useState<'fotos' | 'textos'>('fotos')

  // NOVO: modal de seguidores / seguindo
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
    setPosts((ps || []).map((p: any) => ({...p, like_count: p.likes?.[0]?.count?? 0 })))
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
    if (menuOpen || showBlocked || showFollowers || showFollowing) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [menuOpen, showBlocked, showFollowers, showFollowing])

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

  // NOVAS FUNÇÕES: carregar quem te segue e quem você segue
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

  if (loading) return <AppShell><div className="py-10 text-center text-[#a8a8a8] font-light">Carregando...</div></AppShell>
  if (!profile) return <AppShell><div className="py-10 text-center text-[#a8a8a8] font-light">Perfil não encontrado.</div></AppShell>

  const postsComFoto = posts.filter(p => p.image_url || p.media_url || p.photo_url)
  const locationText = [profile.city, profile.state, profile.country].filter(Boolean).join(', ')
  const filteredFollowers = followersList.filter(u => u.username.toLowerCase().includes(searchFollow.toLowerCase()) || u.full_name?.toLowerCase().includes(searchFollow.toLowerCase()))
  const filteredFollowing = followingList.filter(u => u.username.toLowerCase().includes(searchFollow.toLowerCase()) || u.full_name?.toLowerCase().includes(searchFollow.toLowerCase()))

  return (
    <AppShell>
      <div className="flex justify-end pt-2 pb-2">
        <button onClick={() => setMenuOpen(true)} className="p-2 rounded-full text-white hover:bg-[#262626] transition active:scale-90"><Menu className="w-6 h-6" /></button>
      </div>

      {menuOpen && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setMenuOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative z-10 w-[60%] max-w-xs h-full bg-[#0a0a0a] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#262626]">
              <div><p className="text-white font-light text-sm">@{profile.username}</p><p className="text-[#a8a8a8] text-xs font-light">{profile.full_name}</p></div>
              <button onClick={() => setMenuOpen(false)} className="p-2 text-[#a8a8a8] hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto py-3 space-y-1">
              <button onClick={() => { setMenuOpen(false); router.push('/profile/edit') }} className="flex items-center justify-between w-full px-5 py-3.5 hover:bg-[#1a1a1a]"><div className="flex items-center gap-3"><Pencil className="w-5 h-5 text-[#a8a8a8]" /><span className="text-white text-sm font-light">Editar Perfil</span></div><ChevronRight className="w-4 h-4 text-[#a8a8a8]" /></button>
              <button onClick={() => { setMenuOpen(false); shareProfile() }} className="flex items-center justify-between w-full px-5 py-3.5 hover:bg-[#1a1a1a]"><div className="flex items-center gap-3"><Share2 className="w-5 h-5 text-[#a8a8a8]" /><span className="text-white text-sm font-light">Compartilhar Perfil</span></div><ChevronRight className="w-4 h-4 text-[#a8a8a8]" /></button>
              <button onClick={() => { setMenuOpen(false); router.push('/solicitar-anuncio') }} className="flex items-center justify-between w-full px-5 py-3.5 hover:bg-[#1a1a1a]"><div className="flex items-center gap-3"><Megaphone className="w-5 h-5 text-[#a8a8a8]" /><span className="text-white text-sm font-light">Solicitar anúncio</span></div><ChevronRight className="w-4 h-4 text-[#a8a8a8]" /></button>
              <button onClick={() => { setMenuOpen(false); setShowBlocked(true); loadBlocked() }} className="flex items-center justify-between w-full px-5 py-3.5 hover:bg-[#1a1a1a]"><div className="flex items-center gap-3"><UserX className="w-5 h-5 text-[#a8a8a8]" /><span className="text-white text-sm font-light">Usuários Bloqueados</span></div><ChevronRight className="w-4 h-4 text-[#a8a8a8]" /></button>
              <button onClick={() => { setMenuOpen(false); togglePrivate() }} className="flex items-center justify-between w-full px-5 py-3.5 hover:bg-[#1a1a1a]"><div className="flex items-center gap-3">{profile.is_private? <Globe className="w-5 h-5 text-[#a8a8a8]" /> : <Lock className="w-5 h-5 text-[#a8a8a8]" />}<span className="text-white text-sm font-light">{profile.is_private? 'Tornar Perfil Público' : 'Tornar Perfil Privado'}</span></div><ChevronRight className="w-4 h-4 text-[#a8a8a8]" /></button>
              {isUserAdmin && <button onClick={() => { setMenuOpen(false); router.push('/admin') }} className="flex items-center justify-between w-full px-5 py-3.5 hover:bg-[#1a1a1a]"><div className="flex items-center gap-3"><Shield className="w-5 h-5 text-red-500" /><span className="text-red-500 text-sm font-light">Painel Admin</span></div><ChevronRight className="w-4 h-4 text-red-500" /></button>}
              <div className="pt-3 mt-3 border-t border-[#262626]">
                <button onClick={() => { setMenuOpen(false); router.push('/profile/delete') }} className="flex items-center justify-between w-full px-5 py-3.5 hover:bg-red-500/10 group"><div className="flex items-center gap-3"><Trash2 className="w-5 h-5 text-red-500" /><span className="text-red-500 text-sm font-light">Excluir Conta</span></div><ChevronRight className="w-4 h-4 text-red-500" /></button>
                <button onClick={() => { setMenuOpen(false); signOut() }} className="flex items-center justify-between w-full px-5 py-3.5 hover:bg-[#1a1a1a]"><div className="flex items-center gap-3"><LogOut className="w-5 h-5 text-[#a8a8a8]" /><span className="text-white text-sm font-light">Sair</span></div><ChevronRight className="w-4 h-4 text-[#a8a8a8]" /></button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showBlocked && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setShowBlocked(false)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="relative w-full max-w-md bg-[#0a0a0a] rounded-t-2xl sm:rounded-2xl border border-[#262626] max-h- flex flex-col" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#262626]"><p className="text-white font-light text-sm">Usuários bloqueados</p><button onClick={() => setShowBlocked(false)} className="p-2 text-[#a8a8a8] hover:text-white"><X className="w-5 h-5" /></button></div>
            <div className="flex-1 overflow-y-auto p-3">
              {loadingBlocked? <div className="text-center py-10 text-[#a8a8a8] text-sm">Carregando...</div> : blockedUsers.length===0? <div className="text-center py-10 text-[#a8a8a8] text-sm">Nenhum usuário bloqueado.</div> : blockedUsers.map(u=>(
                <div key={u.id} className="flex items-center justify-between py-3"><div className="flex items-center gap-3"><img src={u.avatar_url||''} className="h-10 w-10 rounded-full bg-[#222]" alt="" /><div><p className="text-white text-sm">@{u.username}</p><p className="text-xs text-[#777]">{u.full_name}</p></div></div><button onClick={()=>unblock(u.id)} className="text-xs bg-white text-black px-4 py-1.5 rounded-full">Desbloquear</button></div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL SEGUIDORES / SEGUINDO - NOVO */}
      {(showFollowers || showFollowing) && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => { setShowFollowers(false); setShowFollowing(false) }}>
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <div className="relative w-full sm:max-w-md h- sm:h- bg-[#0a0a0a] rounded-t-3xl sm:rounded-2xl border border-[#262626] flex flex-col overflow-hidden" onClick={e=>e.stopPropagation()}>
            <div className="shrink-0 px-5 pt-5 pb-3 border-b border-[#262626]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-light">{showFollowers? 'Seguidores' : 'Seguindo'}</h3>
                <button onClick={() => { setShowFollowers(false); setShowFollowing(false) }} className="p-2 rounded-full bg-[#1a1a1a]"><X className="w-4 h-4 text-white" /></button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666]" />
                <input value={searchFollow} onChange={e=>setSearchFollow(e.target.value)} placeholder="Buscar..." className="w-full bg-[#141414] border border-[#262626] rounded-full pl-10 pr-4 py-2.5 text-sm text-white outline-none" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loadingList? <div className="py-20 text-center text-[#666] text-sm">Carregando...</div> :
                (showFollowers? filteredFollowers : filteredFollowing).length===0? <div className="py-20 text-center text-[#666] text-sm">Nenhum usuário encontrado.</div> :
                (showFollowers? filteredFollowers : filteredFollowing).map((u:any)=>(
                  <div key={u.id} onClick={()=>{ setShowFollowers(false); setShowFollowing(false); router.push(`/user/${u.id}`)}} className="flex items-center justify-between px-5 py-3 hover:bg-[#141414] cursor-pointer transition">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-[#222] overflow-hidden">{u.avatar_url? <img src={u.avatar_url} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-white text-sm">{u.username[0]?.toUpperCase()}</div>}</div>
                      <div><p className="text-white text-sm">@{u.username}</p><p className="text-xs text-[#777] truncate max-w-">{u.full_name}</p></div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#444]" />
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-3xl px-4 pb-20 pt-4">
        <div className="rounded-2xl border border-[#262626] bg-[#111111]/80 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
          <div className="flex gap-6">
            <div className="relative h-20 w-20 sm:h-24 sm:w-24 shrink-0 overflow-hidden rounded-full border border-[#3a3a3a] bg-[#1d1d1d]">
              {profile.avatar_url? <img src={profile.avatar_url} alt={profile.username} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-3xl text-[#a8a8a8]">{profile.username?.[0]?.toUpperCase()}</div>}
              {profile.is_verified && <VerifiedBadge className="absolute -bottom-1 -right-1" />}
            </div>
            <div className="flex flex-1 flex-col justify-center min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-light text-white truncate">@{profile.username}</h1>
                {profile.is_online && <OnlineBadge />}
              </div>
              <p className="text-sm font-medium text-white mt-1">{profile.full_name}</p>
              {profile.bio && <p className="mt-2 text-sm text-[#d4d4d4] whitespace-pre-wrap leading-relaxed">{profile.bio}</p>}
              <div className="mt-3 flex flex-col gap-2">
                {locationText && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-[#a8a8a8] shrink-0" />
                    <span className="text-[#a8a8a8]">Mora em</span>
                    <span className="text-white font-light">{locationText}</span>
                  </div>
                )}
                {profile.relationship_status && (
                  <div className="flex items-center gap-2 text-sm">
                    <Heart className="w-4 h-4 text-[#ff4d6d] fill-[#ff4d6d] shrink-0" />
                    <span className="text-white font-light">{RELATIONSHIP_LABELS[profile.relationship_status] || profile.relationship_status}</span>
                    {profile.relationship_with && (
                      <>
                        <span className="text-[#a8a8a8]">com</span>
                        <button onClick={() => goToPartner(profile.relationship_with)} className="text-white font-medium hover:underline">@{profile.relationship_with}</button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* AGORA CLICÁVEL */}
          <div className="mt-6 grid grid-cols-2 gap-3">
            <button onClick={async()=>{ setShowFollowers(true); await loadFollowers()}} className="rounded-2xl border border-[#262626] bg-[#171717] p-4 text-center hover:bg-[#1e1e1e] active:scale-[0.98] transition">
              <p className="text-xl font-light text-white">{followers}</p>
              <p className="text- uppercase tracking-[0.18em] text-[#a8a8a8] mt-1">Seguidores</p>
            </button>
            <button onClick={async()=>{ setShowFollowing(true); await loadFollowing()}} className="rounded-2xl border border-[#262626] bg-[#171717] p-4 text-center hover:bg-[#1e1e1e] active:scale-[0.98] transition">
              <p className="text-xl font-light text-white">{following}</p>
              <p className="text- uppercase tracking-[0.18em] text-[#a8a8a8] mt-1">Seguindo</p>
            </button>
          </div>

          <div className="mt-4 relative overflow-hidden rounded-2xl border border-orange-400/20 bg-gradient-to-br from-[#ff6a00] via-[#ff8533] to-[#ff4500] p-">
            <div className="relative rounded- bg-gradient-to-br from-[#ff7a18] to-[#ff4e00] p-4">
              <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-white/20 blur-2xl" />
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 backdrop-blur-md border border-white/20"><Heart className="w-6 h-6 text-white fill-white" /></div>
                  <div><p className="text- uppercase tracking-[0.2em] text-white/80 font-medium">Total de curtidas</p><p className="text-xs text-white/70 font-light">em todos os seus posts</p></div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-light text-white tracking-tight">{totalLikes.toLocaleString('pt-BR')}</p>
                  <div className="mt-1 flex items-center justify-end gap-1 text-white/90"><Flame className="w-3.5 h-3.5" /><span className="text- uppercase tracking-widest font-medium">em alta</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-[#262626] bg-[#111111]/80 overflow-hidden">
          <div className="flex border-b border-[#262626]">
            <button onClick={() => setActiveTab('fotos')} className={`flex flex-1 items-center justify-center gap-2 py-4 text-sm font-light tracking-widest uppercase transition ${activeTab === 'fotos'? 'text-white border-b border-white' : 'text-[#a8a8a8] hover:text-white'}`}><Grid3x3 className="w-4 h-4" /> Fotos</button>
            <button onClick={() => setActiveTab('textos')} className={`flex flex-1 items-center justify-center gap-2 py-4 text-sm font-light tracking-widest uppercase transition ${activeTab === 'textos'? 'text-white border-b border-white' : 'text-[#a8a8a8] hover:text-white'}`}><FileText className="w-4 h-4" /> Textos</button>
          </div>
          <div className="p-2">
            {activeTab === 'fotos'? (
              postsComFoto.length === 0? <div className="rounded-2xl border border-dashed border-[#3a3a3a] bg-[#121212] px-4 py-16 text-center text-sm text-[#a8a8a8]">Nenhuma foto ainda.</div> : (
                <div className="grid grid-cols-3 gap-1 md:gap-2">
                  {postsComFoto.map((post) => (
                    <div key={post.id} className="group relative aspect-square overflow-hidden bg-[#171717] cursor-pointer rounded-xl"><img src={post.image_url || post.media_url || post.photo_url} alt="post" className="h-full w-full object-cover group-hover:scale-105 transition duration-500" /></div>
                  ))}
                </div>
              )
            ) : (
              posts.length === 0? <div className="rounded-2xl border border-dashed border-[#3a3a3a] bg-[#121212] px-4 py-16 text-center text-sm text-[#a8a8a8]">Nenhum post por enquanto.</div> : (
                <div className="space-y-3 p-2">
                  {posts.map((post) => (
                    <div key={post.id} className="rounded-2xl border border-[#262626] bg-[#111111] p-4"><p className="text-sm text-[#f5f5f5] whitespace-pre-wrap leading-relaxed">{post.content}</p></div>
                  ))}
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </AppShell>
  )
}