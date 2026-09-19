'use client'
import Link from 'next/link'

export default function PrivacyPage() {
  return (
    <main className="max-w-2xl mx-auto p-6 pb-24 bg-black min-h-screen text-white">
      <h1 className="text-2xl font-light tracking-wide mb-6">Política de Privacidade - MISHH</h1>
      <div className="space-y-4 text-sm text-white font-light">
        <p>Coletamos: email, nome, país, estado e cidade para personalizar sua experiência.</p>
        <p>Suas fotos são armazenadas no Supabase Storage. Likes e contadores ficam no banco.</p>
        <p>Não vendemos seus dados. Anunciantes recebem apenas métricas agregadas.</p>
        <p>Você pode editar ou deletar sua conta a qualquer momento em Configurações do Perfil.</p>
        <p>Contato: <a className="text-white underline" href="mailto:mishh.suport@gmail.com">mishh.suport@gmail.com</a></p>
      </div>
      <Link href="/signup" className="inline-block mt-8 text-white font-light tracking-wide">← Voltar</Link>
    </main>
  )
}