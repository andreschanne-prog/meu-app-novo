'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (params.get('verify')) toast.success('Conta criada! Confirme seu email antes de entrar.')
  }, [params])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setLoading(false); return toast.error(error.message) }

    // Garantir que o profile existe (rede de segurança se o trigger falhou no signup).
    // Tenta SELECT primeiro; se vier vazio, faz INSERT.
    const { data: existing } = await supabase
      .from('profiles')
      .select('id, is_suspended, username')
      .eq('id', data.user.id)
      .maybeSingle()

    if (!existing) {
      // profile não existe, inserir agora
      const username = (data.user.user_metadata?.username as string)
        || (data.user.email ? data.user.email.split('@')[0] : 'user')
      const { error: insErr } = await supabase.from('profiles').insert({
        id: data.user.id,
        username,
        email: data.user.email || '',
        full_name: (data.user.user_metadata?.full_name as string) || '',
        country: (data.user.user_metadata?.country as string) || '',
        state: (data.user.user_metadata?.state as string) || '',
        city: (data.user.user_metadata?.city as string) || '',
        avatar_url: (data.user.user_metadata?.avatar_url as string) || '',
        bio: '',
      })
      if (insErr && !insErr.message.toLowerCase().includes('duplicate')) {
        console.warn('Falha ao criar profile no login:', insErr)
      }
    } else if (existing.is_suspended) {
      await supabase.auth.signOut()
      setLoading(false)
      return toast.error('Conta suspensa. Contate mishh.suport@gmail.com')
    }

    toast.success('Bem-vindo ao MISHH!')
    router.push('/feed')
  }

  async function signInWithGoogle() {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/feed` }
    })
    if (error) {
      setLoading(false)
      toast.error(error.message)
    }
  }

  return (
    <main className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md p-8 fade-in">
        <div className="text-center mb-10">
          <div className="text-4xl font-light tracking-[0.3em] text-white">MISH<span className="opacity-60">H</span></div>
          <p className="text-[#a8a8a8] text-sm mt-3 font-light tracking-wide">Entre na sua conta</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <input required type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)}
            className="w-full p-3.5 rounded-full text-sm bg-[#262626] text-white placeholder:text-[#a8a8a8] font-light" />
          <input required type="password" placeholder="Senha" value={password} onChange={e=>setPassword(e.target.value)}
            className="w-full p-3.5 rounded-full text-sm bg-[#262626] text-white placeholder:text-[#a8a8a8] font-light" />
          <button disabled={loading} className="w-full bg-white text-black font-light py-3.5 rounded-full hover:opacity-90 disabled:opacity-50 tracking-wide">
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <button
          type="button"
          onClick={signInWithGoogle}
          disabled={loading}
          className="w-full mt-3 bg-[#262626] text-white font-light py-3.5 rounded-full flex items-center justify-center gap-3 hover:bg-[#404040] disabled:opacity-50 tracking-wide"
        >
          <svg className="w-5 h-5" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
            <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
            <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
            <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571.001-.001.002-.001.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
          </svg>
          Continuar com Google
        </button>

        <div className="flex justify-between items-center text-sm text-[#a8a8a8] mt-8 font-light gap-3">
          <Link href="/signup" className="text-white font-light tracking-wide">Criar conta</Link>
          <Link href="/forgot-password" className="text-white font-light tracking-wide">Esqueci a senha</Link>
          <Link href="/help" className="text-white font-light tracking-wide">Ajuda</Link>
        </div>
      </div>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center text-white font-light">Carregando...</div>}>
      <LoginForm />
    </Suspense>
  )
}