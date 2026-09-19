'use client'
import Link from 'next/link'
import { SUPPORT_EMAIL } from '@/lib/supabase'

export default function Footer() {
  return (
    <footer className="mt-8 sm:mt-12 py-8">
      <div className="w-full max-w-2xl lg:max-w-3xl xl:max-w-4xl 2xl:max-w-5xl mx-auto p-4 sm:p-6 text-center text-xs sm:text-sm text-[#a8a8a8] space-y-3">
        <div className="text-white font-light tracking-[0.2em] text-base sm:text-lg">MISHH</div>
        <p>A rede social que conecta o mundo.</p>
        <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
          <Link href="/terms" className="hover:text-white transition">Termos</Link>
          <Link href="/privacy" className="hover:text-white transition">Privacidade</Link>
          <Link href="/help" className="hover:text-white transition">Ajuda</Link>
        </div>
        <p className="break-all sm:break-words">Suporte: <a href={`mailto:${SUPPORT_EMAIL}`} className="text-white underline">{SUPPORT_EMAIL}</a></p>
        <p>© {new Date().getFullYear()} MISHH</p>
      </div>
    </footer>
  )
}