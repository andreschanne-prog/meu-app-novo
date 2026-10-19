'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { ChevronDown, MapPin, X } from 'lucide-react'

export default function AvisoUsuario() {
  const [aviso, setAviso] = useState<any>(null)
  const [collapsed, setCollapsed] = useState(false)
  const [closed, setClosed] = useState(false)

  useEffect(() => {
    const buscar = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase.from('profiles').select('city').eq('id', user.id).single()
      const temCidade = !!profile?.city

      const { data: vistos } = await supabase.from('user_avisos_vistos').select('aviso_id').eq('user_id', user.id)
      const ids = vistos?.map((v:any)=>v.aviso_id) || []

      let q = supabase.from('admin_avisos').select('*').eq('ativo', true).order('created_at', { ascending: false })
      if (ids.length) q = q.not('id', 'in', `(${ids.join(',')})`)
      const { data } = await q.limit(1)
      if (!data?.length) return

      const av = data[0]
      if (av.tipo === 'cidade' && temCidade) {
        await supabase.from('user_avisos_vistos').insert({ user_id: user.id, aviso_id: av.id })
        return
      }
      setAviso(av)
    }
    buscar()
  }, [])

  const fechar = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user && aviso) await supabase.from('user_avisos_vistos').insert({ user_id: user.id, aviso_id: aviso.id })
    setClosed(true)
  }

  if (!aviso || closed) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex flex-col items-center">
      <button onClick={()=>setCollapsed(!collapsed)} className="bg-[#171717] border border-[#262626] border-b-0 rounded-t-xl px-4 py-1.5 flex items-center gap-1.5 -mb-px">
        <ChevronDown className={`w-4 h-4 text-white transition-transform ${collapsed?'rotate-180':''}`} />
        <span className="text- text-[#a8a8a8] uppercase tracking-widest">{collapsed?'Mostrar':'Ocultar'}</span>
      </button>
      <div className={`w-full bg-[#111] border-t border-[#262626] transition-all ${collapsed?'h-0 border-t-0':'h-auto'}`}>
        <div className="p-4 flex gap-3">
          <div className="w-10 h-10 rounded-full bg-[#262626] flex items-center justify-center shrink-0"><MapPin className="w-5 h-5 text-[#D4AF37]" /></div>
          <div className="flex-1">
            <div className="flex justify-between"><h4 className="text-white text-sm">{aviso.titulo}</h4><button onClick={fechar}><X className="w-4 h-4 text-[#666]" /></button></div>
            <p className="text-[#a8a8a8] text-xs mt-1">{aviso.mensagem}</p>
            <Link href={aviso.link_botao} onClick={fechar} className="inline-block mt-3 bg-white text-black text-xs px-5 py-2.5 rounded-full">{aviso.texto_botao}</Link>
          </div>
        </div>
      </div>
    </div>
  )
}