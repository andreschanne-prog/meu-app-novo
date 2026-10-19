'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { X } from 'lucide-react'

export default function AvisoUsuario() {
  const [aviso, setAviso] = useState<any>(null)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const run = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const { data: prof } = await supabase.from('profiles').select('city').eq('id', user.id).single()

      // 1. Busca todos avisos ativos
      const { data: avisos } = await supabase.from('admin_avisos').select('*').eq('ativo', true).order('created_at', { ascending: false })
      if (!avisos || avisos.length === 0) return

      // 2. Busca quais já viu
      const { data: vistos } = await supabase.from('user_avisos_vistos').select('aviso_id').eq('user_id', user.id)
      const vistosIds = new Set((vistos || []).map((v:any) => v.aviso_id))

      // 3. Acha o primeiro que ainda não viu e que faz sentido pro perfil
      const proximo = avisos.find((a:any) => {
        if (vistosIds.has(a.id)) return false
        if (a.tipo === 'cidade' && prof?.city) return false // só mostra falta cidade pra quem NÃO tem cidade
        return true
      })

      if (proximo) setAviso(proximo)
    }
    run()
  }, [])

  const dismiss = async () => {
    if (!userId || !aviso) return
    await supabase.from('user_avisos_vistos').insert({ user_id: userId, aviso_id: aviso.id })
    setAviso(null)
  }

  if (!aviso) return null

  return (
    <div className="bg-[#111] border border-yellow-500/30 rounded-2xl p-4 flex gap-3 mb-6 relative">
      <button onClick={dismiss} className="absolute top-2 right-2 p-1 rounded-full bg-[#262626]"><X className="w-3 h-3 text-white" /></button>
      <div className="w-10 h-10 rounded-full bg-yellow-400/20 flex items-center justify-center shrink-0">🔔</div>
      <div className="flex-1 pr-6">
        <p className="text-white text-sm font-medium">{aviso.titulo}</p>
        <p className="text-[#a8a8a8] text-xs mt-1">{aviso.mensagem}</p>
        <Link href={aviso.link_botao || '/settings/profile'} onClick={dismiss} className="inline-block mt-3 bg-white text-black text-xs px-4 py-2 rounded-full font-bold">
          {aviso.texto_botao || 'Ver'}
        </Link>
      </div>
    </div>
  )
}