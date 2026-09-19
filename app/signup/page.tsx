'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

const COUNTRIES = ['Brasil','Portugal','EUA','Argentina','Outro']
const BR_STATES = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']

export default function SignupPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    email: '', password: '', confirmPassword: '', full_name: '', username: '',
    country: 'Brasil', state: 'SP', city: '',
  })
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [loading, setLoading] = useState(false)

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!acceptTerms) return toast.error('Você precisa aceitar os Termos de Uso e Privacidade.')
    if (!form.password) return toast.error('Digite uma senha.')
    if (form.password.length < 6) return toast.error('Senha deve ter ao menos 6 caracteres.')
    if (!form.confirmPassword) return toast.error('Confirme sua senha.')
    if (form.password !== form.confirmPassword) return toast.error('As senhas não coincidem.')
    if (!form.username.match(/^[a-z0-9_.]{3,20}$/i)) return toast.error('Username inválido (3-20 caracteres).')

    setLoading(true)
    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          full_name: form.full_name,
          username: form.username.toLowerCase(),
          country: form.country,
          state: form.state,
          city: form.city,
        }
      }
    })
    if (error) { setLoading(false); return toast.error(error.message) }

    if (data.user) {
      // FALLBACK ROBUSTO: garantir que o profile existe.
      // O trigger no DB (handle_new_user) também tenta criar, mas se falhar
      // (ex: trigger dropado, migration não rodada, race condition), este INSERT
      // é a rede de segurança para o usuário não ficar "sem perfil".
      try {
        const { error: profileErr } = await supabase.from('profiles').insert({
          id: data.user.id,
          username: form.username.toLowerCase(),
          email: form.email,
          full_name: form.full_name,
          country: form.country,
          state: form.state,
          city: form.city,
          avatar_url: '',
          bio: '',
        })
        // Se der erro de duplicate key (profile já existe via trigger), tudo bem
        if (profileErr && !profileErr.message.toLowerCase().includes('duplicate')) {
          console.warn('Falha ao criar profile (fallback):', profileErr)
        }
      } catch (err) {
        console.warn('Erro inesperado ao criar profile:', err)
      }

      // Salvar terms_acceptance
      await supabase.from('terms_acceptance').insert({
        user_id: data.user.id,
        terms_version: 'v1.0',
        privacy_version: 'v1.0',
      })
      toast.success('Conta criada! Verifique seu email.')
      router.push('/login?verify=1')
    }
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md p-6 fade-in">
        <div className="text-center mb-10">
          <div className="text-3xl font-light tracking-[0.3em] text-white">MISH<span className="opacity-60">H</span></div>
          <p className="text-[#a8a8a8] text-sm mt-3 font-light tracking-wide">Crie sua conta</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <input required type="text" placeholder="Nome completo" value={form.full_name} onChange={e=>set('full_name', e.target.value)}
            className="w-full p-3.5 rounded-full text-sm bg-[#262626] text-white placeholder:text-[#a8a8a8] font-light" />
          <input required type="text" placeholder="@username (único)" value={form.username} onChange={e=>set('username', e.target.value.replace(/\s/g,''))}
            className="w-full p-3.5 rounded-full text-sm bg-[#262626] text-white placeholder:text-[#a8a8a8] font-light" />
          <input required type="email" placeholder="Email" value={form.email} onChange={e=>set('email', e.target.value)}
            className="w-full p-3.5 rounded-full text-sm bg-[#262626] text-white placeholder:text-[#a8a8a8] font-light" />
          <input required type="password" placeholder="Senha (mín. 6)" value={form.password} onChange={e=>set('password', e.target.value)}
            className="w-full p-3.5 rounded-full text-sm bg-[#262626] text-white placeholder:text-[#a8a8a8] font-light" />
          <input required type="password" placeholder="Confirmar senha" value={form.confirmPassword} onChange={e=>set('confirmPassword', e.target.value)}
            className="w-full p-3.5 rounded-full text-sm bg-[#262626] text-white placeholder:text-[#a8a8a8] font-light" />

          <div className="grid grid-cols-2 gap-2">
            <select value={form.country} onChange={e=>set('country', e.target.value)}
              className="p-3.5 rounded-full text-sm bg-[#262626] text-white font-light">
              {COUNTRIES.map(c => <option key={c}>{c}</option>)}
            </select>
            <select value={form.state} onChange={e=>set('state', e.target.value)}
              className="p-3.5 rounded-full text-sm bg-[#262626] text-white font-light">
              {BR_STATES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <input required type="text" placeholder="Cidade" value={form.city} onChange={e=>set('city', e.target.value)}
            className="w-full p-3.5 rounded-full text-sm bg-[#262626] text-white placeholder:text-[#a8a8a8] font-light" />

          <label className="flex items-start gap-2 text-sm text-[#a8a8a8] pt-2 font-light">
            <input type="checkbox" checked={acceptTerms} onChange={e=>setAcceptTerms(e.target.checked)} className="mt-1 accent-white" required />
            <span>Eu li e aceito os <Link href="/terms" className="text-white underline">Termos de Uso</Link> e a <Link href="/privacy" className="text-white underline">Política de Privacidade</Link>.</span>
          </label>

          <button disabled={loading} className="w-full bg-white text-black font-light py-3.5 rounded-full hover:opacity-90 disabled:opacity-50 tracking-wide mt-2">
            {loading ? 'Criando...' : 'Criar conta'}
          </button>
        </form>

        <p className="text-center text-sm text-[#a8a8a8] mt-8 font-light">
          Já tem conta? <Link href="/login" className="text-white font-light tracking-wide">Entrar</Link>
        </p>
      </div>
    </main>
  )
}