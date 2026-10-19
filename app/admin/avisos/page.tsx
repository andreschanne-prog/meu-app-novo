'use client'
import { useEffect, useState } from 'react'
import AppShell from '@/components/AppShell'
import { supabase } from '@/lib/supabase'
import { isAdmin } from '@/lib/helpers'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import Link from 'next/link'

export default function AvisosAdminPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [allowed, setAllowed] = useState<boolean | null>(null)
  const [avisos, setAvisos] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  // form
  const [titulo, setTitulo] = useState('Apareça no ranking da sua cidade')
  const [mensagem, setMensagem] = useState('Você está sem cidade cadastrada. Complete seu perfil para aparecer no filtro da sua cidade e outras pessoas te encontrarem.')
  const [tipo, setTipo] = useState('cidade')
  const [textoBotao, setTextoBotao] = useState('Completar agora')
  const [linkBotao, setLinkBotao] = useState('/settings/profile')

  useEffect(() => {
    if (!user) return
    isAdmin(user.id).then(ok => { setAllowed(ok); if (!ok) router.replace('/feed') })
  }, [user])

  useEffect(() => { if (allowed) loadAvisos() }, [allowed])

  async function loadAvisos() {
    const { data } = await supabase.from('admin_avisos').select('*, user_avisos_vistos(count)').order('created_at', { ascending: false })
    // busca contagem separada
    const { data: all } = await supabase.from('admin_avisos').select('*').order('created_at', { ascending: false })
    setAvisos(all || [])
  }

  async function criarAviso(e: React.FormEvent) {
    e.preventDefault()
    if (!titulo.trim() || !mensagem.trim()) return toast.error('Preencha título e mensagem')
    try {
      setLoading(true)
      const { error } = await supabase.from('admin_avisos').insert({
        titulo, mensagem, tipo, texto_botao: textoBotao, link_botao: linkBotao, ativo: true
      })
      if (error) throw error
      toast.success('Aviso criado! Vai aparecer 1 vez pra cada usuário que ainda não viu')
      setTitulo(''); setMensagem(''); loadAvisos()
    } catch (err:any) { toast.error(err.message) } finally { setLoading(false) }
  }

  if (allowed === null) return <AppShell><div className="py-10 text-center text-[#a8a8a8]">Verificando...</div></AppShell>
  if (!allowed) return null

  return (
    <AppShell hideFooter>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin" className="w-9 h-9 rounded-full bg-[#262626] flex items-center justify-center text-white">←</Link>
        <h1 className="text-xl font-light text-white">🔔 Avisar Usuários</h1>
      </div>

      <div className="bg-[#0a0a0a] p-5 rounded-2xl border border-[#262626] space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-white text-sm font-light">Criar novo aviso (aparece até metade da tela)</p>
          <span className="text- px-2 py-1 rounded-full bg-yellow-400 text-black font-bold">1x por usuário</span>
        </div>

        <form onSubmit={criarAviso} className="space-y-3">
          <input value={titulo} onChange={e=>setTitulo(e.target.value)} placeholder="Título - Ex: Complete sua cidade" className="w-full p-3.5 text-sm rounded-full bg-[#262626] text-white placeholder:text-[#777] border border-transparent focus:border-[#444] outline-none" />

          <textarea value={mensagem} onChange={e=>setMensagem(e.target.value)} placeholder="Mensagem que vai aparecer pro usuário..." className="w-full p-3.5 text-sm rounded-2xl bg-[#262626] text-white placeholder:text-[#777] border border-transparent focus:border-[#444] outline-none min-h-" />

          <div className="grid grid-cols-2 gap-2">
            <select value={tipo} onChange={e=>setTipo(e.target.value)} className="p-3.5 rounded-full text-sm bg-[#262626] text-white border border-transparent outline-none">
              <option value="cidade">📍 Falta cidade (só mostra pra quem não tem cidade)</option>
              <option value="geral">📢 Geral (mostra pra todo mundo)</option>
              <option value="novidade">✨ Novidade</option>
              <option value="alerta">⚠️ Alerta importante</option>
            </select>
            <input value={textoBotao} onChange={e=>setTextoBotao(e.target.value)} placeholder="Texto do botão" className="p-3.5 text-sm rounded-full bg-[#262626] text-white outline-none" />
          </div>

          <input value={linkBotao} onChange={e=>setLinkBotao(e.target.value)} placeholder="Link - /settings/profile ou /ranking" className="w-full p-3.5 text-sm rounded-full bg-[#262626] text-white outline-none" />

          <button disabled={loading} className="w-full bg-yellow-400 text-black font-bold py-3.5 rounded-full hover:bg-yellow-300 disabled:opacity-50 transition">
            {loading ? 'Criando...' : '🔔 Avisar todos agora'}
          </button>
          <p className="text- text-[#666] text-center">O aviso vai aparecer com a setinha pra ocultar que você queria, e some depois que o usuário clicar em X ou no botão.</p>
        </form>
      </div>

      {/* PREVIEW IGUAL VAI FICAR PRO USER */}
      {(titulo || mensagem) && (
        <div className="mt-6">
          <p className="text-xs text-[#a8a8a8] uppercase mb-2">Prévia de como vai aparecer:</p>
          <div className="bg-[#111] border border-[#262626] rounded-2xl p-4 flex gap-3">
            <div className="w-10 h-10 rounded-full bg-[#262626] flex items-center justify-center">📍</div>
            <div className="flex-1">
              <p className="text-white text-sm">{titulo || 'Título do aviso'}</p>
              <p className="text-[#a8a8a8] text-xs mt-1">{mensagem || 'Mensagem...'}</p>
              <span className="inline-block mt-3 bg-white text-black text-xs px-4 py-2 rounded-full">{textoBotao}</span>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 space-y-3">
        <p className="text-xs text-[#a8a8a8] uppercase">Histórico ({avisos.length})</p>
        {avisos.map((av:any)=>(
          <div key={av.id} className="bg-[#0a0a0a] p-4 rounded-2xl border border-[#262626] flex justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text- px-2 py-0.5 rounded-full ${av.tipo==='cidade'?'bg-green-900/50 text-green-300':'bg-[#262626] text-white'}`}>{av.tipo}</span>
                <span className={`text- px-2 py-0.5 rounded-full ${av.ativo?'bg-green-600 text-white':'bg-red-900 text-red-200'}`}>{av.ativo?'Ativo':'Pausado'}</span>
                <span className="text- text-[#555]">{new Date(av.created_at).toLocaleString('pt-BR')}</span>
              </div>
              <p className="text-sm text-white mt-2">{av.titulo}</p>
              <p className="text-xs text-[#a8a8a8] mt-1">{av.mensagem}</p>
            </div>
            <div className="flex flex-col gap-1">
              <button onClick={async()=>{ await supabase.from('admin_avisos').update({ ativo: !av.ativo }).eq('id', av.id); toast.success(av.ativo?'Pausado':'Ativado'); loadAvisos() }} className="text- px-3 py-1.5 rounded-full bg-[#262626] text-white">{av.ativo?'Pausar':'Ativar'}</button>
              <button onClick={async()=>{ if(confirm('Apagar esse aviso? Isso vai fazer ele sumir pra quem ainda não viu.')){ await supabase.from('admin_avisos').delete().eq('id', av.id); toast.success('Apagado'); loadAvisos() } }} className="text- px-3 py-1.5 rounded-full bg-red-900/50 text-red-300">Apagar</button>
            </div>
          </div>
        ))}
        {avisos.length===0 && <div className="text-center text-xs text-[#555] py-10">Nenhum aviso criado ainda.</div>}
      </div>
    </AppShell>
  )
}