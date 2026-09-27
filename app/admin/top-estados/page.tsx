'use client'
import { useEffect, useState } from 'react'
import AppShell from '@/components/AppShell'
import { supabase } from '@/lib/supabase'
import { isAdmin } from '@/lib/helpers'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const UFS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"]

export default function TopEstadosPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [allowed, setAllowed] = useState<boolean|null>(null)
  const [uf, setUf] = useState('MT')
  const [top, setTop] = useState<any[]>([])
  const [topBrasil, setTopBrasil] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(()=>{ if(user) isAdmin(user.id).then(ok=>{ setAllowed(ok); if(!ok) router.replace('/feed') }) },[user])

  async function loadTop(estado: string) {
    setLoading(true)
    const mes_inicio = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
    const mes_fim = new Date(new Date().getFullYear(), new Date().getMonth()+1, 1).toISOString()

    const [{ data: porEstado }, { data: brasil }] = await Promise.all([
      supabase.rpc('get_top_liked_users_por_estado', { estado, mes_inicio, limit_count: 10 }),
      supabase.rpc('get_top_liked_users_mes', { mes_inicio, mes_fim, limit_count: 10 })
    ])

    setTop(porEstado || [])
    setTopBrasil(brasil || [])
    setLoading(false)
  }

  useEffect(()=>{ if(allowed) loadTop(uf) },[allowed, uf])

  if(allowed===null) return <AppShell><div className="py-10 text-center text-[#a8a8a8]">Verificando...</div></AppShell>

  const maisCurtidoBrasil = topBrasil[0]

  return (
    <AppShell hideFooter>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-light text-white">🏆 Top 10 por Estado</h1>
        <Link href="/admin" className="px-4 py-2 rounded-full bg-[#262626] text-white text-xs">Voltar</Link>
      </div>

      {/* MAIS CURTIDO DO PAÍS */}
      {maisCurtidoBrasil && (
        <div className="bg-gradient-to-br from-[#ff6a00] to-[#ff3c00] p-[1px] rounded-2xl mb-4">
          <div className="bg-[#0a0a0a] p-4 rounded-2xl flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="text-2xl">👑</div>
              <img src={maisCurtidoBrasil.avatar_url||''} className="h-12 w-12 rounded-full object-cover border-2 border-[#ff6a00]" alt="" />
              <div>
                <p className="text-[11px] text-[#ff6a00] uppercase font-bold">Mais curtido do Brasil em {new Date().toLocaleDateString('pt-BR',{month:'long'})}</p>
                <p className="text-sm text-white font-medium">@{maisCurtidoBrasil.username} · {maisCurtidoBrasil.total_likes} curtidas</p>
                <p className="text-[11px] text-[#777]">{maisCurtidoBrasil.city||''} / {maisCurtidoBrasil.state||''}</p>
              </div>
            </div>
            <Link href={`/user/${maisCurtidoBrasil.user_id}`} className="text-xs px-4 py-2 rounded-full bg-white text-black">ver perfil</Link>
          </div>
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
        {UFS.map(e=>(
          <button key={e} onClick={()=>setUf(e)}
            className={`px-4 py-2 rounded-full text-xs whitespace-nowrap ${uf===e?'bg-white text-black':'bg-[#262626] text-white'}`}>{e}</button>
        ))}
      </div>

      <div className="bg-[#0a0a0a] p-5 rounded-2xl border border-[#262626]">
        <p className="text-sm text-white mb-3">Mais curtidos de {uf} - {new Date().toLocaleDateString('pt-BR',{month:'long', year:'numeric'})}</p>
        {loading? <p className="text-xs text-[#555]">Carregando...</p> :
          top.length===0? <p className="text-xs text-[#555] text-center py-8">Nenhum like em {uf} esse mês</p> :
          <div className="space-y-2">
            {top.map((u:any,i:number)=>(
              <div key={u.user_id} className="flex justify-between items-center bg-[#111] p-3 rounded-xl border border-[#1f1f1f]">
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-bold w-6 ${i<3?'text-[#ff6a00]':'text-[#555]'}`}>#{i+1}</span>
                  <img src={u.avatar_url||''} className="h-10 w-10 rounded-full bg-[#222] object-cover" alt="" />
                  <div>
                    <p className="text-sm text-white">@{u.username}</p>
                    <p className="text-[11px] text-[#777]">{u.city||uf} · {u.total_likes} curtidas</p>
                  </div>
                </div>
                <Link href={`/user/${u.user_id}`} className="text-xs px-3 py-1.5 rounded-full bg-[#262626] text-white">ver</Link>
              </div>
            ))}
          </div>
        }
      </div>

      {/* TOP 10 BRASIL COMPLETO */}
      <div className="bg-[#0a0a0a] p-5 rounded-2xl border border-[#262626] mt-4">
        <p className="text-sm text-white mb-3">🇧🇷 Top 10 Brasil - Mês atual</p>
        <div className="space-y-2">
          {topBrasil.map((u:any,i:number)=>(
            <div key={u.user_id} className="flex justify-between items-center bg-[#111] p-3 rounded-xl border border-[#1f1f1f]">
              <div className="flex items-center gap-3">
                <span className={`text-sm font-bold w-6 ${i===0?'text-[#D4AF37]': i<3?'text-[#ff6a00]':'text-[#555]'}`}>#{i+1}</span>
                <img src={u.avatar_url||''} className="h-8 w-8 rounded-full bg-[#222] object-cover" alt="" />
                <div>
                  <p className="text-xs text-white">@{u.username}</p>
                  <p className="text-[10px] text-[#777]">{u.state||'?'} · {u.total_likes} likes</p>
                </div>
              </div>
              <Link href={`/user/${u.user_id}`} className="text-[10px] text-[#555]">ver</Link>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  )
}