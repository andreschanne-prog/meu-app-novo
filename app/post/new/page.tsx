'use client'
import { useRef, useState } from 'react'
import AppShell from '@/components/AppShell'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { FILTERS, extractHashtags, classNames } from '@/lib/helpers'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { checkNSFW, NSFW_THRESHOLD } from '@/hooks/useNSFWCheck'
import { notifyMentionedUsers } from '@/lib/push'

const CLOUD_NAME = 'nzj72eu0'
const UPLOAD_PRESET = 'mishh_upload'

export default function NewPostPage() {
  const { user } = useAuth()
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string>('')
  const [filter, setFilter] = useState('normal')
  const [caption, setCaption] = useState('')
  const [loading, setLoading] = useState(false)

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    const nsfw = await checkNSFW(f)
    if (!nsfw.safe && nsfw.score > NSFW_THRESHOLD) {
      toast.error('Conteúdo impróprio bloqueado (NSFW).')
      e.target.value = ''
      return
    }
    setPreview(URL.createObjectURL(f))
  }

  async function uploadToCloudinary(file: File) {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', UPLOAD_PRESET)
    formData.append('folder', 'mishh/posts')

    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body: formData,
    })
    const data = await res.json()
    if (!data.secure_url) throw new Error(data.error?.message || 'Erro no Cloudinary')
    return data.secure_url
  }

  async function upload() {
    if (!user) return
    if (!preview) return toast.error('Selecione uma foto.')
    setLoading(true)
    const file = fileRef.current?.files?.[0]
    if (!file) { setLoading(false); return }

    try {
      toast.loading('Enviando pro Cloudinary...')
      const imageUrl = await uploadToCloudinary(file)

      const hashtags = extractHashtags(caption).join(',')

      const { error: dbErr } = await supabase.from('posts').insert({
        user_id: user.id,
        image_url: imageUrl, // AGORA É CLOUDINARY
        filter,
        caption,
        hashtags,
      })
      setLoading(false)
      toast.dismiss()
      if (dbErr) return toast.error(dbErr.message)
      void notifyMentionedUsers({ actorId: user.id, text: caption, body: `@${user.user_metadata?.username || 'Alguém'} marcou você em um post.`, url: '/feed' })
      toast.success('Postado!')
      router.push('/feed')
    } catch (err: any) {
      setLoading(false)
      toast.dismiss()
      toast.error(err.message || 'Erro ao enviar')
    }
  }

  return (
    <AppShell>
      <h2 className="text-xl sm:text-2xl font-light mb-6 text-white tracking-wide">Criar post</h2>

      {!preview? (
        <div className="py-12 text-center">
          <label className="cursor-pointer inline-block">
            <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
            <span className="inline-block px-6 py-3.5 bg-white text-black text-sm sm:text-base font-light rounded-full hover:opacity-90 active:scale-95 transition tracking-wide">
              📷 Escolher foto
            </span>
          </label>
          <p className="text-xs sm:text-sm text-[#a8a8a8] mt-4 font-light">Selecione uma imagem para começar</p>
        </div>
      ) : (
        <div className="mt-3">
          <div className="aspect-square w-full max-w-xl mx-auto bg-[#0a0a0a] overflow-hidden">
            <img src={preview} alt="Preview" className={`w-full h-full object-cover filter-${filter}`} />
          </div>

          <div className="mt-4 overflow-x-auto no-scrollbar -mx-2 px-2">
            <div className="flex gap-2 pb-2">
              {FILTERS.map(f => (
                <button key={f.key} onClick={() => setFilter(f.key)}
                  className={classNames(
                    'px-3.5 py-1.5 rounded-full text-xs sm:text-sm whitespace-nowrap transition active:scale-95 shrink-0 font-light tracking-wide',
                    filter === f.key? 'bg-white text-black' : 'bg-[#262626] text-white hover:bg-[#404040]'
                  )}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <textarea value={caption} onChange={e=>setCaption(e.target.value)} placeholder="Escreva uma legenda... use #hashtags"
            className="w-full mt-3 p-3 text-sm sm:text-base rounded-2xl bg-[#262626] text-white placeholder:text-[#a8a8a8] font-light resize-none" rows={3} />

          <button onClick={upload} disabled={loading}
            className="w-full mt-4 bg-white text-black font-light py-3.5 text-sm sm:text-base rounded-full disabled:opacity-50 hover:opacity-90 active:scale-95 transition tracking-wide">
            {loading? 'Publicando no Cloudinary...' : 'Publicar'}
          </button>
        </div>
      )}
    </AppShell>
  )
}