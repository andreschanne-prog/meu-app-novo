'use client'
import { useEffect, useState, useMemo } from 'react'
import AppShell from '@/components/AppShell'
import { supabase } from '@/lib/supabase'
import { isAdmin } from '@/lib/helpers'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import Link from 'next/link'

type TargetType = 'city' | 'country'
type CityItem = { city: string; state: string }

export default function AdminPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [allowed, setAllowed] = useState<boolean | null>(null)
  const [users, setUsers] = useState<any[]>([])
  const [ads, setAds] = useState<any[]>([])
  const [requests, setRequests] = useState<any[]>([])
  const [topMes, setTopMes] = useState<any[]>([])
  const [rankingSalvo, setRankingSalvo] = useState<any[]>([])
  const [destaques, setDestaques] = useState<any[]>([])
  const [denuncias, setDenuncias] = useState<any[]>([])
  const [stats, setStats] = useState({ online: [] as any[], adViews: 0, adClicks: 0 })
  const [tab, setTab] = useState<'stats'|'users'|'verified'|'ads'|'requests'|'destaques'|'denuncias'>('users')
  const [targetType, setTargetType] = useState<TargetType>('city')
  const [period, setPeriod] = useState('30')

  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>('')
  const [uploading, setUploading] = useState(false)
  const [cityInput, setCityInput] = useState('')
  const [stateInput, setStateInput] = useState('MT')
  const [selectedCities, setSelectedCities] = useState<CityItem[]>([])
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [destaqueCaption, setDestaqueCaption] = useState('')
  const [destaqueFile, setDestaqueFile] = useState<File | null>(null)
  const [destaquePreview, setDestaquePreview] = useState('')

  // ===== NOVO: CRESCIMENTO =====
  const [allProfiles, setAllProfiles] = useState<any[]>([])
  const [growthFilter, setGrowthFilter] = useState<'month'|'year'|'city'|'state'>('month')

  const verifiedUsers = useMemo(() => users.filter((u: any) => Boolean(u.verificado || u.is_verified)), [users])

  const growth = useMemo(() => {
    if (!allProfiles.length) return { total: 0, byMonth: [], byYear: [], byCity: [], byState: [], newThisMonth: 0 }

    const now = new Date()
    const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`

    const byMonth: Record<string, number> = {}
    const byYear: Record<string, number> = {}
    const byCity: Record<string, number> = {}
    const byState: Record<string, number> = {}

    allProfiles.forEach(p => {
      if (!p.created_at) return
      const d = new Date(p.created_at)
      const monthKey = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
      const yearKey = `${d.getFullYear()}`
      byMonth[monthKey] = (byMonth[monthKey]||0)+1
      byYear[yearKey] = (byYear[yearKey]||0)+1

      if (p.city) {
        const cityKey = `${p.city}${p.state? `/${p.state}` : ''}`
        byCity[cityKey] = (byCity[cityKey]||0)+1
      }
      if (p.state) {
        byState[p.state.toUpperCase()] = (byState[p.state.toUpperCase()]||0)+1
      }
    })

    const sortedMonth = Object.entries(byMonth).sort((a,b)=> a[0].localeCompare(b[0])).slice(-12)
    const sortedYear = Object.entries(byYear).sort((a,b)=> a[0].localeCompare(b[0]))
    const sortedCity = Object.entries(byCity).sort((a,b)=> b[1]-a[1]).slice(0,15)
    const sortedState = Object.entries(byState).sort((a,b)=> b[1]-a[1])

    return {
      total: allProfiles.length,
      byMonth: sortedMonth,
      byYear: sortedYear,
      byCity: sortedCity,
      byState: sortedState,
      newThisMonth: byMonth[thisMonthKey] || 0
    }
  }, [allProfiles])

  useEffect(() => {
    if (!user) return
    isAdmin(user.id).then(ok => {
      setAllowed(ok)
      if (!ok) router.replace('/feed')
    })
  }, [user])

  useEffect(() => { if (allowed) loadAll() }, [allowed])

  async function loadAll() {
    const since = new Date(Date.now() - 7*86400000).toISOString()
    const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
    const fimMes = new Date(new Date().getFullYear(), new Date().getMonth()+1, 1).toISOString()
    const [{ data: sessions }, { data: us }, { data: a }, { data: req }, { count: v }, { count: c }, { data: top }, { data: rank }, { data: dest }, { data: dens }, { data: all }] = await Promise.all([
      supabase.from('profiles').select('last_seen').gt('last_seen', since),
      supabase.from('profiles').select('*').order('last_seen', { ascending: false }).limit(100),
      supabase.from('ads').select('*').order('created_at', { ascending: false }),
      supabase.from('ad_requests').select('*, profiles(username)').eq('status','pending').order('created_at', { ascending: false }),
      supabase.from('ad_views').select('*', { count: 'exact', head: true }),
      supabase.from('ad_clicks').select('*', { count: 'exact', head: true }),
      supabase.rpc('get_top_liked_users_mes', { mes_inicio: inicioMes, mes_fim: fimMes, limit_count: 10 }),
      supabase.from('mishh_ranking_mensal').select('*').order('created_at', { ascending: false }),
      supabase.from('mishh_destaques').select('*').order('created_at', { ascending: false }).limit(20),
      supabase.from('denuncias').select('*').order('created_at', { ascending: false }),
      // BUSCA PARA ANALYTICS - 5000 perfis pra ter base real
      supabase.from('profiles').select('created_at, city, state').limit(5000),
    ])
    const m: Record<string, number> = {}
    ;(sessions||[]).forEach(p => {
      const d = new Date(p.last_seen).toISOString().slice(0,10)
      m[d] = (m[d]||0)+1
    })
    setStats({ online: Object.entries(m).sort().map(([d,n])=>({day:d.slice(5), users:n})), adViews: v||0, adClicks: c||0 })
    setUsers(us || [])
    setAds(a || [])
    setRequests(req || [])
    setTopMes(top || [])
    setRankingSalvo(rank || [])
    setDestaques(dest || [])
    setDenuncias(dens || [])
    setAllProfiles(all || [])

    if (top && top.length > 0) {
      const mesAtual = new Date().toISOString().slice(0,7)
      const jaSalvo = (rank || []).some((r:any) => r.mes === mesAtual)
      if (!jaSalvo) {
        await supabase.from('mishh_ranking_mensal').insert({ mes: mesAtual, ranking: top })
        const { data: rank2 } = await supabase.from('mishh_ranking_mensal').select('*').order('created_at', { ascending: false })
        setRankingSalvo(rank2 || [])
      }
    }
  }

  async function excluirUsuario(id: string, username: string) {
    if (id === user?.id) return toast.error('Você não pode excluir a si mesmo')
    const confirma1 = window.confirm(`EXCLUIR DEFINITIVAMENTE @${username}?\n\nConforme cláusula 9.1 dos Termos (violação de regras/leis).`)
    if (!confirma1) return
    const confirma2 = window.prompt(`Digite EXCLUIR para confirmar a exclusão de @${username}`)
    if (confirma2!== 'EXCLUIR') return toast.error('Cancelado')
    try {
      setDeletingId(id)
      const res = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: id })
      })
      if (!res.ok) {
        const { error } = await supabase.from('profiles').delete().eq('id', id)
        if (error) throw error
        toast.success(`Perfil @${username} excluído (só profiles). Crie a API /api/admin/delete-user`)
      } else {
        toast.success(`Usuário @${username} excluído - Termos 9.1`)
      }
      loadAll()
    } catch (e: any) {
      toast.error('Erro ao excluir: ' + e.message)
    } finally {
      setDeletingId(null)
    }
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5*1024*1024) return toast.error('Imagem muito grande, max 5MB')
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }
  function handleDestaqueImage(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setDestaqueFile(f)
    setDestaquePreview(URL.createObjectURL(f))
  }
  function addCity() {
    if (!cityInput.trim()) return toast.error('Digite a cidade')
    const newCity = { city: cityInput.trim(), state: stateInput.trim().toUpperCase() || 'MT' }
    if (selectedCities.some(c => c.city.toLowerCase() === newCity.city.toLowerCase() && c.state === newCity.state)) {
      return toast.error('Essa cidade já foi adicionada')
    }
    setSelectedCities([...selectedCities, newCity])
    setCityInput('')
  }
  function removeCity(idx: number) { setSelectedCities(selectedCities.filter((_, i) => i!== idx)) }
  async function uploadImage(): Promise<string> {
    if (!imageFile) throw new Error('Selecione uma foto')
    const fd = new FormData()
    fd.append('file', imageFile)
    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    const data = await res.json()
    if (!data.url) throw new Error('Falha no upload')
    return data.url
  }
  async function createDestaque(){
    if(!destaqueFile) return toast.error('Escolha a foto')
    if(!destaqueCaption.trim()) return toast.error('Digite a legenda')
    try{
      setUploading(true)
      const fd2 = new FormData()
      fd2.append('file', destaqueFile)
      const res2 = await fetch('/api/upload', { method: 'POST', body: fd2 })
      const data2 = await res2.json()
      if (!data2.url) throw new Error('Falha no upload')
      const { error } = await supabase.from('mishh_destaques').insert({ image_url: data2.url, caption: destaqueCaption })
      if(error) throw error
      toast.success('Destaque postado!')
      setDestaqueCaption(''); setDestaqueFile(null); setDestaquePreview('')
      loadAll()
    }catch(e:any){ toast.error(e.message) } finally{ setUploading(false) }
  }
  async function createAd(e: React.FormEvent) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget as HTMLFormElement)
    const title = String(fd.get('title'))
    const target_url = String(fd.get('target_url') || '')
    const client_name = String(fd.get('client_name') || '')
    if (!imageFile) return toast.error('Selecione a foto')
    if (targetType === 'city' && selectedCities.length === 0) return toast.error('Adicione pelo menos 1 cidade')
    try {
      setUploading(true)
      const image_url = await uploadImage()
      const starts_at = new Date()
      const ends_at = new Date()
      ends_at.setDate(starts_at.getDate() + parseInt(period))
      const { error } = await supabase.from('ads').insert({
        title, image_url, target_url, client_name,
        target_type: targetType,
        city: targetType === 'city'? selectedCities[0]?.city : null,
        state: targetType === 'city'? selectedCities[0]?.state : null,
        cities: targetType === 'city'? selectedCities : [],
        country: 'Brasil',
        starts_at: starts_at.toISOString(),
        ends_at: ends_at.toISOString(),
        active: true,
      })
      if (error) throw error
      toast.success(`Criado!`)
      ;(e.target as HTMLFormElement).reset()
      setImageFile(null); setImagePreview(''); setSelectedCities([])
      loadAll()
    } catch (err: any) { toast.error(err.message) } finally { setUploading(false) }
  }
  async function toggleAdActive(id: string, current: boolean) { await supabase.from('ads').update({ active:!current }).eq('id', id); loadAll() }
  async function suspend(id: string, current: boolean) { await supabase.from('profiles').update({ is_suspended:!current }).eq('id', id); toast.success(current? 'Reativado.' : 'Suspenso.'); loadAll() }
  async function toggleVerify(id: string, current: boolean) {
    const nextValue = !current
    const payloads = [
      { verificado: nextValue },
      { is_verified: nextValue },
    ]

    let lastError: any = null
    for (const payload of payloads) {
      const { error } = await supabase.from('profiles').update(payload).eq('id', id)
      if (!error) {
        toast.success(current ? 'Selo removido.' : 'Verificado!')
        loadAll()
        return
      }
      lastError = error
      const message = String(error.message || '').toLowerCase()
      if (!message.includes('does not exist') && !message.includes('column') && !message.includes('permission')) {
        break
      }
    }

    console.error('toggleVerify error:', lastError)
    toast.error(`Não foi possível atualizar a verificação: ${lastError?.message || 'erro desconhecido'}`)
  }

  if (allowed === null) return <AppShell><div className="py-10 text-center text-[#a8a8a8] font-light">Verificando...</div></AppShell>
  if (!allowed) return null
  const isExpired = (ad: any) => ad.ends_at && new Date(ad.ends_at) < new Date()

  return (
    <AppShell hideFooter>
      <h1 className="text-xl sm:text-2xl font-light mb-4 text-white">Administração</h1>

      <div className="flex flex-wrap gap-2 mb-6">
        <button onClick={()=>setTab('stats')} className={`px-4 py-2 rounded-full text-xs ${tab==='stats'?'bg-white text-black':'bg-[#262626] text-white'}`}>Status</button>
        <button onClick={()=>setTab('users')} className={`px-4 py-2 rounded-full text-xs ${tab==='users'?'bg-white text-black':'bg-[#262626] text-white'}`}>Usuários ({growth.total})</button>
        <button onClick={()=>setTab('verified')} className={`px-4 py-2 rounded-full text-xs ${tab==='verified'?'bg-[#D4AF37] text-black':'bg-[#262626] text-white'}`}>Verificados ({verifiedUsers.length})</button>
        <button onClick={()=>setTab('ads')} className={`px-4 py-2 rounded-full text-xs ${tab==='ads'?'bg-white text-black':'bg-[#262626] text-white'}`}>Anúncios ({ads.length})</button>
        <button onClick={()=>setTab('requests')} className={`px-4 py-2 rounded-full text-xs ${tab==='requests'?'bg-white text-black':'bg-[#262626] text-white'}`}>Pedidos {requests.length>0? `(${requests.length})` : ''}</button>
        <button onClick={()=>setTab('destaques')} className={`px-4 py-2 rounded-full text-xs ${tab==='destaques'?'bg-[#ff6a00] text-white':'bg-[#262626] text-white'}`}>Destaques</button>
        <button onClick={()=>setTab('denuncias')} className={`px-4 py-2 rounded-full text-xs ${tab==='denuncias'?'bg-red-600 text-white':'bg-[#262626] text-white'}`}>🚨 Denúncias {denuncias.length>0? `(${denuncias.length})` : ''}</button>
      </div>

      {tab === 'stats' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#0a0a0a] p-4 rounded-2xl border border-[#262626]"><p className="text- uppercase text-[#a8a8a8]">Views anúncios</p><p className="text-xl text-white">{stats.adViews}</p></div>
            <div className="bg-[#0a0a0a] p-4 rounded-2xl border border-[#262626]"><p className="text- uppercase text-[#a8a8a8]">Cliques</p><p className="text-xl text-white">{stats.adClicks}</p></div>
          </div>
          <div className="bg-[#0a0a0a] p-4 rounded-2xl border border-[#262626]">
            <p className="text-xs text-[#a8a8a8] uppercase mb-2">Online últimos 7 dias</p>
            <div className="flex gap-2">
              {stats.online.map((o:any)=><div key={o.day} className="text-center"><div className="text-xs text-white">{o.users}</div><div className="text- text-[#555]">{o.day}</div></div>)}
            </div>
          </div>
        </div>
      )}

      {tab === 'users' && (
        <div className="space-y-4">
          {/* PAINEL DE CRESCIMENTO */}
          <div className="bg-[#0a0a0a] p-5 rounded-2xl border border-[#262626] space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-white text-sm font-medium">📈 Crescimento do MISHH</h2>
              <span className="text- px-2 py-1 rounded-full bg-white text-black">{growth.total} usuários totais</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#111] p-3 rounded-xl border border-[#1f1f1f]">
                <p className="text- text-[#777] uppercase">Total de usuários</p>
                <p className="text-2xl text-white font-light">{growth.total}</p>
              </div>
              <div className="bg-[#111] p-3 rounded-xl border border-[#1f1f1f]">
                <p className="text- text-[#777] uppercase">Novos este mês</p>
                <p className="text-2xl text-[#ff6a00] font-light">+{growth.newThisMonth}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={()=>setGrowthFilter('month')} className={`px-3 py-1.5 rounded-full text- ${growthFilter==='month'?'bg-white text-black':'bg-[#262626] text-white'}`}>Por Mês</button>
              <button onClick={()=>setGrowthFilter('year')} className={`px-3 py-1.5 rounded-full text- ${growthFilter==='year'?'bg-white text-black':'bg-[#262626] text-white'}`}>Por Ano</button>
              <button onClick={()=>setGrowthFilter('city')} className={`px-3 py-1.5 rounded-full text- ${growthFilter==='city'?'bg-white text-black':'bg-[#262626] text-white'}`}>Por Cidade</button>
              <button onClick={()=>setGrowthFilter('state')} className={`px-3 py-1.5 rounded-full text- ${growthFilter==='state'?'bg-white text-black':'bg-[#262626] text-white'}`}>Por Estado</button>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {growthFilter==='month' && growth.byMonth.map(([mes, qtd]) => {
                const max = Math.max(...growth.byMonth.map(([,v])=>v as number), 1)
                return (
                  <div key={mes} className="flex items-center gap-3">
                    <span className="text- text-[#a8a8a8] w-16">{mes}</span>
                    <div className="flex-1 bg-[#1a1a1a] rounded-full h-2 overflow-hidden"><div className="bg-white h-2" style={{width: `${(qtd/max)*100}%`}} /></div>
                    <span className="text- text-white w-8 text-right">{qtd}</span>
                  </div>
                )
              })}
              {growthFilter==='year' && growth.byYear.map(([ano, qtd]) => {
                const max = Math.max(...growth.byYear.map(([,v])=>v as number), 1)
                return (
                  <div key={ano} className="flex items-center gap-3">
                    <span className="text- text-[#a8a8a8] w-16">{ano}</span>
                    <div className="flex-1 bg-[#1a1a1a] rounded-full h-2 overflow-hidden"><div className="bg-[#ff6a00] h-2" style={{width: `${(qtd/max)*100}%`}} /></div>
                    <span className="text- text-white w-8 text-right">{qtd}</span>
                  </div>
                )
              })}
              {growthFilter==='city' && growth.byCity.map(([cidade, qtd]) => (
                <div key={cidade} className="flex justify-between items-center bg-[#111] p-2.5 rounded-xl border border-[#1f1f1f]">
                  <span className="text-xs text-white">📍 {cidade}</span>
                  <span className="text-xs text-[#ff6a00]">{qtd} usuários</span>
                </div>
              ))}
              {growthFilter==='state' && growth.byState.map(([estado, qtd]) => {
                const max = Math.max(...growth.byState.map(([,v])=>v as number), 1)
                return (
                  <div key={estado} className="flex items-center gap-3">
                    <span className="text- text-white w-10 font-medium">{estado}</span>
                    <div className="flex-1 bg-[#1a1a1a] rounded-full h-2 overflow-hidden"><div className="bg-green-500 h-2" style={{width: `${(qtd/max)*100}%`}} /></div>
                    <span className="text- text-white w-12 text-right">{qtd}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* LISTA DE USUÁRIOS */}
          <div className="space-y-2">
            <p className="text-xs text-[#a8a8a8] uppercase">Últimos 100 usuários</p>
            {users.map(u=>(
              <div key={u.id} className="bg-[#0a0a0a] p-3 rounded-2xl border border-[#262626] flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <img src={u.avatar_url||''} className="h-10 w-10 rounded-full bg-[#222]" alt="" />
                  <div>
                    <p className="text-sm text-white">@{u.username} {(u.verificado || u.is_verified) && '✔'}</p>
                    <p className="text- text-[#777]">{u.full_name} · {u.city||'sem cidade'}/{u.state||'?'} · {u.created_at? new Date(u.created_at).toLocaleDateString('pt-BR') : ''}</p>
                  </div>
                </div>
                <div className="flex gap-1 flex-wrap justify-end max-w-[60%]">
                  <button onClick={()=>toggleVerify(u.id, Boolean(u.verificado || u.is_verified))} className="text- px-3 py-1.5 rounded-full bg-[#262626] text-white">Verificar</button>
                  <button onClick={()=>suspend(u.id, u.is_suspended)} className={`text- px-3 py-1.5 rounded-full ${u.is_suspended?'bg-green-900 text-green-300':'bg-yellow-900/50 text-yellow-300'}`}>{u.is_suspended?'Reativar':'Suspender'}</button>
                  <button onClick={()=>excluirUsuario(u.id, u.username)} disabled={deletingId===u.id} className="text- px-3 py-1.5 rounded-full bg-red-900/80 hover:bg-red-800 text-red-200 border border-red-700/50 disabled:opacity-50">
                    {deletingId===u.id? 'Excluindo...' : '🗑 Excluir'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'verified' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs uppercase text-[#a8a8a8]">Usuários verificados</p>
            <span className="px-2 py-1 rounded-full bg-[#D4AF37] text-black text-[10px] font-bold">{verifiedUsers.length} ativos</span>
          </div>

          {verifiedUsers.length === 0 && (
            <div className="bg-[#0a0a0a] border border-[#262626] rounded-2xl p-8 text-center text-sm text-[#666]">
              Nenhum usuário verificado no momento.
            </div>
          )}

          {verifiedUsers.map((u: any) => (
            <div key={u.id} className="bg-[#0a0a0a] p-3 rounded-2xl border border-[#262626] flex justify-between items-center gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <img src={u.avatar_url || ''} className="h-10 w-10 rounded-full bg-[#222] object-cover" alt="" />
                <div className="min-w-0">
                  <p className="text-sm text-white truncate">@{u.username} <span className="text-[#D4AF37]">✔</span></p>
                  <p className="text-[11px] text-[#777] truncate">{u.full_name || 'Sem nome'} · {u.city || 'sem cidade'}/{u.state || '?'}</p>
                </div>
              </div>
              <div className="flex gap-1 flex-wrap justify-end">
                <button onClick={()=>toggleVerify(u.id, Boolean(u.verificado || u.is_verified))} className="text-[11px] px-3 py-1.5 rounded-full bg-[#D4AF37] text-black">Remover selo</button>
                <button onClick={()=>suspend(u.id, u.is_suspended)} className={`text-[11px] px-3 py-1.5 rounded-full ${u.is_suspended?'bg-green-900 text-green-300':'bg-yellow-900/50 text-yellow-300'}`}>{u.is_suspended?'Reativar':'Suspender'}</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* RESTANTE IGUAL - requests, destaques, denuncias, ads */}
      {tab === 'requests' && (
        <div className="space-y-3">
          {requests.map(r=>(
            <div key={r.id} className="bg-[#0a0a0a] p-4 rounded-2xl border border-[#262626]">
              <img src={r.image_url} className="w-full aspect-video object-cover rounded-xl mb-3" alt="" />
              <div className="text-sm text-white font-light">{r.title} · {r.client_name}</div>
              <div className="text-xs text-[#a8a8a8]">@{r.profiles?.username} · {r.whatsapp} · {r.target_type==='country'?'Brasil todo':r.cities?.map((c:any)=>c.city).join(', ')} · {r.period} dias</div>
              <div className="text-xs text-[#666] mt-2">{r.message}</div>
              <div className="flex gap-2 mt-3">
                <button onClick={async()=>{
                  const starts_at = new Date(); const ends_at = new Date(); ends_at.setDate(starts_at.getDate()+parseInt(r.period||'30'));
                  await supabase.from('ads').insert({ title:r.title, image_url:r.image_url, target_url:r.target_url, client_name:r.client_name, target_type:r.target_type, cities:r.cities, city:r.cities?.[0]?.city||null, state:r.cities?.[0]?.state||null, country:'Brasil', starts_at:starts_at.toISOString(), ends_at:ends_at.toISOString(), active:true })
                  await supabase.from('ad_requests').update({status:'approved'}).eq('id',r.id)
                  toast.success('Aprovado e no ar!'); loadAll()
                }} className="flex-1 bg-white text-black py-2 rounded-full text-xs">✅ Aprovar e colocar no ar</button>
                <button onClick={async()=>{ await supabase.from('ad_requests').update({status:'rejected'}).eq('id',r.id); loadAll() }} className="px-4 bg-[#262626] text-red-400 py-2 rounded-full text-xs">Rejeitar</button>
              </div>
            </div>
          ))}
          {requests.length===0 && <div className="text-center text-xs text-[#555] py-10">Nenhum pedido pendente</div>}
        </div>
      )}

      {tab === 'destaques' && (
        <div className="space-y-6">
          <div className="bg-[#0a0a0a] p-5 rounded-2xl border border-[#262626]">
            <div className="flex justify-between items-center mb-3">
              <p className="text-white text-sm">🏆 Top 10 mais curtidos DO MÊS</p>
              <span className="text- px-3 py-1 rounded-full bg-green-900/30 text-green-300">💾 Salvo automático</span>
            </div>
            <div className="space-y-2">
              {topMes.map((u:any,i:number)=>(
                <div key={u.user_id} className="flex justify-between items-center bg-[#111] p-3 rounded-xl border border-[#1f1f1f]">
                  <div className="flex items-center gap-3">
                    <span className="text-xs w-6 text-[#ff6a00]">#{i+1}</span>
                    <img src={u.avatar_url||''} className="h-8 w-8 rounded-full bg-[#222]" alt="" />
                    <div><p className="text-xs text-white">@{u.username}</p><p className="text- text-[#777]">{u.total_likes} curtidas no mês</p></div>
                  </div>
                  <Link href={`/user/${u.user_id}`} className="text- text-[#555]">ver</Link>
                </div>
              ))}
              {topMes.length===0 && <p className="text-xs text-[#555] text-center py-4">Sem curtidas esse mês ainda</p>}
            </div>
          </div>
          {rankingSalvo.length>0 && (
            <div className="bg-[#0a0a0a] p-4 rounded-2xl border border-[#262626]">
              <p className="text-xs text-[#a8a8a8] uppercase mb-2">Rankings salvos automaticamente</p>
              {rankingSalvo.map((r:any)=><div key={r.id} className="text-xs text-white flex justify-between py-2 border-b border-[#1f1f1f]"><span>📅 {r.mes} - {r.ranking?.length} usuários</span><button onClick={async()=>{ await supabase.from('mishh_ranking_mensal').delete().eq('id',r.id); loadAll() }} className="text-red-400">apagar</button></div>)}
            </div>
          )}
          <div className="bg-[#0a0a0a] p-5 rounded-2xl border border-[#262626] space-y-4">
            <p className="text-white text-sm">📸 Criar destaque</p>
            <label className="flex h-56 items-center justify-center rounded-2xl bg-[#262626] border border-dashed border-[#404040] cursor-pointer overflow-hidden">
              {destaquePreview? <img src={destaquePreview} className="h-full w-full object-cover" alt="" /> : <span className="text-xs text-[#a8a8a8]">Clique para escolher foto</span>}
              <input type="file" accept="image/*" onChange={handleDestaqueImage} className="hidden" />
            </label>
            <textarea value={destaqueCaption} onChange={e=>setDestaqueCaption(e.target.value)} placeholder="Legenda..." className="w-full p-3 rounded-2xl bg-[#262626] text-white text-sm" />
            <button onClick={createDestaque} disabled={uploading} className="w-full bg-[#ff6a00] text-white py-3 rounded-full text-sm">{uploading?'Postando...':'Postar no Destaques'}</button>
          </div>
          <div className="space-y-2">
            {destaques.map((d:any)=><div key={d.id} className="bg-[#0a0a0a] p-3 rounded-2xl border border-[#262626] flex gap-3"><img src={d.image_url} className="h-20 w-20 rounded-xl object-cover" alt="" /><div className="flex-1"><p className="text-xs text-white">{d.caption}</p><p className="text- text-[#555] mt-1">{new Date(d.created_at).toLocaleString('pt-BR')}</p><button onClick={async()=>{ await supabase.from('mishh_destaques').delete().eq('id',d.id); loadAll() }} className="text- text-red-400 mt-2">Apagar destaque</button></div></div>)}
          </div>
        </div>
      )}

      {tab === 'denuncias' && (
        <div className="space-y-3">
          {denuncias.map((d:any)=>(
            <div key={d.id} className="bg-[#0a0a0a] p-4 rounded-2xl border border-[#262626]">
              <p className="text-sm text-white">Denunciado: {d.denunciado_id || d.target_user || d.user_id}</p>
              <p className="text-xs text-[#a8a8a8] mt-1">Motivo: {d.motivo || d.reason || d.description}</p>
              <p className="text-xs text-[#555] mt-1">{new Date(d.created_at).toLocaleString('pt-BR')}</p>
              <div className="flex gap-2 mt-3">
                <button onClick={async()=>{ await supabase.from('denuncias').delete().eq('id', d.id); toast.success('Resolvida'); loadAll() }} className="px-4 py-2 rounded-full bg-[#262626] text-white text-xs">Resolver</button>
                <button onClick={async()=>{ if(d.denunciado_id) { await supabase.from('profiles').update({ is_suspended:true }).eq('id', d.denunciado_id); toast.success('Usuário suspenso'); loadAll() } }} className="px-4 py-2 rounded-full bg-red-900 text-red-300 text-xs">Suspender</button>
                {d.denunciado_id && <button onClick={()=>excluirUsuario(d.denunciado_id, d.denunciado_id)} className="px-4 py-2 rounded-full bg-red-600 text-white text-xs">🗑 Excluir</button>}
              </div>
            </div>
          ))}
          {denuncias.length===0 && <div className="text-center text-xs text-[#555] py-10">Nenhuma denúncia</div>}
        </div>
      )}

      {tab === 'ads' && (
        <div className="space-y-4">
          <form onSubmit={createAd} className="bg-[#0a0a0a] p-5 rounded-2xl space-y-4 border border-[#262626]">
            <div className="text-white font-light">Novo anúncio do cliente</div>
            <input name="client_name" required placeholder="Nome do cliente" className="w-full p-3 text-sm rounded-full bg-[#262626] text-white" />
            <input name="title" required placeholder="Título" className="w-full p-3 text-sm rounded-full bg-[#262626] text-white" />
            <input name="target_url" required placeholder="Site ou WhatsApp" className="w-full p-3 text-sm rounded-full bg-[#262626] text-white" />
            <div className="space-y-2">
              <div className="text-xs text-[#a8a8a8] uppercase">Foto da propaganda</div>
              <label className="flex flex-col items-center justify-center w-full h-36 rounded-2xl bg-[#262626] border border-dashed border-[#404040] cursor-pointer">
                {imagePreview? <img src={imagePreview} alt="" className="h-full w-full object-contain rounded-2xl" /> : <div className="text-xs text-[#a8a8a8]">📸 Clique para escolher</div>}
                <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
              </label>
            </div>
            <div className="space-y-3">
              <div className="text-xs text-[#a8a8a8] uppercase">Onde vai aparecer?</div>
              <div className="flex gap-2">
                <button type="button" onClick={()=>setTargetType('city')} className={`flex-1 py-3 rounded-full text-sm ${targetType==='city'?'bg-white text-black':'bg-[#262626] text-white'}`}>📍 Cidades</button>
                <button type="button" onClick={()=>setTargetType('country')} className={`flex-1 py-3 rounded-full text-sm ${targetType==='country'?'bg-white text-black':'bg-[#262626] text-white'}`}>🇧🇷 Brasil todo</button>
              </div>
              {targetType === 'city' && (
                <>
                  <div className="flex gap-2">
                    <input value={cityInput} onChange={e=>setCityInput(e.target.value)} placeholder="Cidade" className="flex-1 p-3 text-sm rounded-full bg-[#262626] text-white" />
                    <input value={stateInput} onChange={e=>setStateInput(e.target.value)} placeholder="UF" className="w-20 p-3 text-sm rounded-full bg-[#262626] text-white" />
                    <button type="button" onClick={addCity} className="px-5 rounded-full bg-white text-black text-sm">Add</button>
                  </div>
                  <div className="flex flex-wrap gap-2">{selectedCities.map((c, idx) => (<span key={idx} className="flex items-center gap-2 bg-[#1a1a1a] border border-[#333] text-white text-xs px-3 py-1.5 rounded-full">📍 {c.city}/{c.state}<button type="button" onClick={()=>removeCity(idx)} className="text-red-400">✕</button></span>))}</div>
                </>
              )}
            </div>
            <div className="space-y-2">
              <div className="text-xs text-[#a8a8a8] uppercase">Por quanto tempo?</div>
              <select value={period} onChange={e=>setPeriod(e.target.value)} className="w-full p-3 text-sm rounded-full bg-[#262626] text-white">
                <option value="30">1 mês</option><option value="90">3 meses</option><option value="180">6 meses</option><option value="365">1 ano</option>
              </select>
            </div>
            <button disabled={uploading} className="w-full bg-white text-black px-5 py-3 rounded-full text-sm disabled:opacity-50">{uploading? 'Enviando...' : 'Criar anúncio'}</button>
          </form>
          <div className="grid gap-3">
            {ads.map(a => {
              const expired = isExpired(a)
              const citiesList: CityItem[] = a.cities?.length? a.cities : (a.city? [{city: a.city, state: a.state}] : [])
              return (
                <div key={a.id} className={`bg-[#0a0a0a] p-4 rounded-2xl border ${expired? 'border-red-900/50 opacity-60' : 'border-[#262626]'}`}>
                  <img src={a.image_url} alt="" className="w-full aspect-video object-cover rounded-xl mb-3" />
                  <div className="flex justify-between items-start">
                    <div><div className="text-sm text-white">{a.title}</div><div className="text-xs text-[#a8a8a8]">{a.client_name}</div>
                      <div className="mt-2 flex gap-2 flex-wrap">
                        {a.target_type === 'country'? <span className="text- px-2 py-1 rounded-full bg-blue-900/30 text-blue-300">🇧🇷 Brasil todo</span> : citiesList.map((c: any, i: number) => (<span key={i} className="text- px-2 py-1 rounded-full bg-green-900/30 text-green-300">📍 {c.city}/{c.state}</span>))}
                        <span className={`text- px-2 py-1 rounded-full ${expired? 'bg-red-900/30 text-red-300' : 'bg-[#262626] text-[#a8a8a8]'}`}>{expired? 'Expirado' : `Até ${new Date(a.ends_at).toLocaleDateString('pt-BR')}`}</span>
                      </div>
                    </div>
                    <button onClick={()=>toggleAdActive(a.id, a.active)} className="text- px-3 py-1.5 rounded-full bg-[#262626] text-white">{a.active? 'Pausar' : 'Ativar'}</button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </AppShell>
  )
}