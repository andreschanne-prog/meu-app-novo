'use client'
import { useRef, useState, useCallback } from 'react'
import AppShell from '@/components/AppShell'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { extractHashtags, classNames } from '@/lib/helpers'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { checkNSFW, NSFW_THRESHOLD } from '@/hooks/useNSFWCheck'
import { notifyMentionedUsers } from '@/lib/push'

const CLOUD_NAME = 'nzj72eu0'
const UPLOAD_PRESET = 'mishh_upload'

type Aspect = { key: string; label: string; ratio: number; w: number; h: number }
const ASPECTS: Aspect[] = [
  { key: '1:1', label: '1:1', ratio: 1, w: 1080, h: 1080 },
  { key: '4:5', label: '4:5', ratio: 4 / 5, w: 1080, h: 1350 },
  { key: '16:9', label: '16:9', ratio: 16 / 9, w: 1080, h: 608 },
  { key: 'original', label: 'Original', ratio: 0, w: 1080, h: 1080 },
]

type PhotoItem = {
  id: string
  preview: string
  file: File
  zoom: number
  offset: { x: number; y: number }
  aspect: Aspect
  brightness: number
  contrast: number
  saturate: number
  exposure: number
}

export default function NewPostPage() {
  const { user } = useAuth()
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const imageRefs = useRef<Record<string, HTMLImageElement | null>>({})
  const containerRef = useRef<HTMLDivElement>(null)

  const [photos, setPhotos] = useState<PhotoItem[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [caption, setCaption] = useState('')
  const [loading, setLoading] = useState(false)

  const [isDragging, setIsDragging] = useState(false)
  const [startPos, setStartPos] = useState({ x: 0, y: 0 })

  const activePhoto = photos[activeIndex]

  const updateActive = (patch: Partial<PhotoItem>) => {
    setPhotos(prev => prev.map((p, i) => i === activeIndex? {...p,...patch } : p))
  }

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    if (photos.length + files.length > 10) {
      toast.error('Máximo 10 fotos')
      return
    }
    for (const f of files) {
      const nsfw = await checkNSFW(f)
      if (!nsfw.safe && nsfw.score > NSFW_THRESHOLD) {
        toast.error(`Bloqueado: ${f.name}`)
        continue
      }
      const id = Math.random().toString(36).slice(2)
      const preview = URL.createObjectURL(f)
      const img = new Image()
      img.src = preview
      await new Promise(r => (img.onload = r))
      let asp = ASPECTS[0]
      const r = img.width / img.height
      if (r > 1.2) asp = ASPECTS[2]
      else if (r < 0.9) asp = ASPECTS[1]

      setPhotos(prev => [
       ...prev,
        {
          id, preview, file: f,
          zoom: 1, offset: { x: 0, y: 0 }, aspect: asp,
          brightness: 100, contrast: 100, saturate: 100, exposure: 100
        }
      ])
    }
    e.target.value = ''
  }

  const onPointerDown = (e: React.PointerEvent) => {
    setIsDragging(true)
    setStartPos({ x: e.clientX - (activePhoto?.offset.x || 0), y: e.clientY - (activePhoto?.offset.y || 0) })
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDragging ||!activePhoto) return
    updateActive({ offset: { x: e.clientX - startPos.x, y: e.clientY - startPos.y } })
  }
  const onPointerUp = () => setIsDragging(false)

  const getFilterString = (p: PhotoItem) => {
    // exposure simulado com brightness extra
    return `brightness(${p.brightness * (p.exposure/100)}%) contrast(${p.contrast}%) saturate(${p.saturate}%)`
  }

  const getCroppedBlob = useCallback(async (photo: PhotoItem): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = imageRefs.current[photo.id]
      const container = containerRef.current
      if (!img ||!container) return reject('no img')
      let outW = photo.aspect.w
      let outH = photo.aspect.h
      if (photo.aspect.key === 'original') {
        outW = 1080
        outH = Math.round(1080 / (img.naturalWidth / img.naturalHeight))
      }
      const canvas = document.createElement('canvas')
      canvas.width = outW
      canvas.height = outH
      const ctx = canvas.getContext('2d')!
      ctx.filter = getFilterString(photo)
      const rect = container.getBoundingClientRect()
      const scaleX = outW / rect.width
      const scaleY = outH / rect.height
      ctx.save()
      ctx.translate(outW / 2 + photo.offset.x * scaleX, outH / 2 + photo.offset.y * scaleY)
      ctx.scale(photo.zoom, photo.zoom)
      const baseScale = Math.max(rect.width / img.naturalWidth, rect.height / img.naturalHeight)
      const drawW = img.naturalWidth * baseScale * (outW / rect.width)
      const drawH = img.naturalHeight * baseScale * (outH / rect.height)
      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH)
      ctx.restore()
      canvas.toBlob(b => b? resolve(b) : reject('canvas'), 'image/jpeg', 0.92)
    })
  }, [])

  async function uploadToCloudinary(blob: Blob) {
    const fd = new FormData()
    fd.append('file', blob)
    fd.append('upload_preset', UPLOAD_PRESET)
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: 'POST', body: fd })
    const data = await res.json()
    if (!res.ok ||!data.secure_url) throw new Error(data.error?.message || 'Erro no upload')
    return data.secure_url as string
  }

  async function handlePublish() {
    if (!user) return toast.error('Faça login')
    if (!photos.length) return toast.error('Selecione fotos')
    setLoading(true)
    const tId = toast.loading(`Publicando ${photos.length} foto(s)...`)
    try {
      const blobs = await Promise.all(photos.map(p => getCroppedBlob(p)))
      const urls = await Promise.all(blobs.map(b => uploadToCloudinary(b)))
      const hashtags = extractHashtags(caption)

      const { error } = await supabase.from('posts').insert({
        user_id: user.id,
        image_url: urls[0],
        images: urls,
        filter: 'normal',
        caption,
        hashtags,
      })

      if (error) {
        const rows = urls.map((url, i) => ({
          user_id: user.id,
          image_url: url,
          filter: 'normal',
          caption: i === 0? caption : '',
          hashtags: i === 0? hashtags : [],
        }))
        const { error: err2 } = await supabase.from('posts').insert(rows)
        if (err2) throw err2
      }

      void notifyMentionedUsers({ actorId: user.id, text: caption, body: `@${user.user_metadata?.username || 'Alguém'} marcou você.`, url: '/feed' })
      toast.success('Postado!', { id: tId })
      router.push('/feed')
    } catch (err: any) {
      toast.error(err.message || 'Erro', { id: tId })
    } finally {
      setLoading(false)
    }
  }

  const hasAdjust = activePhoto && (activePhoto.brightness!== 100 || activePhoto.contrast!== 100 || activePhoto.saturate!== 100 || activePhoto.exposure!== 100 || activePhoto.zoom!== 1)

  return (
    <AppShell>
      <div className="max-w- mx-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text- font-semibold tracking-tight text-white">Nova publicação</h2>
          {photos.length > 0 && (
            <button onClick={handlePublish} disabled={loading} className="h-9 px-5 bg-white text-black rounded-full text- font-medium disabled:opacity-50 hover:bg-zinc-200 active:scale-95 transition">
              {loading? 'Publicando...' : `Publicar ${photos.length > 1? `(${photos.length})` : ''}`}
            </button>
          )}
        </div>

        {photos.length === 0? (
          <label className="group flex flex-col items-center justify-center w-full h- rounded- border border-dashed border-white/15 bg-[#121212] hover:bg-[#171717] hover:border-white/25 transition cursor-pointer">
            <input ref={fileRef} type="file" accept="image/*" multiple onChange={onFiles} className="hidden" />
            <div className="w-16 h-16 rounded-full bg-white text-black grid place-items-center text-2xl group-active:scale-90 transition">+</div>
            <p className="mt-4 text- text-white font-medium">Arraste fotos ou clique para escolher</p>
            <p className="text- text-zinc-500 mt-1">Até 10 fotos • arraste para reposicionar</p>
          </label>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-4">
            <div className="space-y-3">
              <div
                ref={containerRef}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerLeave={onPointerUp}
                onDoubleClick={() => updateActive({ zoom: 1, offset: { x: 0, y: 0 } })}
                className="relative w-full bg-black rounded- overflow-hidden select-none touch-none cursor-grab active:cursor-grabbing border border-white/10"
                style={{ aspectRatio: activePhoto?.aspect.key === 'original'? undefined : activePhoto?.aspect.ratio || 1 }}
              >
                {photos.map((p, i) => (
                  <img
                    key={p.id}
                    ref={el => { imageRefs.current[p.id] = el }}
                    src={p.preview}
                    alt=""
                    draggable={false}
                    className={`absolute top-1/2 left-1/2 max-w-none will-change-transform ${i === activeIndex? 'opacity-100' : 'opacity-0'}`}
                    style={{
                      filter: getFilterString(p),
                      transform: `translate(-50%, -50%) translate(${p.offset.x}px, ${p.offset.y}px) scale(${p.zoom})`,
                      width: '100%', height: '100%', objectFit: 'cover'
                    }}
                  />
                ))}
                {photos.length > 1 && (
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur">
                    {photos.map((_, i) => (
                      <div key={i} className={classNames('w-1.5 h-1.5 rounded-full transition-all', i === activeIndex? 'bg-white w-4' : 'bg-white/40')} />
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2 overflow-x-auto no-scrollbar p-1">
                {photos.map((p, i) => (
                  <button key={p.id} onClick={() => setActiveIndex(i)} className={classNames('relative shrink-0 w- h- rounded-xl overflow-hidden border-2 transition', i === activeIndex? 'border-white' : 'border-transparent opacity-60 hover:opacity-100')}>
                    <img src={p.preview} className="w-full h-full object-cover" style={{ filter: getFilterString(p) }} alt="" />
                    <button onClick={(e) => { e.stopPropagation(); setPhotos(prev => { const n = prev.filter((_, idx) => idx!== i); if (activeIndex >= n.length) setActiveIndex(Math.max(0, n.length -1)); return n })}} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-white text- grid place-items-center">✕</button>
                  </button>
                ))}
                {photos.length < 10 && (
                  <label className="shrink-0 w- h- rounded-xl bg-[#1e1e1e] border border-dashed border-white/15 grid place-items-center cursor-pointer hover:bg-[#252525] text-xl text-white">+
                    <input type="file" accept="image/*" multiple onChange={onFiles} className="hidden" />
                  </label>
                )}
              </div>

              <div className="rounded- bg-[#161616] border border-white/5 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex gap-1.5">
                    {ASPECTS.map(a => (
                      <button key={a.key} onClick={() => updateActive({ aspect: a })} className={classNames('h-8 px-3.5 rounded-full text- font-medium transition', activePhoto?.aspect.key === a.key? 'bg-white text-black' : 'bg-[#262626] text-zinc-300 hover:bg-[#2f2f2f]')}>{a.label}</button>
                    ))}
                  </div>
                  {hasAdjust && (
                    <button onClick={() => updateActive({ zoom: 1, offset: { x: 0, y: 0 }, brightness: 100, contrast: 100, saturate: 100, exposure: 100 })} className="h-8 px-3 rounded-full text- bg-[#262626] text-zinc-400 hover:text-white">Resetar</button>
                  )}
                </div>

                <div className="space-y-3.5">
                  <div className="flex items-center gap-3">
                    <span className="text- text-zinc-500 w- uppercase tracking-widest">Zoom</span>
                    <input type="range" min={1} max={3} step={0.01} value={activePhoto?.zoom || 1} onChange={e => updateActive({ zoom: parseFloat(e.target.value) })} className="flex-1 accent-white" />
                    <span className="text- text-white w-10 text-right">{(activePhoto?.zoom || 1).toFixed(1)}x</span>
                  </div>
                  {[
                    { k: 'exposure', label: 'Exposição', min: 50, max: 150 },
                    { k: 'brightness', label: 'Brilho', min: 50, max: 150 },
                    { k: 'contrast', label: 'Contraste', min: 50, max: 150 },
                    { k: 'saturate', label: 'Saturação', min: 0, max: 200 },
                  ].map(c => (
                    <div key={c.k} className="flex items-center gap-3">
                      <span className="text- text-zinc-500 w- uppercase tracking-widest">{c.label}</span>
                      <input type="range" min={c.min} max={c.max} value={(activePhoto as any)?.[c.k]?? 100} onChange={e => updateActive({ [c.k]: parseInt(e.target.value) } as any)} className="flex-1 accent-white" />
                      <span className="text- text-white w-10 text-right">{(activePhoto as any)?.[c.k]?? 100}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded- bg-[#161616] border border-white/5 p-4 h-fit sticky top-4">
              <textarea value={caption} onChange={e => setCaption(e.target.value)} placeholder="Escreva uma legenda... #hashtags @menções" className="w-full min-h- bg-[#0f0f0f] border border-white/5 rounded- p-3.5 text- text-white placeholder:text-zinc-500 outline-none focus:border-white/15 resize-none" />
              <div className="flex justify-between mt-3">
                <span className="text- text-zinc-500">{caption.length}/2200</span>
                <span className="text- text-zinc-600">Arraste • duplo clique reseta</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}