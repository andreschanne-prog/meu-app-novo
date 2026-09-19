'use client'

import Link from 'next/link'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return toast.error('Digite seu email.')

    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setLoading(false)

    if (error) {
      return toast.error(error.message)
    }

    toast.success('Se esse email estiver cadastrado, enviamos um link para redefinir sua senha.')
    setEmail('')
  }

  return (
    <main className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md p-8 fade-in">
        <div className="text-center mb-10">
          <div className="text-4xl font-light tracking-[0.3em] text-white">MISH<span className="opacity-60">H</span></div>
          <p className="text-[#a8a8a8] text-sm mt-3 font-light tracking-wide">Recuperar senha</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <input
            required
            type="email"
            placeholder="Seu email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3.5 rounded-full text-sm bg-[#262626] text-white placeholder:text-[#a8a8a8] font-light"
          />

          <button
            disabled={loading}
            className="w-full bg-white text-black font-light py-3.5 rounded-full hover:opacity-90 disabled:opacity-50 tracking-wide"
          >
            {loading ? 'Enviando...' : 'Enviar link de recuperação'}
          </button>
        </form>

        <div className="text-center mt-8 text-sm text-[#a8a8a8] font-light">
          <Link href="/login" className="text-white tracking-wide">Voltar para login</Link>
        </div>
      </div>
    </main>
  )
}
