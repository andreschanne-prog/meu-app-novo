'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import AppShell from '@/components/AppShell'
import toast from 'react-hot-toast'
import { Heart, UserPlus, MessageCircle, Bell } from 'lucide-react'
import { timeAgo, classNames } from '@/lib/helpers'
import { VerifiedBadge } from '@/components/VerifiedBadge'
import OnlineBadge from '@/components/OnlineBadge'
import { isUserOnline } from '@/hooks/usePresence'

type NotificationRow = {
  id: string
  type: 'like' | 'follow' | 'comment'
  post_id: string | null
  comment_id: string | null
  is_read: boolean
  created_at: string
  actor: {
    id: string
    username: string
    full_name: string
    avatar_url: string | null
    verificado?: boolean | null
    online?: boolean | null
    last_seen?: string | null
  } | null
  comment_text?: string
}

export default function NotificationsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [items, setItems] = useState<NotificationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  useEffect(() => {
    if (!user) return
    load()

    const channel = supabase
      .channel(`notif-page-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => load()
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user])

  async function load() {
    if (!user) return
    setLoading(true)

    const { data, error } = await supabase
      .from('notifications')
      .select('id, type, post_id, comment_id, is_read, created_at, actor_id')
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) { setLoading(false); return toast.error('Erro ao carregar notificações.') }

    const actorIds = Array.from(new Set((data || []).map(n => n.actor_id)))
    const commentIds = Array.from(new Set((data || []).map(n => n.comment_id).filter(Boolean) as string[]))

    const [{ data: actors }, { data: comments }] = await Promise.all([
      supabase.from('profiles').select('id, username, full_name, avatar_url, verificado, online, last_seen')
        .in('id', actorIds.length ? actorIds : ['00000000-0000-0000-0000-000000000000']),
      commentIds.length
        ? supabase.from('comments').select('id, text').in('id', commentIds)
        : Promise.resolve({ data: [] as any[] }),
    ])

    const actorMap: Record<string, any> = {}
    ;(actors || []).forEach(a => { actorMap[a.id] = a })
    const commentMap: Record<string, any> = {}
    ;(comments || []).forEach(c => { commentMap[c.id] = c })

    const list: NotificationRow[] = (data || []).map(n => ({
      id: n.id,
      type: n.type,
      post_id: n.post_id,
      comment_id: n.comment_id,
      is_read: n.is_read,
      created_at: n.created_at,
      actor: actorMap[n.actor_id] || null,
      comment_text: n.comment_id ? (commentMap[n.comment_id]?.text || '') : undefined,
    }))
    setItems(list)
    setLoading(false)
  }

  async function markAllAsRead() {
    if (!user) return
    const unreadIds = items.filter(i => !i.is_read).map(i => i.id)
    if (unreadIds.length === 0) return
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .in('id', unreadIds)
    if (error) return toast.error('Erro ao marcar como lidas.')
    setItems(items.map(i => ({ ...i, is_read: true })))
    toast.success('Todas marcadas como lidas.')
  }

  async function markOneAsRead(id: string) {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
    if (!error) {
      setItems(items.map(i => i.id === id ? { ...i, is_read: true } : i))
    }
  }

  function handleClick(item: NotificationRow) {
    if (!item.is_read) markOneAsRead(item.id)
    if (item.type === 'follow' && item.actor) {
      router.push(`/user/${item.actor.id}`)
    } else if (item.post_id) {
      router.push('/feed')
    } else if (item.actor) {
      router.push(`/user/${item.actor.id}`)
    }
  }

  const unreadCount = items.filter(i => !i.is_read).length
  const filtered = filter === 'unread' ? items.filter(i => !i.is_read) : items

  return (
    <AppShell>
      <div className="flex flex-col xs:flex-row items-start xs:items-center justify-between gap-2 mb-6">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-light text-white flex items-center gap-2 tracking-wide">
          <Bell className="w-5 h-5 sm:w-6 sm:h-6" /> Notificações
        </h1>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="text-xs sm:text-sm text-[#a8a8a8] font-light hover:text-white transition self-end xs:self-auto tracking-wide"
          >
            Marcar todas como lidas
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-3 sm:mb-4">
        {(['all', 'unread'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={classNames(
              'px-4 py-2 rounded-full text-xs sm:text-sm font-light transition active:scale-95 tracking-wide',
              filter === f ? 'bg-white text-black' : 'bg-[#262626] text-white hover:bg-[#404040]'
            )}
          >
            {f === 'all' ? 'Todas' : `Não lidas${unreadCount > 0 ? ` (${unreadCount})` : ''}`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center text-[#a8a8a8] py-10 text-sm sm:text-base font-light">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-[#a8a8a8] py-10 text-sm sm:text-base font-light">
          {filter === 'unread' ? '✨ Nenhuma não lida.' : 'Nenhuma notificação ainda.'}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(n => {
            const Icon = n.type === 'like' ? Heart : n.type === 'follow' ? UserPlus : MessageCircle
            const verb =
              n.type === 'like' ? 'curtiu sua foto'
              : n.type === 'follow' ? 'começou a te seguir'
              : n.type === 'comment' ? `comentou: "${n.comment_text || ''}"`
              : ''
            const actorName = n.actor ? `@${n.actor.username}` : 'alguém'
            return (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                className={classNames(
                  'w-full text-left flex items-start gap-3 p-3 rounded-2xl transition active:scale-[0.99]',
                  n.is_read ? 'bg-[#0a0a0a] hover:bg-[#1a1a1a]' : 'bg-[#262626] hover:bg-[#404040]'
                )}
              >
                <div className="relative shrink-0">
                  <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#0a0a0a] overflow-hidden ${n.actor?.verificado ? 'ring-2 ring-[#D4AF37] ring-offset-2 ring-offset-[#0a0a0a]' : ''}`}>
                    {n.actor?.avatar_url && <img src={n.actor.avatar_url} alt="" className="w-full h-full object-cover" />}
                  </div>
                  {isUserOnline(n.actor) && !n.actor?.verificado && (
                    <OnlineBadge size={12} />
                  )}
                  <div className={classNames(
                    'absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center',
                    n.type === 'like' && 'bg-red-500',
                    n.type === 'follow' && 'bg-blue-500',
                    n.type === 'comment' && 'bg-mishh-orange',
                  )}>
                    <Icon className="w-3 h-3 text-white" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs sm:text-sm break-words text-white font-light">
                    <span className="font-normal">{actorName}</span>
                    {n.actor?.verificado && (
                      <span className="text-[#D4AF37] text-[10px] sm:text-xs font-light inline-flex items-center gap-0.5 ml-1 align-middle">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="shrink-0">
                          <path d="M12 2l2.39 4.84L20 6.27l-4 3.9.94 5.5L12 13l-4.94 2.67L8 10.17 4 6.27l5.61.57L12 2z"/>
                        </svg>
                      </span>
                    )}
                    {' '}{verb}
                  </div>
                  <div className="text-[10px] sm:text-xs text-[#a8a8a8] mt-0.5 font-light">há {timeAgo(n.created_at)}</div>
                </div>
                {!n.is_read && (
                  <span className="w-2.5 h-2.5 rounded-full bg-mishh-orange mt-2 shrink-0" aria-label="não lida" />
                )}
              </button>
            )
          })}
        </div>
      )}
    </AppShell>
  )
}