'use client'
import { useEffect, useState, useMemo } from 'react'
import AppShell from '@/components/AppShell'
import { supabase } from '@/lib/supabase'
import { Trophy, MapPin, ChevronDown, Search, X, Globe, Check, ArrowDown } from 'lucide-react'
import { VerifiedBadge } from '@/components/VerifiedBadge'
import OnlineBadge from '@/components/OnlineBadge'
import { isUserOnline } from '@/hooks/usePresence'

type Item = {
  user_id: string
  username: string
  full_name: string | null
  avatar_url: string | null
  country: string | null
  state: string | null
  city: string | null
  total_likes: number
  verificado?: boolean
  online?: boolean
  last_seen?: string | null
}

function Medalha({ posicao }: { posicao: number }) {
  if (posicao === 1) return <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#fff3a0] via-[#D4AF37] to-[#8a6a12] flex items-center justify-center text-white text-xs font-bold">1</div>
  if (posicao === 2) return <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#ffffff] via-[#C0C0C0] to-[#707070] flex items-center justify-center text-white text-xs font-bold">2</div>
  if (posicao === 3) return <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#ffd09b] via-[#CD7F32] to-[#7a421c] flex items-center justify-center text-white text-xs font-bold">3</div>
  return <span className="text-[#a8a8a8] font-light text-sm">#{posicao}</span>
}

const ESTADOS_BRASIL = [
  { uf: 'AC', nome: 'Acre' }, { uf: 'AL', nome: 'Alagoas' }, { uf: 'AP', nome: 'Amapá' },
  { uf: 'AM', nome: 'Amazonas' }, { uf: 'BA', nome: 'Bahia' }, { uf: 'CE', nome: 'Ceará' },
  { uf: 'DF', nome: 'Distrito Federal' }, { uf: 'ES', nome: 'Espírito Santo' }, { uf: 'GO', nome: 'Goiás' },
  { uf: 'MA', nome: 'Maranhão' }, { uf: 'MT', nome: 'Mato Grosso' }, { uf: 'MS', nome: 'Mato Grosso do Sul' },
  { uf: 'MG', nome: 'Minas Gerais' }, { uf: 'PA', nome: 'Pará' }, { uf: 'PB', nome: 'Paraíba' },
  { uf: 'PR', nome: 'Paraná' }, { uf: 'PE', nome: 'Pernambuco' }, { uf: 'PI', nome: 'Piauí' },
  { uf: 'RJ', nome: 'Rio de Janeiro' }, { uf: 'RN', nome: 'Rio Grande do Norte' }, { uf: 'RS', nome: 'Rio Grande do Sul' },
  { uf: 'RO', nome: 'Rondônia' }, { uf: 'RR', nome: 'Roraima' }, { uf: 'SC', nome: 'Santa Catarina' },
  { uf: 'SP', nome: 'São Paulo' }, { uf: 'SE', nome: 'Sergipe' }, { uf: 'TO', nome: 'Tocantins' },
]

