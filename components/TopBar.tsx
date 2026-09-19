'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { MessageCircle, Shield, Crown } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { isAdmin } from '@/lib/helpers'
import { useAuth } from '@/hooks/useAuth'
import NotificationBell from './NotificationBell'

export default function TopBar() {
  const router = useRouter()
  const { user } = useAuth()
  const [isUserAdmin, setIsUserAdmin] = useState(false)

  useEffect(() => {
    if (!user) {
      setIsUserAdmin(false)
      return
    }
    let cancelled = false
    isAdmin(user.id).then(ok => {
      if (!cancelled) setIsUserAdmin(ok)
    })
    return () => { cancelled = true }
  }, [user?.id])

  async function handleLogout() {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Erro ao sair:', error)
    }
    window.location.href = '/login'
  }

  return (
    <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-2xl lg:max-w-3xl xl:max-w-4xl 2xl:max-w-5xl mx-auto flex items-center justify-between px-3 sm:px-4 lg:px-6 h-14 sm:h-16">
        <div className="w-10" aria-hidden="true" />
        <Link href="/feed" className="text-xl sm:text-2xl lg:text-3xl font-light tracking-[0.2em] text-white select-none">
          MISH<span className="opacity-60">H</span>
        </Link>
        <div className="flex items-center gap-0.5 sm:gap-1">
          {isUserAdmin && (
            <button
              onClick={() => router.push('/admin')}
              className="p-2 sm:p-2.5 rounded-full hover:bg-[#262626] active:scale-95 transition text-white"
              title="Painel Admin"
              aria-label="Painel Admin"
            >
              <Shield className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          )}
          <NotificationBell />
          <button onClick={() => router.push('/chat')} className="p-2 sm:p-2.5 rounded-full hover:bg-[#262626] active:scale-95 transition" aria-label="Chat">
            <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </button>
          <button
            onClick={handleLogout}
            className="p-2 sm:p-2.5 rounded-full hover:bg-[#262626] active:scale-95 transition text-white"
            title="Sair"
            aria-label="Sair"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  )
}