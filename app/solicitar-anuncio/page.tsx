'use client'
import { useState } from 'react'
import AppShell from '@/components/AppShell'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Upload, MapPin, Globe, Check } from 'lucide-react'

type CityItem = { city: string; state: string }

const CLOUD_NAME = 'nzj72eu0'
const UPLOAD_PRESET = 'mishh_upload'

export default function SolicitarAnuncioPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [step, setStep] = useState<1 | 2>(1)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [cities, setCities] = useState<CityItem[]>([])
  const [cityInput, setCityInput] = useState('')
  const [stateInput, setStateInput] = useState('MT')
  const [targetType, setTargetType] = useState<'city' | 'country'>('city')
  const [period, setPeriod] = useState('30')
  const [loading, setLoading] = useState(false)

  function onImage(e: any) {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > 5 * 1024 * 1024) return toast.error('Foto muito grande, max 5MB')
    setImageFile(f)
    setPreview(URL.createObjectURL(f))
  }

  function addCity() {
    if (!cityInput.trim()) return toast.error('Digite a cidade')
    setCities([...cities, { city: cityInput.trim(), state: stateInput.toUpperCase() }])
    setCityInput('')
  }

  async function uploadToCloudinary(file: File) {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', UPLOAD_PRESET)
    formData.append('folder', 'mishh/ads_requests')
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body: formData
    })
    const data = await res.json()
    if (!data.secure_url) throw new Error(data.error?.message || 'Erro no Cloudinary')
    return data.secure_url
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return toast.error('Faça login')
    if (!imageFile) return toast.error('Coloque a foto')
    if (targetType === 'city' && cities.length === 0) return toast.error('Adicione pelo menos 1 cidade')

    const fd = new FormData(e.currentTarget as HTMLFormElement)
    const client_name = String(fd.get('client_name'))
    const title = String(fd.get('title'))
    const target_url = String(fd.get('target_url'))
    const whatsapp = String(fd.get('whatsapp'))
    const message = String(fd.get('message'))

    if (!client_name ||!title) return toast.error('Preencha nome e título')

    setLoading(true)
    try {
      toast.loading('Enviando imagem pro Cloudinary...')
      const imageUrl = await uploadToCloudinary(imageFile)

      const { error } = await supabase.from('ad_requests').insert({
        user_id: user.id,
        client_name,
        title,
        image_url: imageUrl,
        target_url: target_url || null,
        target_type: targetType,
        cities: targetType === 'city'? cities : [],
        period,
        whatsapp,
        message,
        status: 'pending'
      })
      if (error) throw error
      toast.dismiss()
      toast.success('Pedido enviado pro admin! Aguarde aprovação.')
      router.push('/feed')
    } catch (err: any) {
      toast.dismiss()
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppShell>
      <div className="max-w- mx-auto px-3 pb-20">
        <button onClick={() => step === 1? router.back() : setStep(1)} className="flex items-center gap-2 text-white text-sm font-light py-4">
          <ArrowLeft className="w-4 h-4" /> {step === 1? 'Voltar' : 'Como funciona'}
        </button>

        {step === 1? (
          <div className="space-y-4">
            <h1 className="text- font-light text-white leading-tight">Coloque seu anuncio MISHH</h1>
            <p className="text- text-[#a8a8a8] font-light leading-relaxed">
              Seu anúncio aparece a cada 7 posts no feed de quem mora na cidade que você escolher.
              Ideal pra lojas, candidata a rainha do rodeio, barbearia, artista...
            </p>

            <div className="bg-[#0a0a0a] rounded-2xl border border-[#262626] p-4 space-y-4 mt-6">
              <div className="flex gap-3">
                <div className="h-9 w-9 rounded-full bg-[#ff6a00]/20 flex items-center justify-center"><Upload className="w-4 h-4 text-[#ff6a00]" /></div>
                <div><p className="text-sm text-white font-light">1. Você envia a foto</p><p className="text-xs text-[#777] font-light">Pode ser arte da sua loja, flyer do evento. A foto vai aparecer quadrada.</p></div>
              </div>
              <div className="flex gap-3">
                <div className="h-9 w-9 rounded-full bg-[#ff6a00]/20 flex items-center justify-center"><MapPin className="w-4 h-4 text-[#ff6a00]" /></div>
                <div><p className="text-sm text-white font-light">2. Escolhe onde aparece</p><p className="text-xs text-[#777] font-light">Escolha 1 estado e a cidade que deseja (ex: sinop/MT, cuaba/MT) ou Brasil todo.</p></div>
              </div>
              <div className="flex gap-3">
                <div className="h-9 w-9 rounded-full bg-[#ff6a00]/20 flex items-center justify-center"><Globe className="w-4 h-4 text-[#ff6a00]" /></div>
                <div><p className="text-sm text-white font-light">3. Coloca seu link</p><p className="text-xs text-[#777] font-light">Pode ser WhatsApp, Instagram ou só a foto sem link. Quando clicam, abre seu link.</p></div>
              </div>
              <div className="flex gap-3">
                <div className="h-9 w-9 rounded-full bg-white flex items-center justify-center"><Check className="w-4 h-4 text-black" /></div>
                <div><p className="text-sm text-white font-light">4. A equipe do MISHH aprova</p><p className="text-xs text-[#777] font-light">Você envia e nossa equipe libera em até 24h. Pagamento via PIX no WhatsApp.</p></div>
              </div>
            </div>

            <div className="bg-[#111] rounded-2xl p-4 border border-[#262626] mt-4">
              <p className="text- uppercase tracking-widest text-[#555] mb-2">Preços</p>
              <div className="text-sm text-white font-light space-y-1">
                 <p>1 semana - R$ 150</p>
                <p>1 mês - R$ 300</p>
                <p>3 meses - R$ 800</p>
                <p>6 meses - R$ 1.600</p>
                <p>1 ano - R$ 3.000</p>
              </div>
              <p className="text- text-[#555] mt-3 font-light">Brasil todo = +50% do valor</p>
            </div>

            <button onClick={() => setStep(2)} className="w-full bg-white text-black py-4 rounded-full text-sm font-semibold mt-2">
              Quero solicitar meu anúncio
            </button>
            <p className="text- text-center text-[#555] font-light">Você vai precisar de: foto, link do zap/insta (opicional) e cidades</p>
          </div>
        ) : (
          <form onSubmit={submit} className="bg-[#0a0a0a] p-5 rounded-2xl border border-[#262626] space-y-4">
            <h2 className="text-lg text-white font-light">Dados do anúncio</h2>
            <input name="client_name" required placeholder="Nome da loja / seu nome / candidatura" className="w-full p-3.5 rounded-full bg-[#262626] text-white text-sm outline-none" />
            <input name="title" required placeholder="Título que aparece no feed" className="w-full p-3.5 rounded-full bg-[#262626] text-white text-sm outline-none" />
            <input name="target_url" placeholder="Link ao clicar (WhatsApp ou Instagram) - opcional" className="w-full p-3.5 rounded-full bg-[#262626] text-white text-sm outline-none" />
            <input name="whatsapp" required placeholder="Seu WhatsApp para o admin te chamar" className="w-full p-3.5 rounded-full bg-[#262626] text-white text-sm outline-none" />

            <div>
              <p className="text- uppercase tracking-widest text-[#a8a8a8] mb-2">Foto que vai aparecer no feed</p>
              <label className="flex h-48 items-center justify-center rounded-2xl bg-[#262626] border border-dashed border-[#404040] cursor-pointer overflow-hidden">
                {preview? <img src={preview} className="h-full w-full object-cover" /> : <span className="text-xs text-[#a8a8a8]">📸 Clique e escolha a foto</span>}
                <input type="file" accept="image/*" onChange={onImage} className="hidden" />
              </label>
            </div>

            <div className="flex gap-2">
              <button type="button" onClick={() => setTargetType('city')} className={`flex-1 py-3 rounded-full text-sm ${targetType === 'city'? 'bg-white text-black' : 'bg-[#262626] text-white'}`}>📍 Cidades</button>
              <button type="button" onClick={() => setTargetType('country')} className={`flex-1 py-3 rounded-full text-sm ${targetType === 'country'? 'bg-white text-black' : 'bg-[#262626] text-white'}`}>🇧🇷 Brasil todo</button>
            </div>

            {targetType === 'city' && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input value={cityInput} onChange={e => setCityInput(e.target.value)} placeholder="Cidade" className="flex-1 p-3.5 rounded-full bg-[#262626] text-white text-sm outline-none" />
                  <input value={stateInput} onChange={e => setStateInput(e.target.value)} placeholder="UF" className="w-20 p-3.5 rounded-full bg-[#262626] text-white text-sm outline-none" />
                  <button type="button" onClick={addCity} className="px-5 rounded-full bg-white text-black text-sm">Add</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {cities.map((c, i) => (
                    <span key={i} className="text- bg-[#1a1a1a] border border-[#333] text-white px-3 py-1 rounded-full flex items-center gap-2">📍 {c.city}/{c.state}
                      <button type="button" onClick={() => setCities(cities.filter((_, idx) => idx!== i))} className="text-[#666]">x</button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <select value={period} onChange={e => setPeriod(e.target.value)} className="w-full p-3.5 rounded-full bg-[#262626] text-white text-sm outline-none">
              <option value="7">1 semana - R$ 150</option>
              <option value="30">1 mês - R$ 300</option>
              <option value="90">3 meses - R$ 800</option>
              <option value="180">6 meses - R$ 1.600</option>
              <option value="365">1 ano - R$ 3.000</option>
            </select>

            <textarea name="message" placeholder="Recado pro admin (ex: quero aparecer só em Peixoto e Guarantã, sou candidata a rainha)" className="w-full p-3.5 rounded-2xl bg-[#262626] text-white text-sm outline-none min-h-" />

            <button disabled={loading} className="w-full bg-white text-black py-4 rounded-full text-sm font-semibold disabled:opacity-50">
              {loading? 'Enviando pro Cloudinary...' : 'Enviar solicitação'}
            </button>
          </form>
        )}
      </div>
    </AppShell>
  )
}