export default function RankingPage() {
  const [scope, setScope] = useState('world')
  const [items, setItems] = useState<Item[]>([])
  const [myCtx, setMyCtx] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [selectedUF, setSelectedUF] = useState<string | null>(null)
  const [selectedCity, setSelectedCity] = useState<string | null>(null)
  const [cities, setCities] = useState<string[]>([])
  const [loadingCities, setLoadingCities] = useState(false)
  const [showStateModal, setShowStateModal] = useState(false)
  const [showCityModal, setShowCityModal] = useState(false)
  const [searchState, setSearchState] = useState('')
  const [searchCity, setSearchCity] = useState('')

  useEffect(() => {
    const run = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setMyCtx(prof || {})
    }
    run()
  }, [])

  useEffect(() => {
    if (showStateModal || showCityModal) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [showStateModal, showCityModal])

  useEffect(() => {
    if (!selectedUF) { setCities([]); setSelectedCity(null); return }
    setLoadingCities(true)
    fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${selectedUF}/municipios`)
    .then((r) => r.json())
    .then((data: any[]) => {
        setCities(data.map((c) => c.nome).sort((a: string, b: string) => a.localeCompare(b)))
        setLoadingCities(false)
      })
    .catch(() => setLoadingCities(false))
  }, [selectedUF])

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      const args: any = { p_country: null, p_state: null, p_city: null }
      if (scope === 'country') args.p_country = myCtx.country || 'Brasil'
      if (scope === 'state') { args.p_country = myCtx.country || 'Brasil'; args.p_state = selectedUF || myCtx.state }
      if (scope === 'city') { args.p_country = myCtx.country || 'Brasil'; args.p_state = selectedUF || myCtx.state; args.p_city = selectedCity || myCtx.city }
      const { data } = await supabase.rpc('get_ranking', args)
      // AQUI A REGRA QUE VOCÊ PEDIU
      let limit = 30
      if (scope === 'state') limit = 10
      if (scope === 'city') limit = 10
      if (scope === 'world' || scope === 'country') limit = 30
      setItems((data || []).slice(0, limit))
      setLoading(false)
    }
    run()
  }, [scope, myCtx.country, myCtx.state, myCtx.city, selectedUF, selectedCity])

  const filteredStates = useMemo(() => ESTADOS_BRASIL.filter((e) => e.nome.toLowerCase().includes(searchState.toLowerCase()) || e.uf.toLowerCase().includes(searchState.toLowerCase())), [searchState])
  const filteredCities = useMemo(() => cities.filter((c) => c.toLowerCase().includes(searchCity.toLowerCase())), [cities, searchCity])

  return (
    <AppShell>
      <h2 className="text-xl sm:text-2xl font-light mb-6 flex items-center gap-2 text-white tracking-wide"><Trophy className="text-white w-5 h-5 sm:w-6 sm:h-6" />Ranking</h2>

      <div className="flex gap-2 overflow-x-auto no-scrollbar mb-4 -mx-2 px-2">
        <button onClick={() => setScope('world')} className={`px-4 py-2 rounded-full text-sm whitespace-nowrap shrink-0 flex items-center gap-1.5 ${scope === 'world'? 'bg-white text-black' : 'bg-[#262626] text-white'}`}><Globe className="w-3.5 h-3.5" /> Mundo</button>
        <button onClick={() => setScope('country')} className={`px-4 py-2 rounded-full text-sm whitespace-nowrap shrink-0 ${scope === 'country'? 'bg-white text-black' : 'bg-[#262626] text-white'}`}>País</button>
        <button onClick={() => setScope('state')} className={`px-4 py-2 rounded-full text-sm whitespace-nowrap shrink-0 ${scope === 'state'? 'bg-white text-black' : 'bg-[#262626] text-white'}`}>Estado</button>
        <button onClick={() => setScope('city')} className={`px-4 py-2 rounded-full text-sm whitespace-nowrap shrink-0 ${scope === 'city'? 'bg-white text-black' : 'bg-[#262626] text-white'}`}>Cidade</button>
      </div>

      {(scope === 'state' || scope === 'city') && (
        <div className="mb-6 grid grid-cols-2 gap-2">
          <button onClick={() => setShowStateModal(true)} className="flex items-center justify-between rounded-2xl border border-[#262626] bg-[#171717] px-4 py-3.5 text-left">
            <div className="flex items-center gap-2.5 min-w-0"><div className="h-8 w-8 rounded-full bg-[#262626] flex items-center justify-center"><MapPin className="w-4 h-4 text-white" /></div><div className="min-w-0"><p className="text-[10px] uppercase tracking-widest text-[#a8a8a8]">Estado</p><p className="text-sm text-white truncate font-light">{selectedUF? ESTADOS_BRASIL.find((e) => e.uf === selectedUF)?.nome : 'Todos'}</p></div></div><ChevronDown className="w-4 h-4 text-[#a8a8a8] shrink-0" />
          </button>
          <button onClick={() => { if (selectedUF) setShowCityModal(true) }} disabled={!selectedUF} className={`flex items-center justify-between rounded-2xl border px-4 py-3.5 text-left ${!selectedUF? 'border-[#1a1a1a] bg-[#0f0f0f] opacity-50' : 'border-[#262626] bg-[#171717]'}`}>
            <div className="flex items-center gap-2.5 min-w-0"><div className="h-8 w-8 rounded-full bg-[#262626] flex items-center justify-center"><MapPin className="w-4 h-4 text-white" /></div><div className="min-w-0"><p className="text-[10px] uppercase tracking-widest text-[#a8a8a8]">Cidade</p><p className="text-sm text-white truncate font-light">{selectedCity || (selectedUF? 'Todas' : 'Escolha um estado')}</p></div></div><ChevronDown className="w-4 h-4 text-[#a8a8a8] shrink-0" />
          </button>
        </div>
      )}

      {showStateModal && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4" onClick={() => setShowStateModal(false)}>
          <div className="w-full sm:max-w-md h-[85vh] sm:h-[80vh] rounded-t-[24px] sm:rounded-[24px] bg-[#111] border border-[#262626] flex flex-col overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="shrink-0 p-5 border-b border-[#262626] bg-[#111]">
              <div className="flex items-center justify-between mb-4"><h3 className="text-white font-light text-base">Selecione o Estado</h3><button onClick={() => setShowStateModal(false)} className="p-2.5 rounded-full bg-[#1a1a1a]"><X className="w-4 h-4 text-white" /></button></div>
              <div className="relative"><Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a8a8a8]" /><input autoFocus value={searchState} onChange={(e) => setSearchState(e.target.value)} placeholder="Buscar estado... ex: São Paulo" className="w-full rounded-full bg-[#171717] border border-[#262626] pl-11 pr-10 py-3.5 text-sm text-white outline-none" />{searchState && <button onClick={() => setSearchState('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1"><X className="w-4 h-4 text-[#a8a8a8]" /></button>}</div>
              <p className="mt-3 text-[11px] text-[#666] flex items-center gap-1"><ArrowDown className="w-3 h-3" /> {filteredStates.length} estados • arraste pra ver todos</p>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              <button onClick={() => { setSelectedUF(null); setSelectedCity(null); setShowStateModal(false) }} className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl hover:bg-[#171717] text-left"><span className="text-sm text-white font-light">Todos os estados</span>{!selectedUF && <Check className="w-4 h-4 text-white" />}</button>
              {filteredStates.map((est) => (<button key={est.uf} onClick={() => { setSelectedUF(est.uf); setSelectedCity(null); setShowStateModal(false) }} className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl hover:bg-[#171717] text-left"><div><p className="text-sm text-white font-light">{est.nome}</p><p className="text-xs text-[#a8a8a8]">{est.uf}</p></div>{selectedUF === est.uf && <Check className="w-4 h-4 text-white" />}</button>))}
            </div>
          </div>
        </div>
      )}

      {showCityModal && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4" onClick={() => setShowCityModal(false)}>
          <div className="w-full sm:max-w-md h-[85vh] sm:h-[80vh] rounded-t-[24px] sm:rounded-[24px] bg-[#111] border border-[#262626] flex flex-col overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="shrink-0 p-5 border-b border-[#262626] bg-[#111]">
              <div className="flex items-center justify-between mb-4"><h3 className="text-white font-light text-base">Cidades de {selectedUF}</h3><button onClick={() => setShowCityModal(false)} className="p-2.5 rounded-full bg-[#1a1a1a]"><X className="w-4 h-4 text-white" /></button></div>
              <div className="relative"><Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a8a8a8]" /><input autoFocus value={searchCity} onChange={(e) => setSearchCity(e.target.value)} placeholder="Buscar cidade..." className="w-full rounded-full bg-[#171717] border border-[#262626] pl-11 pr-10 py-3.5 text-sm text-white outline-none" />{searchCity && <button onClick={() => setSearchCity('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1"><X className="w-4 h-4 text-[#a8a8a8]" /></button>}</div>
              <p className="mt-3 text-[11px] text-[#666] flex items-center gap-1"><ArrowDown className="w-3 h-3" /> {loadingCities? 'Carregando...' : `${filteredCities.length} cidades • arraste pra ver todas`}</p>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {loadingCities? (<div className="py-16 text-center"><div className="animate-spin w-6 h-6 border-2 border-[#333] border-t-white rounded-full mx-auto mb-3" /><p className="text-[#a8a8a8] text-sm">Carregando cidades...</p></div>) : (<><button onClick={() => { setSelectedCity(null); setShowCityModal(false) }} className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl hover:bg-[#171717] text-left"><span className="text-sm text-white font-light">Todas as cidades</span>{!selectedCity && <Check className="w-4 h-4 text-white" />}</button>{filteredCities.map((city) => (<button key={city} onClick={() => { setSelectedCity(city); setShowCityModal(false); setScope('city') }} className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl hover:bg-[#171717] text-left"><span className="text-sm text-white font-light truncate pr-2">{city}</span>{selectedCity === city && <Check className="w-4 h-4 text-white shrink-0" />}</button>))}{filteredCities.length === 0 && <p className="text-center py-10 text-[#666] text-sm">Nenhuma cidade encontrada</p>}</>)}
            </div>
          </div>
        </div>
      )}

      {loading && <div className="text-center text-[#a8a8a8] py-6 text-sm font-light">Carregando...</div>}
      {!loading && items.length === 0 && <div className="py-12 text-center text-sm text-[#a8a8a8] font-light">Sem dados para este filtro.</div>}

      <ol className="space-y-3 pb-10">
        {items.map((it, i) => {
          let medalhaClasse = 'border-transparent bg-[#0a0a0a]'
          if (i === 0) medalhaClasse = 'border-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.25)]'
          else if (i === 1) medalhaClasse = 'border-[#C0C0C0] shadow-[0_0_12px_rgba(192,192,192,0.18)]'
          else if (i === 2) medalhaClasse = 'border-[#CD7F32] shadow-[0_0_12px_rgba(205,127,50,0.18)]'
          return (
            <li key={it.user_id} className={`relative p-3 rounded-2xl flex items-center gap-3 border ${medalhaClasse}`}>
              {i < 3 && <div className="absolute inset-0 rounded-2xl bg-[#0a0a0a] pointer-events-none" />}
              <div className="relative z-10 w-9 flex items-center justify-center shrink-0"><Medalha posicao={i + 1} /></div>
              <div className="relative z-10 shrink-0"><div className={`w-11 h-11 rounded-full bg-[#262626] overflow-hidden ${it.verificado? 'ring-2 ring-[#D4AF37] ring-offset-2 ring-offset-[#0a0a0a]' : ''}`}>{it.avatar_url? <img src={it.avatar_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[#a8a8a8] text-sm">{it.username?.[0]?.toUpperCase()}</div>}</div>{isUserOnline(it) &&!it.verificado && <OnlineBadge size={12} />}{it.verificado && <div className="absolute -bottom-0.5 -right-0.5"><VerifiedBadge size={16} /></div>}</div>
              <div className="relative z-10 flex-1 min-w-0"><div className="text-sm truncate text-white">@{it.username}</div><div className="text-[11px] text-[#a8a8a8] truncate">{it.city} · {it.state}</div></div>
              <div className="relative z-10 text-white text-sm shrink-0">{it.total_likes}</div>
            </li>
          )
        })}
      </ol>
    </AppShell>
  )
}