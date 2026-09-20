'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const [expired, setExpired] = useState(false)

  useEffect(() => {
    const validate = async () => {
      try {
        const url = new URL(window.location.href)
        const code = url.searchParams.get('code')

        // CASO 1: PKCE ?code=
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) {
            console.error(error)
            setExpired(true)
            toast.error('Link expirado. Solicite outro.')
            return
          }
        } else {
          // CASO 2: HASH #access_token=...
          const hash = window.location.hash
          if (hash && hash.includes('access_token')) {
            const params = new URLSearchParams(hash.replace('#', '?'))
            const access_token = params.get('access_token')
            const refresh_token = params.get('refresh_token')
            if (access_token && refresh_token) {
              const { error } = await supabase.auth.setSession({ access_token, refresh_token })
              if (error) {
                setExpired(true)
                return
              }
            }
          }
        }

        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          setExpired(true)
          return
        }

        setReady(true)
      } catch {
        setExpired(true)
      }
    }

    validate()

    // Garante que pega o evento de recovery também
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 6) return toast.error('Mínimo 6 caracteres')
    if (password !== confirmPassword) return toast.error('Senhas não coincidem')

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (error) return toast.error(error.message)
    toast.success('Senha redefinida!')
    await supabase.auth.signOut() // importante pra limpar sessão de recovery
    router.push('/login')
  }

  if (expired) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="w-full max-w-md p-8 text-center">
          <div className="text-4xl font-light tracking-[0.3em] text-white">MISH<span className="opacity-60">H</span></div>
          <p className="text-[#a8a8a8] text-sm mt-6">Link inválido ou expirado. Abriu em outro navegador?</p>
          <Link href="/forgot-password" className="inline-block mt-6 text-white underline">Solicitar novo link</Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md p-8">
        <div className="text-center mb-10">
          <div className="text-4xl font-light tracking-[0.3em] text-white">MISH<span className="opacity-60">H</span></div>
          <p className="text-[#a8a8a8] text-sm mt-3">Defina sua nova senha</p>
        </div>
        {!ready ? <div className="text-center text-[#a8a8a8] text-sm">Validando link...</div> : (
          <form onSubmit={onSubmit} className="space-y-3">
            <input required type="password" placeholder="Nova senha" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-3.5 rounded-full text-sm bg-[#262626] text-white" />
            <input required type="password" placeholder="Confirmar" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full p-3.5 rounded-full text-sm bg-[#262626] text-white" />
            <button disabled={loading} className="w-full bg-white text-black py-3.5 rounded-full disabled:opacity-50">{loading? 'Salvando...' : 'Salvar nova senha'}</button>
          </form>
        )}
      </div>
    </main>
  )
}