'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      supabase.auth.getSession().then(({ data }) => {
        if (data.session) router.replace('/feed')
        else router.replace('/login')
        setLoading(false)
      })
    }, 3000)
    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="text-white text-4xl font-light tracking-[0.3em]">MISH<span className="opacity-60">H</span></div>
    </div>
  )
}
