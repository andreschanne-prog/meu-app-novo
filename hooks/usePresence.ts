'use client'

import { useEffect, useRef } from 'react'
import { useAuth } from './useAuth'
import { supabase } from '@/lib/supabase'

/**
 * Hook de presença: mantém o `online` do usuário logado em dia.
 *
 * - Chama `set_online()` (RPC) a cada `intervalMs` (padrão: 60s).
 * - Chama `set_offline()` no logout (onAuthStateChange === 'SIGNED_OUT').
 * - Usa beforeunload / pagehide para marcar offline ao fechar a aba.
 * - Marca online IMEDIATAMENTE no login (e em cada foco de aba).
 *
 * Se o RPC não existir no banco (antes da migration), o hook ignora erros
 * silenciosamente para não quebrar a UX.
 */
export function usePresence({ intervalMs = 60_000 }: { intervalMs?: number } = {}) {
  const { user } = useAuth()
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const beforeUnloadRef = useRef<(() => void) | null>(null)

  async function pingOnline() {
    if (!user) return
    try {
      await supabase.rpc('set_online')
    } catch (err) {
      // silencioso: se a RPC não existir, ignora
      // console.warn('set_online falhou:', err)
    }
  }

  async function pingOffline() {
    // use navigator.sendBeacon como fallback se possível, mas como o supabase
    // precisa de auth headers, isso é complicado. Mantemos via fetch direto.
    if (!user) return
    try {
      // tenta set_offline (melhor esforço, pode falhar em pagehide)
      await supabase.rpc('set_offline')
    } catch {
      // ignora
    }
  }

  useEffect(() => {
    if (!user) {
      // limpa tudo se deslogou
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      if (beforeUnloadRef.current) {
        window.removeEventListener('beforeunload', beforeUnloadRef.current)
        beforeUnloadRef.current = null
      }
      return
    }

    // 1. marca online imediatamente
    pingOnline()

    // 2. chama a cada X segundos
    intervalRef.current = setInterval(() => {
      if (document.visibilityState === 'visible') {
        pingOnline()
      }
    }, intervalMs)

    // 3. ao voltar o foco da aba, atualiza também
    const onVisibility = () => {
      if (document.visibilityState === 'visible') pingOnline()
    }
    document.addEventListener('visibilitychange', onVisibility)

    // 4. ao fechar a aba, marca offline (melhor esforço)
    beforeUnloadRef.current = () => {
      pingOffline()
    }
    window.addEventListener('beforeunload', beforeUnloadRef.current)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      intervalRef.current = null
      document.removeEventListener('visibilitychange', onVisibility)
      if (beforeUnloadRef.current) {
        window.removeEventListener('beforeunload', beforeUnloadRef.current)
        beforeUnloadRef.current = null
      }
      // marca offline ao desmontar (ex: logout programático)
      pingOffline()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, intervalMs])

  // Também escuta mudanças de auth (signOut)
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        pingOffline()
      }
      if (event === 'SIGNED_IN') {
        pingOnline()
      }
    })
    return () => sub.subscription.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}

/**
 * Helper: dado um usuário (com `online` e `last_seen`), retorna `true` se
 * devemos mostrar a bolinha verde.
 *
 * Regra: `online === true` E `last_seen` está há menos de 5 minutos.
 */
export function isUserOnline(profile: { online?: boolean | null; last_seen?: string | null } | null | undefined, windowMs = 5 * 60 * 1000): boolean {
  if (!profile) return false
  if (profile.online !== true) return false
  if (!profile.last_seen) return false
  const last = new Date(profile.last_seen).getTime()
  if (Number.isNaN(last)) return false
  return Date.now() - last < windowMs
}