'use client'
import { useEffect, useState } from 'react'
import AppShell from '@/components/AppShell'
import PostCard from '@/components/PostCard'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { isAdmin } from '@/lib/helpers'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Trophy, Heart, Calendar, ImagePlus, X } from 'lucide-react'

type TopUser = { user_id: string; username: string; full_name: string | null; avatar_url: string | null; total_likes: number; post_count: number }

const CLOUD_NAME = 'nzj72eu0'
const UPLOAD_PRESET = 'mishh_upload'

const MONTHS_PT = ['JANEIRO','FEVEREIRO','MARÇO','ABRIL','MAIO','JUNHO','JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO']

export default function DestaquesPage() {
  const { user } = useAuth()
  const [isAdm, setIsAdm] = useState(false)
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [viewMode, setViewMode] = useState<'month'|'year'>('month')
  const [top10Month, setTop10Month] = useState<TopUser[]>([])
  const [top10Year, setTop10Year] = useState<TopUser[]>([])
  const [postsDestaques, setPostsDestaques] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [showModal, setShowModal] = useState(false)
  const [caption, setCaption] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [posting, setPosting] = useState(false)

  useEffect(() => { if (user) isAdmin(user.id).then(setIsAdm) }, [user])
  useEffect(() => { loadRankingMonth(); loadRankingYear(); loadPostsDestaques() }, [month, year, user])

  async function loadRankingMonth() {
    setLoading(true)
    const firstDay = new Date(year, month - 1, 1).toISOString()
    const lastDay = new Date(year, month, 0, 23, 59, 59).toISOString()
    const { data } = await supabase.from('posts').select('user_id, profiles(id, username, full_name, avatar_url), likes(count)').gte('created_at', firstDay).lte('created_at', lastDay)
    const map = new Map<string, TopUser>()
    data?.forEach((p: any) => {
      const profile = Array.isArray(p.profiles)? p.profiles[0] : p.profiles
      if (!profile) return
      const likes = p.likes?.[0]?.count?? 0
      const exist = map.get(p.user_id)
      if (exist) { exist.total_likes += likes; exist.post_count += 1 }
      else map.set(p.user_id, { user_id: p.user_id, username: profile.username, full_name: profile.full_name, avatar_url: profile.avatar_url, total_likes: likes, post_count: 1 })
    })
    setTop10Month(Array.from(map.values()).sort((a,b) => b.total_likes - a.total_likes).slice(0,10))
    setLoading(false)
  }

  async function loadRankingYear() {
    const firstDayYear = new Date(year, 0, 1).toISOString()
    const lastDayYear = new Date(year, 11, 31, 23, 59, 59).toISOString()
    const { data } = await supabase.from('posts').select('user_id, profiles(id, username, full_name, avatar_url), likes(count)').gte('created_at', firstDayYear).lte('created_at', lastDayYear)
    const map = new Map<string, TopUser>()
    data?.forEach((p: any) => {
      const profile = Array.isArray(p.profiles)? p.profiles[0] : p.profiles
      if (!profile) return
      const likes = p.likes?.[0]?.count?? 0
      const exist = map.get(p.user_id)
      if (exist) { exist.total_likes += likes; exist.post_count += 1 }
      else map.set(p.user_id, { user_id: p.user_id, username: profile.username, full_name: profile.full_name, avatar_url: profile.avatar_url, total_likes: likes, post_count: 1 })
    })
    setTop10Year(Array.from(map.values()).sort((a,b) => b.total_likes - a.total_likes).slice(0,10))
  }

  async function loadPostsDestaques() {
    const { data } = await supabase.from('posts').select('*, profiles(id, username, full_name, avatar_url, verificado, online, last_seen), likes(count)').ilike('hashtags', '%destaques%').order('created_at', { ascending: false }).limit(30)
    if (data) {
      let likedIds = new Set<string>()
      if (user) { const { data: likes } = await supabase.from('likes').select('post_id').eq('user_id', user.id); likedIds = new Set(((likes as any) || []).map((l: any) => l.post_id)) }
      setPostsDestaques(data.map((p: any) => ({...p, like_count: p.likes?.[0]?.count?? 0, user_liked: likedIds.has(p.id)})))
    }
  }

  function onPickImage(e: any) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setPreview(URL.createObjectURL(file))
  }

  function generateCaptionAuto() {
    const list = viewMode === 'month'? top10Month : top10Year
    const periodo = viewMode === 'month'? `${MONTHS_PT[month-1]} ${year}` : `ANO ${year}`
    if (list.length === 0) return `🏆 Destaques ${periodo} - Nenhum dado ainda`
    let txt = `🏆 TOP 10 MAIS CURTIDOS - ${periodo} 🏆\n\n`
    list.forEach((u, i) => { txt += `${i+1}º @${u.username} - ${u.total_likes} curtidas\n` })
    txt += `\nParabéns a todos! 👏 #destaques #mishh #${MONTHS_PT[month-1].toLowerCase()}`
    return txt
  }

  async function uploadToCloudinary(file: File) {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', UPLOAD_PRESET)
    formData.append('folder', 'mishh/destaques')
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: 'POST', body: formData })
    const data = await res.json()
    if (!data.secure_url) throw new Error('Falha no Cloudinary')
    return data.secure_url
  }

  async function handleCreatePost() {
    if (!user ||!caption.trim()) { toast.error('Escreva a legenda'); return }
    setPosting(true)
    try {
      let imageUrl = ''
      if (imageFile) { imageUrl = await uploadToCloudinary(imageFile) }
      const { error } = await supabase.from('posts').insert({
        user_id: user.id,
        image_url: imageUrl,
        filter: 'normal',
        caption: caption.trim(),
        hashtags: `destaques,mishh,${MONTHS_PT[month-1].toLowerCase()},top10,${viewMode}`,
      })
      if (error) throw error
      toast.success('Postado nos Destaques!')
      setShowModal(false); setCaption(''); setImageFile(null); setPreview('')
      loadPostsDestaques()
    } catch (err: any) { toast.error(err.message || 'Erro') }
    finally { setPosting(false) }
  }

  const topList = viewMode === 'month'? top10Month : top10Year

  return (
    <AppShell>
      <div className="pt-2 px-2 sm:px-0">
        <div className="w-full max-w-xl mx-auto">

          <div className="sticky top-0 z-40 -mx-2 sm:mx-0 mb-4 border-b border-[#262626] bg-black/90 backdrop-blur-md px-3 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#ff6a00]"><Trophy className="h-4 w-4 text-white" /></div>
                <h1 className="text-sm font-bold text-white">Destaques do MISHH</h1>
              </div>
              <div className="flex items-center gap-2">
                {isAdm && (
                  <button onClick={() => { setCaption(generateCaptionAuto()); setShowModal(true) }} className="rounded-full bg-[#ff6a00] px-4 py-1.5 text-xs font-bold text-white hover:bg-[#ff7a1a]">+ Novo Destaque</button>
                )}
                <Link href="/feed" className="text-xs text-[#666] hover:text-white">Voltar</Link>
              </div>
            </div>
          </div>

          {isAdm && (
            <div className="mb-6 rounded-2xl border border-[#1f1f1f] bg-[#0a0a0a] p-3">
              <p className="mb-2 text-[10px] font-bold tracking-widest text-[#666]">RANKING AUTOMÁTICO EM TEMPO REAL</p>

              <div className="mb-3 flex rounded-full bg-black p-1 border border-[#262626]">
                <button onClick={() => setViewMode('month')} className={`flex-1 rounded-full py-1.5 text-xs font-bold transition ${viewMode==='month'?'bg-white text-black':'text-[#666]'}`}>MÊS</button>
                <button onClick={() => setViewMode('year')} className={`flex-1 rounded-full py-1.5 text-xs font-bold transition ${viewMode==='year'?'bg-white text-black':'text-[#666]'}`}>ANO {year}</button>
              </div>

              <div className="mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[#ff6a00]" />
                <select value={month} onChange={e => setMonth(Number(e.target.value))} className="flex-1 rounded-full border border-[#262626] bg-black px-3 py-2 text-xs text-white outline-none">
                  {MONTHS_PT.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
                </select>
                <select value={year} onChange={e => setYear(Number(e.target.value))} className="w-20 rounded-full border border-[#262626] bg-black px-3 py-2 text-xs text-white outline-none">
                  {[2024,2025,2026].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>

              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] text-[#ff6a00] font-bold">TOP 10 - {viewMode==='month'? MONTHS_PT[month-1] : `ANO ${year}`}</p>
                <button onClick={() => { setCaption(generateCaptionAuto()); setShowModal(true) }} className="text-[10px] text-white bg-[#262626] px-2 py-1 rounded-full">Gerar post automático</button>
              </div>

              {loading? <p className="py-4 text-center text-xs text-[#555]">Carregando...</p> : topList.length === 0? <p className="py-4 text-center text-xs text-[#555]">Nenhum dado em {viewMode==='month'? MONTHS_PT[month-1] : year}</p> : (
                <div className="space-y-1">
                  {topList.map((u, idx) => (
                    <div key={u.user_id} className="flex items-center gap-2 rounded-xl bg-black px-2 py-2">
                      <span className={`w-6 text-xs font-bold ${idx<3?'text-[#ff6a00]':'text-[#666]'}`}>#{idx+1}</span>
                      <img src={u.avatar_url || ''} className="h-8 w-8 rounded-full object-cover bg-[#1a1a1a]" alt="" />
                      <div className="flex-1 min-w-0"><p className="truncate text-xs text-white">@{u.username}</p><p className="text-[10px] text-[#777]">{u.total_likes} curtidas • {u.post_count} posts</p></div>
                      <Heart className="h-3 w-3 text-[#333]" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div>
            <h3 className="mb-3 text-xs font-bold tracking-widest text-[#ff6a00]">POSTS OFICIAIS</h3>
            {postsDestaques.length === 0? (
              <div className="rounded-2xl border border-dashed border-[#262626] bg-[#0a0a0a] p-10 text-center">
                <p className="text-sm text-[#666]">Nenhum destaque postado ainda</p>
              </div>
            ) : postsDestaques.map((p) => <div key={p.id} className="mb-4"><PostCard post={p} /></div>)}
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#262626] bg-[#0a0a0a] p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold text-white">Novo post em Destaques - {viewMode==='month'? MONTHS_PT[month-1] : `ANO ${year}`}</p>
              <button onClick={() => setShowModal(false)}><X className="h-5 w-5 text-[#666]" /></button>
            </div>

            <label className="mb-3 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[#333] bg-black p-6">
              {preview? <img src={preview} className="max-h-60 rounded-xl object-cover" alt="" /> : <><ImagePlus className="mb-2 h-8 w-8 text-[#555]" /><span className="text-xs text-[#666]">Foto do Top 10 (opcional)</span></>}
              <input type="file" accept="image/*" className="hidden" onChange={onPickImage} />
            </label>

            <textarea value={caption} onChange={e => setCaption(e.target.value)} rows={8} className="w-full rounded-xl border border-[#262626] bg-black p-3 text-sm text-white outline-none placeholder:text-[#555]" />

            <div className="mt-3 flex gap-2">
              <button onClick={() => setShowModal(false)} className="flex-1 rounded-full border border-[#262626] py-2.5 text-sm text-white">Cancelar</button>
              <button onClick={handleCreatePost} disabled={posting ||!caption.trim()} className="flex-1 rounded-full bg-[#ff6a00] py-2.5 text-sm font-bold text-white disabled:opacity-50">{posting? 'Postando no Cloudinary...' : 'Postar nos Destaques'}</button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}