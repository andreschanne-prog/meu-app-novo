'use client'
import { useEffect, useState } from 'react'
import AppShell from '@/components/AppShell'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { ImagePlus } from 'lucide-react'
import AvatarCropper from '@/components/AvatarCropper'

const CLOUD_NAME = 'nzj72eu0'
const UPLOAD_PRESET = 'mishh_upload'

const RELATIONSHIP_OPTIONS = [
  { value: '', label: 'Não informar' },
  { value: 'solteiro', label: 'Solteiro(a)' },
  { value: 'relacionamento', label: 'Em um relacionamento' },
  { value: 'noivo', label: 'Noivo(a)' },
  { value: 'casado', label: 'Casado(a)' },
  { value: 'uniao_estavel', label: 'Em união estável' },
  { value: 'complicado', label: 'É complicado' },
  { value: 'aberto', label: 'Em um relacionamento aberto' },
  { value: 'separado', label: 'Separado(a)' },
  { value: 'divorciado', label: 'Divorciado(a)' },
  { value: 'viuvo', label: 'Viúvo(a)' },
]

export default function EditProfilePage() {
  const { user } = useAuth()
  const router = useRouter()
  const [form, setForm] = useState({
    full_name: '',
    username: '',
    country: '',
    state: '',
    city: '',
    avatar_url: '',
    bio: '',
    relationship_status: '',
    relationship_with: ''
  })
  const [loading, setLoading] = useState(false)
  const [showCropper, setShowCropper] = useState(false)
  const [tempImage, setTempImage] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    supabase.from('profiles').select('*').eq('id', user.id).single().then(({ data }) => {
      if (data) setForm({
        full_name: data.full_name || '',
        username: data.username || '',
        country: data.country || '',
        state: data.state || '',
        city: data.city || '',
        avatar_url: data.avatar_url || '',
        bio: data.bio || '',
        relationship_status: data.relationship_status || '',
        relationship_with: data.relationship_with || ''
      })
    })
  }, [user])

  const wc = form.bio.trim()? form.bio.trim().split(/\s+/).length : 0
  const showPartnerField = ['relacionamento', 'noivo', 'casado', 'uniao_estavel', 'aberto'].includes(form.relationship_status)

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f ||!user) return
    if (!f.type.startsWith('image/')) { toast.error('Selecione uma imagem'); return }
    if (f.size > 10 * 1024 * 1024) { toast.error('Imagem grande'); return }
    const reader = new FileReader()
    reader.onload = (ev) => { setTempImage(ev.target?.result as string); setShowCropper(true) }
    reader.readAsDataURL(f)
  }

  async function uploadToCloudinary(blob: Blob): Promise<string> {
    const formData = new FormData()
    formData.append('file', blob)
    formData.append('upload_preset', UPLOAD_PRESET)
    formData.append('folder', 'mishh/avatars')
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body: formData,
    })
    const data = await res.json()
    if (!data.secure_url) throw new Error(data.error?.message || 'Erro no Cloudinary')
    return data.secure_url
  }

  async function onCropApply(blob: Blob) {
    if (!user) return
    setLoading(true)
    try {
      toast.loading('Enviando pro Cloudinary...')
      const url = await uploadToCloudinary(blob)
      setForm((prev: any) => ({...prev, avatar_url: url }))
      setShowCropper(false)
      setTempImage(null)
      toast.dismiss()
      toast.success('Foto atualizada no Cloudinary!')
    } catch (err: any) {
      toast.dismiss()
      toast.error(err.message || 'Erro ao enviar')
    } finally {
      setLoading(false)
    }
  }

  async function save() {
    if (!user) return; setLoading(true)
    const { error } = await supabase.from('profiles').update({
      full_name: form.full_name,
      username: form.username.toLowerCase(),
      country: form.country,
      state: form.state,
      city: form.city,
      avatar_url: form.avatar_url,
      bio: form.bio.trim().slice(0, 1000),
      relationship_status: form.relationship_status || null,
      relationship_with: showPartnerField? form.relationship_with.trim().toLowerCase() || null : null
    }).eq('id', user.id)
    setLoading(false); if (error) return toast.error(error.message)
    toast.success('Dados atualizados!'); router.push('/profile')
  }

  return (
    <AppShell>
      <div className="w-full max-w-xl mx-auto">
        <h2 className="text-lg font-light mb-6 text-white">Editar dados</h2>
        <div className="flex flex-col items-center mb-8 py-6">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-[#262626] overflow-hidden mb-4">
            {form.avatar_url? <img src={form.avatar_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[#a8a8a8] text-3xl">?</div>}
          </div>
          <label className="cursor-pointer">
            <input type="file" accept="image/*" onChange={onFile} className="hidden" />
            <span className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-black text-xs rounded-full"><ImagePlus className="w-4 h-4" /> Alterar foto</span>
          </label>
        </div>
        <div className="space-y-4">
          <div><label className="block text-xs text-[#a8a8a8] mb-1">Nome</label><input value={form.full_name} onChange={e=>setForm({...form, full_name:e.target.value})} placeholder="Seu nome" className="w-full p-3 rounded-full text-sm bg-[#262626] text-white" /></div>
          <div><label className="block text-xs text-[#a8a8a8] mb-1">Username</label><input value={form.username} onChange={e=>setForm({...form, username:e.target.value})} placeholder="usuario" className="w-full p-3 rounded-full text-sm bg-[#262626] text-white" /></div>

          {/* RELATIONSHIP STATUS - NOVO */}
          <div>
            <label className="block text-xs text-[#a8a8a8] mb-1">Status de relacionamento</label>
            <select
              value={form.relationship_status}
              onChange={e=>setForm({...form, relationship_status:e.target.value})}
              className="w-full p-3 rounded-full text-sm bg-[#262626] text-white border-none outline-none appearance-none"
            >
              {RELATIONSHIP_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value} className="bg-[#262626]">{opt.label}</option>
              ))}
            </select>
          </div>

          {showPartnerField && (
            <div className="animate-in fade-in">
              <label className="block text-xs text-[#a8a8a8] mb-1">Com quem? (username)</label>
              <div className="flex items-center gap-2">
                <span className="text-[#a8a8a8] text-sm">@</span>
                <input
                  value={form.relationship_with}
                  onChange={e=>setForm({...form, relationship_with:e.target.value})}
                  placeholder="username da pessoa"
                  className="w-full p-3 rounded-full text-sm bg-[#262626] text-white"
                />
              </div>
            </div>
          )}

          <div><label className="block text-xs text-[#a8a8a8] mb-1">País</label><input value={form.country} onChange={e=>setForm({...form, country:e.target.value})} placeholder="Brasil" className="w-full p-3 rounded-full text-sm bg-[#262626] text-white" /></div>
          <div><label className="block text-xs text-[#a8a8a8] mb-1">Estado</label><input value={form.state} onChange={e=>setForm({...form, state:e.target.value})} placeholder="SP" className="w-full p-3 rounded-full text-sm bg-[#262626] text-white" /></div>
          <div><label className="block text-xs text-[#a8a8a8] mb-1">Cidade</label><input value={form.city} onChange={e=>setForm({...form, city:e.target.value})} placeholder="São Paulo" className="w-full p-3 rounded-full text-sm bg-[#262626] text-white" /></div>
          <div><label className="block text-xs text-[#a8a8a8] mb-1">Bio</label><textarea value={form.bio} onChange={e=>setForm({...form, bio:e.target.value})} placeholder="Conte sobre você" maxLength={1000} rows={3} className="w-full p-3 rounded-2xl text-sm bg-[#262626] text-white resize-none" /><div className={`text-xs text-right mt-1 ${wc > 150? 'text-red-500' : 'text-[#a8a8a8]'}`}>{wc}/150 palavras</div></div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => router.push('/profile')} className="flex-1 bg-[#262626] text-white py-3 rounded-full text-sm">Cancelar</button>
            <button onClick={save} disabled={loading || wc > 150} className="flex-1 bg-white text-black py-3 rounded-full text-sm">{loading? 'Salvando...' : 'Salvar'}</button>
          </div>
        </div>
      </div>
      {showCropper && tempImage && <AvatarCropper imageUrl={tempImage} onApply={onCropApply} onCancel={() => { setShowCropper(false); setTempImage(null) }} loading={loading} />}
    </AppShell>
  )
}