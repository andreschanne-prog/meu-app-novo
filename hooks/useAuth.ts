'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Session, User } from '@supabase/supabase-js'
import { ativarNotificacaoMISHH, ouvirMensagem } from '@/lib/firebase'

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setUser(data.session?.user ?? null)
      setLoading(false)
      if (data.session?.user) {
        ativarNotificacaoMISHH(data.session.user.id).catch(() => undefined)
        ouvirMensagem().catch(() => undefined)
      }
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, sess) => {
      setSession(sess)
      setUser(sess?.user ?? null)
      if (sess?.user) {
        ativarNotificacaoMISHH(sess.user.id).catch(() => undefined)
        ouvirMensagem().catch(() => undefined)
      }
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  return { session, user, loading }
}