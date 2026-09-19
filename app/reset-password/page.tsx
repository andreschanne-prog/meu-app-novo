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
    const validateSession = async () => {
      try {
        const code = new URLSearchParams(window.location.search).get('code')

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) {
            setExpired(true)
            toast.error(error.message)
            return
          }
        }

        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        if (sessionError || !session) {
          setExpired(true)
          return
        }

        setReady(true)
      } catch {
        setExpired(true)
      }
    }

    validateSession()
  }, [])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!password || !confirmPassword) return toast.error('Preencha os dois campos de senha.')
    if (password.length < 6) return toast.error('A senha deve ter pelo menos 6 caracteres.')
    if (password !== confirmPassword) return toast.error('As senhas não coincidem.')

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (error) {
      return toast.error(error.message)
    }

    toast.success('Senha redefinida com sucesso!')
    router.push('/login')
  }

  if (expired) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="w-full max-w-md p-8 text-center fade-in">
          <div className="text-4xl font-light tracking-[0.3em] text-white">MISH<span className="opacity-60">H</span></div>
          <p className="text-[#a8a8a8] text-sm mt-6 font-light tracking-wide">
            Link de recuperação inválido ou expirado.
          </p>
          <Link href="/forgot-password" className="inline-block mt-6 text-white font-light tracking-wide">
            Solicitar novo link
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md p-8 fade-in">
        <div className="text-center mb-10">
          <div className="text-4xl font-light tracking-[0.3em] text-white">MISH<span className="opacity-60">H</span></div>
          <p className="text-[#a8a8a8] text-sm mt-3 font-light tracking-wide">Defina sua nova senha</p>
        </div>

        {!ready ? (
          <div className="text-center text-[#a8a8a8] text-sm font-light">Validando seu link...</div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3">
            <input
              required
              type="password"
              placeholder="Nova senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3.5 rounded-full text-sm bg-[#262626] text-white placeholder:text-[#a8a8a8] font-light"
            />
            <input
              required
              type="password"
              placeholder="Confirmar nova senha"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full p-3.5 rounded-full text-sm bg-[#262626] text-white placeholder:text-[#a8a8a8] font-light"
            />

            <button
              disabled={loading}
              className="w-full bg-white text-black font-light py-3.5 rounded-full hover:opacity-90 disabled:opacity-50 tracking-wide"
            >
              {loading ? 'Salvando...' : 'Salvar nova senha'}
            </button>
          </form>
        )}
      </div>
    </main>
  )
}
