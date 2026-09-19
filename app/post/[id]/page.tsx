'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import AppShell from '@/components/AppShell'
import PostCard from '@/components/PostCard'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

export default function PostPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const router = useRouter()
  const [post, setPost] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    async function loadPost() {
      setLoading(true)
      const { data: postData, error } = await supabase
        .from('posts')
        .select('*, profiles(id, username, full_name, avatar_url, verificado, online, last_seen), likes(count)')
        .eq('id', id)
        .maybeSingle()

      if (error || !postData) {
        setPost(null)
        setLoading(false)
        return
      }

      let userLiked = false
      if (user) {
        const { data: likeData } = await supabase
          .from('likes')
          .select('post_id')
          .eq('post_id', id)
          .eq('user_id', user.id)
          .maybeSingle()
        userLiked = !!likeData
      }

      setPost({
        ...postData,
        like_count: postData.likes?.[0]?.count ?? 0,
        user_liked: userLiked,
      })
      setLoading(false)
    }

    loadPost()
  }, [id, user])

  return (
    <AppShell>
      <div className="pt-2 sm:pt-4">
        {loading ? (
          <div className="text-center text-[#a8a8a8] py-16 text-sm sm:text-base font-light">
            Carregando post...
          </div>
        ) : !post ? (
          <div className="text-center text-[#a8a8a8] py-16 space-y-4">
            <p className="text-base font-light">Post não encontrado ou removido.</p>
            <button
              onClick={() => router.push('/feed')}
              className="px-6 py-2.5 rounded-full bg-white text-black text-sm font-light hover:opacity-90 transition"
            >
              Ir para o Feed
            </button>
          </div>
        ) : (
          <PostCard post={post} />
        )}
      </div>
    </AppShell>
  )
}
