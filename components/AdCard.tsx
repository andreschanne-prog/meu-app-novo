'use client'
import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

export type Ad = {
  id: string
  title: string
  image_url: string
  target_url: string | null
  client_name?: string
  target_type?: 'city' | 'country'
  city?: string | null
  state?: string | null
  cities?: { city: string; state: string }[]
  ends_at?: string
  starts_at?: string
}

export default function AdCard({ ad, disguised = false }: { ad: Ad; disguised?: boolean }) {
  const { user } = useAuth()
  const viewedRef = useRef(false)

  useEffect(() => {
    if (!ad || viewedRef.current) return
    viewedRef.current = true
    supabase.from('ad_views').insert({ ad_id: ad.id, user_id: user?.id || null }).then(()=>{})
  }, [ad?.id, user?.id])

  async function onClick() {
    supabase.from('ad_clicks').insert({ ad_id: ad.id, user_id: user?.id || null }).then(()=>{})
    if (ad.target_url) {
      const url = ad.target_url.startsWith('http')? ad.target_url : `https://${ad.target_url}`
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }

  const citiesList = ad.cities?.length? ad.cities : (ad.city? [{ city: ad.city, state: ad.state || '' }] : [])
  const isBrasilTodo = ad.target_type === 'country'
  const isExpired = ad.ends_at? new Date(ad.ends_at) < new Date() : false

  return (
    <div className="flex justify-center w-full mb-4">
      <div className="bg-[#0a0a0a] overflow-hidden fade-in rounded-2xl w-full max-w-[470px] border border-[#262626] hover:border-[#333] transition">
        <div className="bg-[#262626] text-[#a8a8a8] text-[10px] uppercase tracking-widest px-3.5 py-1.5 font-light flex justify-between items-center">
          <span>{disguised? 'Anúncio' : 'Patrocinado'} {ad.client_name? `· ${ad.client_name}` : ''}</span>
          {isExpired && <span className="text-red-400">Expirado</span>}
        </div>
        <button onClick={onClick} className="block w-full text-left group">
          <div className="relative overflow-hidden">
            <img src={ad.image_url} alt={ad.title} className="w-full aspect-square object-cover group-hover:scale-[1.02] transition duration-500" />
            <div className="absolute bottom-2 left-2 flex gap-1 flex-wrap">
              {isBrasilTodo? (
                <span className="text-[10px] bg-blue-600 text-white px-2 py-1 rounded-full">🇧🇷 Brasil todo</span>
              ) : (
                citiesList.slice(0, 3).map((c, i) => (
                  <span key={i} className="text-[10px] bg-black/70 backdrop-blur text-white px-2 py-1 rounded-full">📍 {c.city}/{c.state}</span>
                ))
              )}
            </div>
          </div>
          <div className="p-3.5">
            <div className="text-sm font-light text-white leading-snug">{ad.title}</div>
            {ad.target_url && <div className="text-[11px] text-[#a8a8a8] mt-1 truncate">{ad.target_url}</div>}
          </div>
        </button>
      </div>
    </div>
  )
}

export function AdSenseBlock({ className = "" }: { className?: string }) {
  // CORRIGIDO: já usa seu PUB ID como fallback pra passar na verificação
  const client = process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT || "ca-pub-9640110316096383"
  const slot = process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_SLOT || "0000000000"
  const adRef = useRef<HTMLModElement>(null)
  const pushedRef = useRef(false)

  useEffect(() => {
    if (pushedRef.current) return
    if (!adRef.current) return
    try {
      // @ts-ignore
      (window.adsbygoogle = window.adsbygoogle || []).push({})
      pushedRef.current = true
    } catch {}
  }, [])

  return (
    <div className={`flex justify-center w-full mb-4 ${className}`}>
      <div className="bg-[#0a0a0a] overflow-hidden rounded-2xl w-full max-w-[470px] min-h-[300px] border border-[#262626]">
        <div className="bg-[#262626] text-[#a8a8a8] text-[10px] uppercase tracking-widest px-3.5 py-1.5">
          Anúncio · Google
        </div>
        <div className="flex items-center justify-center bg-black">
          <ins
            ref={adRef}
            className="adsbygoogle"
            style={{ display: 'block', width: '100%', minHeight: '250px' }}
            data-ad-client={client}
            data-ad-slot={slot}
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
        </div>
      </div>
    </div>
  )
}