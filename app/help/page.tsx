'use client'
import Link from 'next/link'

export default function HelpPage() {
  return (
    <main className="max-w-2xl mx-auto p-6 pb-24 bg-black min-h-screen text-white">
      <h1 className="text-2xl font-light tracking-wide mb-6">Ajuda - MISHH</h1>
      <div className="space-y-5 text-sm text-white font-light">
        <p><span className="font-normal">Como criar conta?</span> Vá em "Criar conta" e preencha email, senha, nome, país, estado e cidade.</p>
        <p><span className="font-normal">Como postar?</span> Toque no botão "+" da barra inferior. Escolha a foto e um dos 8 filtros.</p>
        <p><span className="font-normal">Como postar Story?</span> No topo do Feed, toque no botão "+" e selecione uma foto temporária (24h).</p>
        <p><span className="font-normal">Conta privada?</span> No Perfil, ative "Conta Restrita". Apenas seguidores aprovados verão suas fotos.</p>
        <p><span className="font-normal">Como deletar conta?</span> No Perfil, role até "Deletar Conta". Esta ação é permanente.</p>
        <p><span className="font-normal">Suporte:</span> <a className="text-white underline" href="mailto:mishh.suport@gmail.com">mishh.suport@gmail.com</a></p>
      </div>
      <div className="mt-8 flex gap-6">
        <Link href="/terms" className="text-white font-light tracking-wide">Termos</Link>
        <Link href="/privacy" className="text-white font-light tracking-wide">Privacidade</Link>
      </div>
    </main>
  )
}