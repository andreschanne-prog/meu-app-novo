'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import AppShell from '@/components/AppShell'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Send, Image as ImageIcon } from 'lucide-react'
import toast from 'react-hot-toast'
import { VerifiedBadge } from '@/components/VerifiedBadge'
import OnlineBadge from '@/components/OnlineBadge'
import { isUserOnline } from '@/hooks/usePresence'
import { sendPushNotification } from '@/lib/push'

type Conv = {
  id: string
  other_id: string
  other_name: string
  other_avatar: string | null
  other_verificado?: boolean
  other_online?: boolean
  other_last_seen?: string | null
}

function ChatContent() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const queryConvId = searchParams.get('id')

  const [convs, setConvs] = useState<Conv[]>([])
  const [active, setActive] = useState<string | null>(queryConvId || null)
  const [messages, setMessages] = useState<any[]>([])
  const [text, setText] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (queryConvId) {
      setActive(queryConvId)
    }
  }, [queryConvId])

  // carregar conversas
  useEffect(() => {
    if (!user) return
    ;(async () => {
      const { data: parts } = await supabase
       .from('conversation_participants').select('conversation_id').eq('user_id', user.id)
      const ids = (parts||[]).map(p => p.conversation_id)
      if (ids.length === 0) { setConvs([]); return }

      const { data: cps } = await supabase
       .from('conversation_participants')
       .select('conversation_id, user_id, profiles(username, full_name, avatar_url, verificado, online, last_seen)')
       .in('conversation_id', ids)
       .neq('user_id', user.id)

      const seen = new Set<string>()
      const list: Conv[] = []
      ;(cps||[]).forEach((c: any) => {
        if (seen.has(c.conversation_id)) return
        seen.add(c.conversation_id)
        list.push({
          id: c.conversation_id,
          other_id: c.user_id,
          other_name: c.profiles?.username || 'user',
          other_avatar: c.profiles?.avatar_url,
          other_verificado: c.profiles?.verificado,
          other_online: c.profiles?.online,
          other_last_seen: c.profiles?.last_seen,
        })
      })
      setConvs(list)
    })()
  }, [user])

  // mensagens ativas
  useEffect(() => {
    if (!active) return
    supabase.from('messages')
     .select('*')
     .eq('conversation_id', active)
     .order('created_at', { ascending: true })
     .then(({ data }) => setMessages(data || []))

    const sub = supabase.channel(`conv-${active}`)
     .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${active}` },
        (payload) => setMessages(m => [...m, payload.new]))
     .subscribe()
    return () => { sub.unsubscribe() }
  }, [active])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 999999, behavior: 'smooth' })
  }, [messages])

  async function send() {
    if (!user ||!active ||!text.trim()) return
    const { error } = await supabase.from('messages').insert({
      conversation_id: active,
      sender_id: user.id,
      content: text,
    })
    if (error) return toast.error(error.message)
    const { data: participants } = await supabase
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', active)
      .neq('user_id', user.id)
    await Promise.all((participants || []).map(participant => sendPushNotification({
      userId: participant.user_id,
      title: 'Nova mensagem no MISHH',
      body: text.trim().slice(0, 120),
      url: `/chat?id=${active}`,
    })))
    setText('')
  }

  async function sendPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f ||!user ||!active) return
    try {
      const fd = new FormData()
      fd.append('file', f)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (!data.url) throw new Error('Falha no upload')
      const { error } = await supabase.from('messages').insert({
        conversation_id: active, sender_id: user.id,
        content: '', image_url: data.url,
      })
      if (error) throw error
      const { data: participants } = await supabase.from('conversation_participants').select('user_id').eq('conversation_id', active).neq('user_id', user.id)
      await Promise.all((participants || []).map(participant => sendPushNotification({
        userId: participant.user_id,
        title: 'Nova foto no MISHH',
        body: '@' + (user.user_metadata?.username || 'Alguém') + ' enviou uma foto.',
        url: `/chat?id=${active}`,
      })))
    } catch (err: any) {
      toast.error(err.message || 'Erro no upload')
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  if (convs.length === 0 &&!active) {
    return (
      <AppShell>
        <h2 className="text-xl sm:text-2xl font-light mb-6 text-white tracking-wide">Chat</h2>
        <div className="py-12 text-center text-sm sm:text-base text-[#a8a8a8] font-light">
          Você ainda não tem conversas.<br />
          Busque um perfil e toque em "Enviar mensagem".
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <h2 className="text-xl sm:text-2xl font-light mb-6 text-white tracking-wide">Chat</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        <aside className={`md:col-span-1 space-y-3 ${active? 'hidden md:block' : 'block'}`}>
          <div className="space-y-3 max-h-[60vh] md:max-h-none overflow-y-auto">
            {convs.map(c => (
              <button key={c.id} onClick={() => setActive(c.id)} className={`w-full text-left p-3 rounded-2xl transition active:scale-95 ${active===c.id?'bg-[#262626] text-white':'bg-[#0a0a0a] text-white hover:bg-[#1a1a1a]'}`}>
                <div className="flex items-center gap-2">
                  <div className="relative shrink-0">
                    <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#262626] overflow-hidden ${c.other_verificado? 'ring-2 ring-[#D4AF37] ring-offset-2 ring-offset-[#0a0a0a]' : ''}`}>
                      {c.other_avatar && <img src={c.other_avatar} className="w-full h-full object-cover" alt="" />}
                    </div>
                    {isUserOnline({ online: c.other_online, last_seen: c.other_last_seen }) &&!c.other_verificado && (
                      <OnlineBadge size={10} />
                    )}
                    {c.other_verificado && (
                      <div className="absolute -bottom-0.5 -right-0.5">
                        <VerifiedBadge size={14} />
                      </div>
                    )}
                  </div>
                  <div className="font-light text-sm truncate flex items-center gap-1.5 text-white">
                    <span>@{c.other_name}</span>
                    {c.other_verificado && (
                      <span className="text-[#D4AF37] text-[10px] font-light">✓</span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </aside>

        <section className={`${active? 'block' : 'hidden'} md:block md:col-span-2 bg-[#0a0a0a] rounded-2xl flex flex-col h-[70vh] md:h-[75vh]`}>
          {active && (
            <div className="md:hidden p-2 flex items-center gap-2">
              <button onClick={() => setActive(null)} className="p-2 rounded-full hover:bg-[#262626]" aria-label="Voltar">
                ←
              </button>
              <span className="text-sm font-light text-white">Voltar às conversas</span>
            </div>
          )}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2">
            {messages.length === 0? (
              <div className="text-center text-[#a8a8a8] text-sm py-8 font-light">
                Nenhuma mensagem ainda. Diga olá! 👋
              </div>
            ) : (
              messages.map(m => (
                <div key={m.id} className={`max-w-[80%] sm:max-w-[75%] p-3 rounded-2xl break-words font-light ${m.sender_id===user?.id?'ml-auto bg-white text-black':'bg-[#262626] text-white'}`}>
                  {m.image_url && <img src={m.image_url} className="mb-1 max-h-40 sm:max-h-48 w-full object-cover rounded-lg" alt="" />}
                  {m.content && <div className="text-sm whitespace-pre-wrap">{m.content}</div>}
                </div>
              ))
            )}
          </div>
          <div className="p-2 flex items-center gap-2">
            <button onClick={() => fileRef.current?.click()} className="p-2 text-[#a8a8a8] hover:bg-[#262626] rounded-full" aria-label="Enviar foto">
              <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={sendPhoto} />
            <input value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()}
              placeholder="Mensagem..." className="flex-1 min-w-0 p-2.5 text-sm sm:text-base rounded-full bg-[#262626] text-white placeholder:text-[#a8a8a8] font-light" />
            <button onClick={send} className="bg-white text-black p-2 rounded-full hover:opacity-90 active:scale-95 transition" aria-label="Enviar">
              <Send className="w-4 h-4 sm:w-4 sm:h-4" />
            </button>
          </div>
        </section>
      </div>
    </AppShell>
  )
}

export default function ChatPage() {
  return (
    <Suspense fallback={<AppShell><div className="py-10 text-center text-[#a8a8a8] font-light">Carregando chat...</div></AppShell>}>
      <ChatContent />
    </Suspense>
  )
}