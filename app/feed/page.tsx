'use client'
import { useEffect, useState, useRef } from 'react'
import AppShell from '@/components/AppShell'
import PostCard from '@/components/PostCard'
import AdCard, { AdSenseBlock, type Ad } from '@/components/AdCard'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { extractHashtags } from '@/lib/helpers'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { VerifiedBadge } from '@/components/VerifiedBadge'
import { notifyMentionedUsers } from '@/lib/push'

type Post = any
const MAX_TEXT_LENGTH = 2000
const CARD_SIZE = "w-full max-w- mx-auto"
const POSTS_PER_AD = 7

const CLOUD_NAME = 'nzj72eu0'
const UPLOAD_PRESET = 'mishh_upload' // <- o que você acabou de criar

export default function FeedPage() {
  const { user } = useAuth()
  const [posts, setPosts] = useState<Post[]>([])
  const [ads, setAds] = useState<Ad[]>([])
  const [userCity, setUserCity] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [composerText, setComposerText] = useState('')
  const [posting, setPosting] = useState(false)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const [showMentions, setShowMentions] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [mentionUsers, setMentionUsers] = useState<any[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function uploadToCloudinary(file: File): Promise<string> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', UPLOAD_PRESET)

    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body: formData,
    })
    const data = await res.json()
    if (!data.secure_url) throw new Error(data.error?.message || 'Erro no upload Cloudinary')
    return data.secure_url
  }

  async function submitTextPost() {
    if (!user) { toast.error('Faça login para publicar.'); return }
    const text = composerText.trim()
    if (!text &&!selectedImage) { toast.error('Escreva algo ou selecione uma imagem.'); return }

    setPosting(true)
    try {
      let imageUrl = ''
      if (selectedImage) {
        toast.loading('Enviando imagem pro Cloudinary...')
        imageUrl = await uploadToCloudinary(selectedImage)
      }

      const { data, error } = await supabase
       .from('posts')
       .insert({
          user_id: user.id,
          image_url: imageUrl, // AGORA SIM VAI PRO CLOUDINARY
          filter: 'normal',
          caption: text,
          hashtags: extractHashtags(text).join(','),
        })
       .select('*, profiles(id, username, full_name, avatar_url, verificado, online, last_seen), likes(count)')
       .single()

      if (error) throw error

      const inserted = {
       ...data,
        like_count: (data as any)?.likes?.[0]?.count?? 0,
        user_liked: false,
        profiles: (data as any)?.profiles || null,
      }
      setPosts((prev: any) => [inserted,...prev])
      setComposerText('')
      setSelectedImage(null)
      setPreviewUrl(null)
      void notifyMentionedUsers({ actorId: user.id, text, body: `@${user.user_metadata?.username || 'Alguém'} marcou você em um post.`, url: `/post/${data.id}` })
      toast.dismiss()
      toast.success('Post enviado!')
    } catch (err: any) {
      toast.dismiss()
      toast.error(err.message || 'Erro ao publicar.')
    } finally {
      setPosting(false)
      setShowMentions(false)
    }
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedImage(file)
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  //... resto do seu código de mentions e useEffect continua igual
  function handleTextChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value.slice(0, MAX_TEXT_LENGTH)
    const pos = e.target.selectionStart
    setComposerText(val)
    const textBefore = val.slice(0, pos)
    const match = textBefore.match(/@(\w*)$/)
    if (match) {
      setMentionQuery(match[1])
      setShowMentions(true)
      searchUsers(match[1])
    } else {
      setShowMentions(false)
    }
  }

  async function searchUsers(q: string) {
    if (!user) return
    const { data: follows } = await supabase.from('follows').select('following_id').eq('follower_id', user.id).limit(50)
    const ids = follows?.map((f: any) => f.following_id) || []

    if (!ids.length) {
      setMentionUsers([])
      return
    }

    const cleanQuery = q.trim()
    let query = supabase.from('profiles').select('id, username, full_name, avatar_url, verificado').in('id', ids).limit(6)
    if (cleanQuery) query = query.ilike('username', `%${cleanQuery}%`)

    const { data } = await query
    setMentionUsers(data || [])
  }

  function selectMention(u: any) {
    if (!textareaRef.current) return
    const pos = textareaRef.current.selectionStart
    const textBefore = composerText.slice(0, pos)
    const textAfter = composerText.slice(pos)
    const newBefore = textBefore.replace(/@\w*$/, `@${u.username} `)
    setComposerText(newBefore + textAfter)
    setShowMentions(false)
    setTimeout(() => {
      textareaRef.current?.focus()
      const newPos = newBefore.length
      textareaRef.current?.setSelectionRange(newPos, newPos)
    }, 0)
  }

  useEffect(() => {
    async function load() {
      let city: string | null = null
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('city').eq('id', user.id).single()
        city = profile?.city || null
        setUserCity(city)
      }
      const { data: postsData } = await supabase.from('posts').select('*, profiles(id, username, full_name, avatar_url, verificado, online, last_seen), likes(count)').order('created_at', { ascending: false }).limit(50)
      const now = new Date().toISOString()
      const { data: adsData } = await supabase.from('ads').select('*').eq('active', true).lte('starts_at', now).gte('ends_at', now).order('created_at', { ascending: false }).limit(50)
      const filteredAds = (adsData as Ad[] || []).filter(ad => {
        if (ad.target_type === 'country') return true
        if (!city) return true
        const list = ad.cities?.length? ad.cities : (ad.city? [{city: ad.city} as any] : [])
        return list.some((c: any) => c.city?.toLowerCase() === city?.toLowerCase())
      })
      let likedIds = new Set<string>()
      if (user) {
        const { data: likes } = await supabase.from('likes').select('post_id').eq('user_id', user.id)
        likedIds = new Set(((likes as any) || []).map((l: any) => l.post_id))
      }
      const enriched = ((postsData as any) || []).map((p: any) => ({
       ...p,
        like_count: p.likes?.[0]?.count?? 0,
        user_liked: likedIds.has(p.id),
      }))
      setPosts(enriched)
      setAds(filteredAds)
      setLoading(false)
    }
    load()
  }, [user])

  const rendered: React.ReactNode[] = []
  let adIdx = 0
  let postCounter = 0
  posts.forEach((p: any) => {
    rendered.push(<PostCard key={p.id} post={p} />)
    postCounter++
    if (postCounter % POSTS_PER_AD === 0) {
      if (ads.length > 0) {
        const ad = ads[adIdx % ads.length]
        rendered.push(<AdCard key={`ad-${ad.id}-${adIdx}`} ad={ad} disguised />)
        adIdx++
      } else {
        rendered.push(<AdSenseBlock key={`adsense-${adIdx}`} />)
        adIdx++
      }
    }
  })
  if (!loading && posts.length === 0) rendered.push(<AdSenseBlock key="adsense-empty" />)
  if (!loading && posts.length > 0 && posts.length < POSTS_PER_AD && ads.length > 0) {
    rendered.unshift(<AdCard key={`ad-first-${ads[0].id}`} ad={ads[0]} />)
  }

  return (
    <AppShell>
      <div className="sticky top-0 z-50 -mx-2 sm:mx-0 mb-3 border-b border-[#262626] bg-black/90 backdrop-blur-md">
        <div className={`${CARD_SIZE} flex h-10 items-center justify-between px-3 sm:px-0`}>
          <Link href="/destaques" className="rounded-full bg-[#ff6a00] px-5 py-2 text- font-bold uppercase tracking-wide text-white shadow-[0_0_15px_rgba(255,106,0,0.4)] hover:bg-[#ff7a1a] active:scale-95 transition sm:text-sm">
            Destaques do MISHH
          </Link>
          {userCity && <span className="text- text-[#a8a8a8] font-light"> {userCity}</span>}
        </div>
      </div>

      <div className="px-2 sm:px-0">
        <div className={`${CARD_SIZE} mb-4 rounded-2xl border border-[#262626] bg-[#0a0a0a] p-3 sm:p-4`}>
          <div className="flex items-start gap-3">
            <div className="h-5 w-5 shrink-0 overflow-hidden rounded-full border border-[#3a3a3a] bg-[#1f1f1f]">
              {user?.user_metadata?.avatar_url? <img src={user.user_metadata.avatar_url} alt="avatar" className="h-14 w-14 object-cover" /> : <div className="flex h-full w-full items-center justify-center text-xs text-[#a8a8a8] font-light">{user?.email?.[0]?.toUpperCase() || 'U'}</div>}
            </div>
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={composerText}
                onChange={handleTextChange}
                rows={3}
                maxLength={MAX_TEXT_LENGTH}
                placeholder="No que você está pensando?"
                className="w-full resize-none bg-transparent text-sm text-white placeholder:text-[#8a8a8a] outline-none font-light"
              />

              {previewUrl && (
                <div className="mt-3 relative rounded-xl overflow-hidden border border-[#262626]">
                  <img src={previewUrl} className="w-full max-h-80 object-cover" alt="preview" />
                  <button onClick={() => { setSelectedImage(null); setPreviewUrl(null) }} className="absolute top-2 right-2 rounded-full bg-black/80 px-2 py-1 text-xs text-white">X</button>
                </div>
              )}

              {showMentions && mentionUsers.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-20 mt-2 max-h-52 overflow-y-auto rounded-xl border border-[#262626] bg-[#111] shadow-2xl">
                  <p className="px-3 py-2 text- tracking-widest text-[#555]">MARCAR PESSOA</p>
                  {mentionUsers.map((u) => (
                    <button key={u.id} type="button" onClick={() => selectMention(u)} className="flex w-full items-center gap-3 px-3 py-2.5 hover:bg-[#1f1f1f] text-left">
                      <img src={u.avatar_url || ''} className="h-11 w-11 rounded-full object-cover bg-[#222]" alt="" />
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1 truncate text-sm font-medium text-white">
                          <span>@{u.username}</span>
                          {u.verificado && <VerifiedBadge size={12} />}
                        </p>
                        <p className="truncate text-xs text-[#777]">{u.full_name}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />

              <div className="mt-3 flex items-center justify-between border-t border-[#1f1f1f] pt-3">
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="text-sm text-[#ff6a00] font-light"> Foto</button>
                  <span className="text-xs text-[#8a8a8a] font-light">{composerText.length}/{MAX_TEXT_LENGTH}</span>
                </div>
                <button type="button" onClick={submitTextPost} disabled={posting || (!composerText.trim() &&!selectedImage)} className="rounded-full bg-white px-5 py-1.5 text-sm font-semibold text-black transition active:scale-95 disabled:opacity-40">
                  {posting? 'Enviando...' : 'Enviar'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {loading? <div className={`${CARD_SIZE} text-center text-[#a8a8a8] py-10 text-sm font-light`}>Carregando...</div> : rendered}
        {!loading && posts.length === 0 && <div className={`${CARD_SIZE} py-16 text-center text-sm text-[#a8a8a8] font-light`}>Nenhum post ainda. Seja o primeiro!</div>}
      </div>
    </AppShell>
  )
}