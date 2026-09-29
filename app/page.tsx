'use client'

import { useRouter } from 'next/navigation'
import Image from "next/image"

export default function Home() {
  const router = useRouter()

  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      {/* Botão ENTRA */}
      <header className="w-full flex justify-end p-6">
        <button
          onClick={() => router.push('/login')}
          className="border border-white/40 px-6 py-2 text-sm tracking-[0.2em] hover:bg-white hover:text-black transition"
        >
          ENTRAR
        </button>
      </header>

      {/* Conteúdo central com a LOGO DE VERDADE */}
      <main className="flex flex-col items-center justify-center px-6 text-center -mt-10 flex-1">
        <Image 
          src="/logo-mishh.png" 
          alt="MISHH Revista - Rede social"
          width={380}
          height={120}
          priority
          className="object-contain"
        />
        <p className="mt-3 text-sm tracking-[0.25em] opacity-70">
          
        </p>

        <p className="mt-8 max-w-md text-sm md:text-base leading-relaxed opacity-80">
          Aqui você posta suas fotos e participa de um ranking de curtidas.
          Todo mês o <span className="font-semibold">MISHH</span> destaca o perfil
          que mais teve curtidas <span className="font-semibold">naquele mês</span>,
          não no total geral, mas sim no total do mês atual.
        </p>
      </main>
    </div>
  )
}