'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { ChevronDown, MapPin, X } from 'lucide-react'

export default function AvisoCompletarPerfil() {
  const [aviso, setAviso] = useState<any>(null)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isClosed, setIsClosed] = useState(false)

  useEffect(() => {
    const buscarAvisoNaoVisto = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Busca o perfil pra saber se já tem cidade
      const { data: profile } = await supabase.from('profiles').select('city').eq('id', user.id).single()
      const temCidade = profile?.city && profile.city.trim().length >= 2

      // Busca avisos que esse usuário NUNCA viu
      const { data: avisosVistos } = await supabase.from('user_avisos_vistos').select('aviso_id').eq('user_id', user.id)
      const idsVistos = avisosVistos?.map(v => v.aviso_id) || []

      let query = supabase.from('admin_avisos').select('*').eq('ativo', true).order('created_at', { ascending: false })

      if (idsVistos.length > 0) {
        query = query.not('id', 'in', `(${idsVistos.join(',')})`)
      }

      const { data: avisos } = await query.limit(1)

      if (avisos && avisos.length > 0) {
        let proximoAviso = avisos[0]
        
        // REGRA: Se o aviso é de cidade e o user já tem cidade, pula esse aviso
        if (proximoAviso.tipo === 'cidade' && temCidade) {
          // Marca como visto automaticamente pra não mostrar de novo
          await supabase.from('user_avisos_vistos').insert({ user_id: user.id, aviso_id: proximoAviso.id })
          return
        }
        
        setAviso(proximoAviso)
      }
    }

    buscarAvisoNaoVisto()
  }, [])

  const fecharEPararDeMostrar = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user && aviso) {
      await supabase.from('user_avisos_vistos').insert({ user_id: user.id, aviso_id: aviso.id })
    }
    setIsClosed(true)
  }

  if (!aviso || isClosed) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex flex-col items-center">
      <button onClick={() => setIsCollapsed(!isCollapsed)} className="bg-[#171717] border border-[#262626] border-b-0 rounded-t-xl px-4 py-1.5 flex items-center gap-1.5 -mb-px">
        <ChevronDown className={`w-4 h-4 text-white transition-transform ${isCollapsed ? 'rotate-180' : ''}`} />
        <span className="text- text-[#a8a8a8] uppercase tracking-widest">{isCollapsed ? 'Mostrar aviso' : 'Ocultar'}</span>
      </button>

      <div className={`w-full bg-[#111] border-t border-[#262626] transition-all duration-300 ${isCollapsed ? 'h-0 border-t-0' : 'h-auto'}`}>
        <div className="p-4 flex gap-3">
          <div className="w-10 h-10 rounded-full bg-[#262626] flex items-center justify-center shrink-0">
            <MapPin className="w-5 h-5 text-[#D4AF37]" />
          </div>
          <div className="flex-1">
            <div className="flex justify-between">
              <h4 className="text-white text-sm font-light">{aviso.titulo}</h4>
              <button onClick={fecharEPararDeMostrar}><X className="w-4 h-4 text-[#666]" /></button>
            </div>
            <p className="text-[#a8a8a8] text-xs mt-1 font-light">{aviso.mensagem}</p>
            {aviso.link_botao && (
              <Link href={aviso.link_botao} onClick={fecharEPararDeMostrar} className="inline-block mt-3 bg-white text-black text-xs px-5 py-2.5 rounded-full">
                {aviso.texto_botao}
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}