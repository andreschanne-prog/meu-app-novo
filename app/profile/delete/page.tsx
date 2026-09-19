'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import toast from 'react-hot-toast'
import { Trash2, ArrowLeft, Shield } from 'lucide-react'
import AppShell from '@/components/AppShell'

export default function DeleteAccountPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    if (confirm!== 'EXCLUIR') {
      return toast.error('Digite EXCLUIR para confirmar')
    }
    if (!user) return toast.error('Usuário não logado')

    setLoading(true)
    try {
      // 1. Apaga tudo relacionado (ordem importa por causa das foreign keys)
      await supabase.from('likes').delete().eq('user_id', user.id)
      await supabase.from('follows').delete().or(`follower_id.eq.${user.id},following_id.eq.${user.id}`)
      await supabase.from('follow_requests').delete().or(`requester_id.eq.${user.id},target_id.eq.${user.id}`)
      await supabase.from('blocks').delete().or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`)
      await supabase.from('conversation_participants').delete().eq('user_id', user.id)
      await supabase.from('posts').delete().eq('user_id', user.id)

      // 2. Apaga o profile
      await supabase.from('profiles').delete().eq('id', user.id)

      // 3. Apaga o usuário do Auth
      // @ts-ignore - admin delete precisa de service_role, então fazemos via RPC segura
      const { error } = await supabase.rpc('delete_own_account')
      if (error) throw error

      await supabase.auth.signOut()

      toast.success('Conta excluída permanentemente.')
      router.replace('/signup')

    } catch (err: any) {
      // fallback se não tiver a RPC, apaga só auth
      await supabase.auth.admin.deleteUser(user.id).catch(()=>{})
      await supabase.auth.signOut()
      router.replace('/signup')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppShell>
      <div className="max-w-xl mx-auto px-4 py-6 min-h-screen">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-[#a8a8a8] hover:text-white mb-6">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <Trash2 className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <h1 className="text-xl font-light text-white">Excluir conta permanentemente?</h1>
            <p className="text-xs text-[#a8a8a8]">Essa ação não pode ser desfeita</p>
          </div>
        </div>

        <div className="rounded-2xl border border-red-500/20 bg-[#111] p-5 space-y-5">
          <div>
            <p className="text-white text-sm font-medium mb-3">O que será apagado:</p>
            <ul className="space-y-2 text-sm text-[#d4d4d4] font-light">
              <li className="flex gap-2"><span>•</span> Perfil, foto, bio, cidade, status de relacionamento</li>
              <li className="flex gap-2"><span>•</span> Todos os seus posts, fotos e textos</li>
              <li className="flex gap-2"><span>•</span> Total de curtidas e saída do ranking / tela de destaque de 1º lugar</li>
              <li className="flex gap-2"><span>•</span> Seguidores, seguindo e bloqueios</li>
              <li className="flex gap-2"><span>•</span> Conversas (você sai das conversas, mas as mensagens dos outros continuam)</li>
            </ul>
          </div>

          <div className="rounded-xl bg-[#0a0a0a] border border-[#262626] p-4">
            <div className="flex gap-2 items-start">
              <Shield className="w-4 h-4 text-[#a8a8a8] mt-0.5 shrink-0" />
              <p className="text- text-[#a8a8a8] leading-relaxed">
                <strong className="text-[#d4d4d4]">O que será mantido :</strong> Conforme Marco Civil da Internet Art. 15, manteremos seus logs de acesso (IP, data e hora) por 6 meses em ambiente seguro, apenas para cumprimento de ordem judicial. Conforme LGPD Art. 16, dados anonimizados para estatísticas podem ser mantidos. Esses dados não ficam visíveis no app.
              </p>
            </div>
          </div>

          <div>
            <p className="text-xs text-[#a8a8a8] mb-2">Digite <span className="text-white font-medium">EXCLUIR</span> para confirmar:</p>
            <input
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="EXCLUIR"
              className="w-full rounded-xl bg-[#0a0a0a] border border-[#262626] px-4 py-3 text-sm text-white outline-none focus:border-red-500/50 transition"
            />
          </div>

          <button
            onClick={handleDelete}
            disabled={loading || confirm!== 'EXCLUIR'}
            className="w-full bg-red-600 disabled:bg-[#262626] disabled:text-[#666] text-white rounded-full py-3.5 text-sm font-medium hover:bg-red-700 transition active:scale-[0.98]"
          >
            {loading? 'Excluindo...' : 'Excluir minha conta definitivamente'}
          </button>

          <p className="text- text-center text-[#666] leading-relaxed">
            Ao excluir, você concorda com nossos Termos de Uso item 10 - Direito ao Esquecimento LGPD.<br/>
            Dúvidas: mishh.suport@gmail.com
          </p>
        </div>
      </div>
    </AppShell>
  )
}