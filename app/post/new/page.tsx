'use client'
import { useState, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { ArrowLeft, Search, SlidersHorizontal, X } from 'lucide-react'

const CLOUD_NAME = 'nzj72eu0'
const UPLOAD_PRESET = 'mishh_upload'

type Photo = { id: string; file: File; preview: string; zoom: number; offset: { x: number; y: number }; filter: string }
type TaggedUser = { id: string; username: string; full_name: string; avatar_url: string | null }

const FILTERS = [
  { label: 'Original', css: 'none' },
  { label: 'Vivo', css: 'saturate(1.35) contrast(1.08)' },
  { label: 'Quente', css: 'sepia(.2) saturate(1.25) brightness(1.04)' },
  { label: 'P&B', css: 'grayscale(1) contrast(1.08)' },
  { label: 'Fosco', css: 'contrast(.9) brightness(1.08) saturate(.8)' },
]

export default function NewPost() {
  const router = useRouter()
  const [photos, setPhotos] = useState<Photo[]>([])
  const [index, setIndex] = useState(0)
  const [caption, setCaption] = useState('')
  const [taggedUsers, setTaggedUsers] = useState<TaggedUser[]>([])
  const [tagQuery, setTagQuery] = useState('')
  const [tagResults, setTagResults] = useState<TaggedUser[]>([])
  const [showAdjustments, setShowAdjustments] = useState(false)
  const [loading, setLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const active = photos[index]

  const searchUsers = async (value: string) => {
    setTagQuery(value)
    if (!value.trim()) { setTagResults([]); return }
    const { data } = await supabase.from('profiles').select('id, username, full_name, avatar_url').ilike('username', `%${value.trim()}%`).limit(8)
    setTagResults((data || []) as TaggedUser[])
  }

  const addTaggedUser = (profile: TaggedUser) => {
    if (!taggedUsers.some(user => user.id === profile.id)) setTaggedUsers(users => [...users, profile])
    setTagQuery(''); setTagResults([])
  }

  const updateActivePhoto = (changes: Partial<Photo>) => {
    setPhotos(prev => prev.map((photo, photoIndex) => photoIndex === index ? { ...photo, ...changes } : photo))
  }

  const resetActivePhoto = () => updateActivePhoto({ zoom: 1, offset: { x: 0, y: 0 }, filter: 'none' })

  const addFiles = (files: FileList | null) => {
    if (!files) return
    const list = Array.from(files).slice(0, 10 - photos.length)
    const newPhotos = list.map(f => ({
      id: Math.random().toString(36).slice(2),
      file: f,
      preview: URL.createObjectURL(f),
      zoom: 1,
      offset: { x: 0, y: 0 },
      filter: 'none',
    }))
    setPhotos(p => [...p,...newPhotos])
  }

  // PINÇA + ARRASTE
  const pointers = useRef<Map<number, { x: number, y: number }>>(new Map())
  const start = useRef<{ dist: number, zoom: number, ox: number, oy: number, sx: number, sy: number } | null>(null)
  const getDist = () => {
    const pts = Array.from(pointers.current.values())
    if (pts.length < 2) return 0
    return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
  }
  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.current.size === 1) start.current = { dist: 0, zoom: active.zoom, ox: active.offset.x, oy: active.offset.y, sx: e.clientX, sy: e.clientY }
    else if (pointers.current.size === 2) start.current = { dist: getDist(), zoom: active.zoom, ox: active.offset.x, oy: active.offset.y, sx: 0, sy: 0 }
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId) ||!start.current ||!active) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.current.size === 1) {
      const dx = e.clientX - start.current.sx
      const dy = e.clientY - start.current.sy
      setPhotos(prev => prev.map((p,i) => i===index? {...p, offset: { x: start.current!.ox + dx, y: start.current!.oy + dy } } : p))
    } else {
      const newDist = getDist()
      if (start.current.dist === 0) return
      let newZoom = start.current.zoom * (newDist / start.current.dist)
      newZoom = Math.min(3, Math.max(1, newZoom))
      setPhotos(prev => prev.map((p,i) => i===index? {...p, zoom: newZoom } : p))
    }
  }
  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId)
    if (pointers.current.size === 0) start.current = null
  }

  const getBlob = useCallback(async (p: Photo): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.src = p.preview
      img.onload = () => {
        const outW = 1080, outH = 1350
        const canvas = document.createElement('canvas')
        canvas.width = outW; canvas.height = outH
        const ctx = canvas.getContext('2d')!
        const rect = containerRef.current!.getBoundingClientRect()
        const toOut = outW / rect.width
        const base = Math.max(outW / img.naturalWidth, outH / img.naturalHeight)
        const w = img.naturalWidth * base * p.zoom
        const h = img.naturalHeight * base * p.zoom
        const x = outW/2 - w/2 + p.offset.x * toOut
        const y = outH/2 - h/2 + p.offset.y * toOut
        ctx.filter = p.filter
        ctx.drawImage(img, x, y, w, h)
        canvas.toBlob(b => b? resolve(b) : reject('erro'), 'image/jpeg', 0.92)
      }
    })
  }, [])

  const publish = async () => {
    if (!photos.length) return
    setLoading(true)
    const tId = toast.loading('Publicando...')
    try {
      const blobs = await Promise.all(photos.map(getBlob))
      const urls = await Promise.all(blobs.map(async b => {
        const fd = new FormData(); fd.append('file', b); fd.append('upload_preset', UPLOAD_PRESET)
        const r = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: 'POST', body: fd })
        const d = await r.json(); return d.secure_url
      }))
      const { error } = await supabase.from('posts').insert({ image_url: urls[0], images: urls, caption, filter: active?.filter || 'none', tagged_user_ids: taggedUsers.map(user => user.id) })
      if (error) throw error
      toast.success('Postado!', { id: tId }); router.push('/feed')
    } catch (e: any) { toast.error(e.message, { id: tId }) } finally { setLoading(false) }
  }

  if (photos.length === 0) {
    return (
      <div className="relative min-h-screen bg-black grid place-items-center p-4">
        <button type="button" onClick={() => router.push('/feed')} aria-label="Voltar para o feed" className="absolute left-4 top-4 rounded-full p-2 text-white hover:bg-white/10 active:scale-95 transition">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <label className="w-full max-w-md aspect-[4/5] max-h-[70vh] bg-[#0f0f0f] border border-dashed border-white/15 grid place-items-center cursor-pointer rounded-lg">
          <input type="file" accept="image/*" multiple className="hidden" onChange={e => addFiles(e.target.files)} />
          <span className="text-white text-sm">Toque para escolher</span>
        </label>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <div className="h-14 flex items-center justify-between px-4 border-b border-white/10 w-full max-w-5xl mx-auto">
        <button type="button" onClick={() => router.push('/feed')} aria-label="Voltar para o feed" className="rounded-full p-2 text-white hover:bg-white/10 active:scale-95 transition">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <button onClick={publish} disabled={loading} className="text-[#0095f6] font-bold text-">{loading? '...' : 'Publicar'}</button>
      </div>

      {/* CONTAINER MENOR - CABE NO PC */}
      <div className="flex-1 flex flex-col md:flex-row items-center justify-center gap-6 p-4 w-full max-w-5xl mx-auto">
        {/* FOTO DIMINUIDA */}
        <div
          ref={containerRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          onDoubleClick={() => setPhotos(prev => prev.map((p,i) => i===index? {...p, zoom: 1, offset: {x:0,y:0}} : p))}
          className="relative w-full max-w-[560px] aspect-[4/5] max-h-[70vh] bg-[#0f0f0f] overflow-hidden touch-none select-none rounded-lg"
        >
          {photos.map((p,i) => (
            <img key={p.id} src={p.preview} alt="" draggable={false}
              className={`absolute top-1/2 left-1/2 w-full h-full object-cover max-w-none ${i===index? 'opacity-100' : 'opacity-0'}`}
              style={{ transform: `translate(-50%, -50%) translate(${p.offset.x}px, ${p.offset.y}px) scale(${p.zoom})`, filter: p.filter }} />
          ))}
        </div>

        <div className="w-full max-w-md space-y-3">
          <textarea value={caption} onChange={e => setCaption(e.target.value)} placeholder="Adicione uma legenda..." maxLength={2200} className="w-full bg-[#121212] border border-white/10 rounded-lg p-3 text-sm outline-none min-h-28 resize-none" />
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
            <input value={tagQuery} onChange={e => searchUsers(e.target.value)} placeholder="Marcar pessoas" className="w-full bg-[#121212] border border-white/10 rounded-lg pl-10 pr-3 py-3 text-sm outline-none" />
            {tagResults.length > 0 && <div className="absolute z-10 top-full mt-1 w-full rounded-lg border border-white/10 bg-[#1a1a1a] p-1 shadow-xl">{tagResults.map(profile => <button type="button" key={profile.id} onClick={() => addTaggedUser(profile)} className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-white/10"><img src={profile.avatar_url || ''} alt="" className="h-8 w-8 rounded-full bg-[#333] object-cover" /><span className="text-sm text-white">@{profile.username}</span></button>)}</div>}
          </div>
          {taggedUsers.length > 0 && <div className="flex flex-wrap gap-2">{taggedUsers.map(user => <span key={user.id} className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs text-white">@{user.username}<button type="button" onClick={() => setTaggedUsers(users => users.filter(item => item.id !== user.id))} aria-label={`Remover @${user.username}`}><X className="h-3 w-3" /></button></span>)}</div>}
          <button type="button" onClick={() => setShowAdjustments(value => !value)} className="flex items-center gap-2 text-sm text-white"><SlidersHorizontal className="h-4 w-4" /> Ajustar foto</button>
          {showAdjustments && <div className="space-y-4 rounded-lg border border-white/10 bg-[#121212] p-3">
            <div className="grid grid-cols-5 gap-2">{FILTERS.map(filter => <button type="button" key={filter.label} onClick={() => updateActivePhoto({ filter: filter.css })} className={`space-y-1 text-center text-[10px] ${active.filter === filter.css ? 'text-white' : 'text-zinc-500'}`}><img src={active.preview} alt="" className="aspect-square w-full rounded object-cover" style={{ filter: filter.css }} /><span>{filter.label}</span></button>)}</div>
            <div className="space-y-3 border-t border-white/10 pt-3">
              <label className="block text-xs text-zinc-300">Zoom <span className="float-right text-zinc-500">{active.zoom.toFixed(2)}x</span><input type="range" min="1" max="3" step="0.01" value={active.zoom} onChange={e => updateActivePhoto({ zoom: Number(e.target.value) })} className="mt-2 w-full accent-white" /></label>
              <label className="block text-xs text-zinc-300">Horizontal <span className="float-right text-zinc-500">{Math.round(active.offset.x)}px</span><input type="range" min="-240" max="240" value={active.offset.x} onChange={e => updateActivePhoto({ offset: { ...active.offset, x: Number(e.target.value) } })} className="mt-2 w-full accent-white" /></label>
              <label className="block text-xs text-zinc-300">Vertical <span className="float-right text-zinc-500">{Math.round(active.offset.y)}px</span><input type="range" min="-240" max="240" value={active.offset.y} onChange={e => updateActivePhoto({ offset: { ...active.offset, y: Number(e.target.value) } })} className="mt-2 w-full accent-white" /></label>
              <button type="button" onClick={resetActivePhoto} className="text-xs text-zinc-400 underline underline-offset-4 hover:text-white">Restaurar ajustes desta foto</button>
            </div>
          </div>}
          <p className="text-xs text-zinc-500">Pinça para zoom, arraste para mover e toque em uma miniatura para ajustar outra foto.</p>
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-zinc-400">{photos.length}/10 fotos</span>
            {photos.length < 10 && <label className="cursor-pointer rounded-full border border-white/20 px-3 py-1.5 text-xs text-white hover:bg-white/10">Adicionar fotos<input type="file" accept="image/*" multiple className="hidden" onChange={e => addFiles(e.target.files)} /></label>}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">{photos.map((photo, photoIndex) => <button type="button" key={photo.id} onClick={() => setIndex(photoIndex)} aria-label={`Editar foto ${photoIndex + 1}`} className={`relative h-14 w-14 shrink-0 overflow-hidden rounded border-2 ${photoIndex === index ? 'border-white' : 'border-transparent'}`}><img src={photo.preview} alt="" className="h-full w-full object-cover" style={{ filter: photo.filter }} /><span className="absolute bottom-0 right-0 bg-black/70 px-1 text-[9px] text-white">{photoIndex + 1}</span></button>)}</div>
        </div>
      </div>
    </div>
  )
}