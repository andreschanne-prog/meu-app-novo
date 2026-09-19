'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

export default function NotificationBell() {
  const { user } = useAuth()
  const router = useRouter()
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    if (!user) { setUnread(0); return }

    // Carga inicial
    loadUnread()

    // Realtime: escuta QUALQUER insert/update/delete na tabela notifications
    // filtrando pelas do user atual
    const channel = supabase
      .channel(`notif-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          // Recarrega contagem em tempo real
          loadUnread()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  async function loadUnread() {
    if (!user) return
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false)
    setUnread(count || 0)
  }

  return (
    <button
      onClick={() => router.push('/notifications')}
      className="relative p-2 rounded-full hover:bg-[#262626] transition"
      aria-label={`Notificações${unread > 0 ? ` (${unread} não lidas)` : ''}`}
    >
      <Bell className="w-6 h-6 text-white" />
      {unread > 0 && (
        <span
          className="absolute top-0 right-0 min-w-[18px] h-[18px] px-1 rounded-full bg-mishh-orange text-white text-[10px] font-light flex items-center justify-center"
          aria-hidden
        >
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </button>
  )
}