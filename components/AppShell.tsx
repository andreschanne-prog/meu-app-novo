'use client'
import { ReactNode, useEffect } from 'react'
import TopBar from './TopBar'
import BottomNav from './BottomNav'
import Footer from './Footer'
import { useAuth } from '@/hooks/useAuth'
import { usePresence } from '@/hooks/usePresence'
import { useRouter } from 'next/navigation'

export default function AppShell({ children, hideFooter }: { children: ReactNode; hideFooter?: boolean }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  // Mantém o status online atualizado a cada 60s enquanto o usuário estiver
  // logado em qualquer página que use este layout.
  usePresence({ intervalMs: 60_000 })

  useEffect(() => {
    if (!loading && !user) router.replace('/login')
  }, [user, loading, router])

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="text-2xl sm:text-3xl font-light tracking-wide text-white">MISHH</div>
    </div>
  }

  return (
    <div className="min-h-screen flex flex-col pb-16 sm:pb-20 bg-black text-white">
      <TopBar />
      {/* Container central:
           - mobile  → 100% com px-2 (320px sem overflow)
           - sm (≥640)  → max-w-2xl (672px) com px-4
           - lg (≥1024) → max-w-3xl (768px) com px-6
           - xl (≥1280) → max-w-4xl (896px) com px-8
           - 2xl (≥1536)→ max-w-5xl (1024px) */}
      <main className="w-full max-w-2xl lg:max-w-3xl xl:max-w-4xl 2xl:max-w-5xl mx-auto px-2 sm:px-4 lg:px-6 xl:px-8 pt-2 sm:pt-3 fade-in flex-1">
        {children}
      </main>
      {!hideFooter && <Footer />}
      <BottomNav />
    </div>
  )
}