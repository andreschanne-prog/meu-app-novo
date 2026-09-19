'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { VerifiedBadge } from './VerifiedBadge'
import OnlineBadge from './OnlineBadge'
import { isUserOnline } from '@/hooks/usePresence'

type Story = {
  id: string
  user_id: string
  image_url: string
  filter: string
  created_at: string
  profiles?: {
    username: string
    avatar_url: string
    verificado?: boolean | null
    online?: boolean | null
    last_seen?: string | null
  }
}

export default function StoriesCarousel() {
  const { user } = useAuth()
  const router = useRouter()
  const [stories, setStories] = useState<Story[]>([])

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('stories')
        .select('*, profiles(username, avatar_url, verificado)')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(50)
      setStories(data || [])
    }
    load()
  }, [])

  // agrupar por user_id
  const grouped = stories.reduce<Record<string, Story[]>>((acc, s) => {
    (acc[s.user_id] ||= []).push(s)
    return acc
  }, {})
  const entries = Object.values(grouped)

  return (
    <div className="py-4">
      <div className="flex gap-4 overflow-x-auto no-scrollbar snap-x-mandatory px-3 py-2">
        {/* botão seu story */}
        <button onClick={() => router.push('/stories/new')} className="flex flex-col items-center min-w-[64px] snap-start active:scale-95 transition">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#0a0a0a] flex items-center justify-center">
            <Plus className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
          </div>
          <span className="text-[10px] sm:text-[11px] mt-1.5 truncate w-14 sm:w-16 text-center text-[#a8a8a8] font-light">Seu story</span>
        </button>

        {entries.map(group => (
          <button key={group[0].user_id} onClick={() => router.push(`/stories/${group[0].user_id}`)} className="flex flex-col items-center min-w-[64px] snap-start active:scale-95 transition">
            <div className="relative">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full p-[2px] bg-gradient-to-tr from-yellow-400 via-mishh-orange to-pink-500">
                <div className="w-full h-full rounded-full overflow-hidden bg-black p-[2px]">
                  <img src={group[0].image_url} className={`w-full h-full object-cover rounded-full filter-${group[0].filter}`} alt="" />
                </div>
              </div>
              {isUserOnline(group[0].profiles) && !group[0].profiles?.verificado && (
                <OnlineBadge size={12} />
              )}
              {group[0].profiles?.verificado && (
                <div className="absolute -bottom-0.5 -right-0.5">
                  <VerifiedBadge size={16} />
                </div>
              )}
            </div>
            <span className="text-[10px] sm:text-[11px] mt-1.5 truncate w-14 sm:w-16 text-center text-[#a8a8a8] font-light">@{group[0].profiles?.username}</span>
          </button>
        ))}
      </div>
    </div>
  )
}