import { supabase } from '@/lib/supabase'

export async function sendPushNotification(input: {
  userId: string
  title: string
  body: string
  url?: string
}) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return

  await fetch('/api/push', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(input),
  })
}

export async function notifyMentionedUsers(input: {
  actorId: string
  text: string
  body: string
  url: string
}) {
  const usernames = [...new Set(Array.from(input.text.matchAll(/@([a-zA-Z0-9_.-]+)/g), match => match[1].toLowerCase()))]
  if (!usernames.length) return

  const { data: profiles } = await supabase.from('profiles').select('id').in('username', usernames)
  await Promise.all((profiles || []).filter(profile => profile.id !== input.actorId).map(profile => sendPushNotification({
    userId: profile.id,
    title: 'Você foi marcado no MISHH',
    body: input.body,
    url: input.url,
  })))
}