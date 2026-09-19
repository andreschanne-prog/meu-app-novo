'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import toast from 'react-hot-toast'

export type ReportReason = 'spam' | 'nudez' | 'violencia' | 'fake' | 'outro'

const REASONS: { value: ReportReason; label: string; emoji: string }[] = [
  { value: 'spam', label: 'Spam', emoji: '🚫' },
  { value: 'nudez', label: 'Conteúdo Sexual/Nudez', emoji: '🔞' },
  { value: 'violencia', label: 'Violência/Discurso de Ódio', emoji: '⚠️' },
  { value: 'fake', label: 'Perfil Falso', emoji: '🎭' },
  { value: 'outro', label: 'Outro', emoji: '💬' },
]

type Props = {
  open: boolean
  onClose: () => void
  reportedUserId: string
  reportedPostId?: string | null
  target?: 'post' | 'profile'
}

export default function ReportModal({ open, onClose, reportedUserId, reportedPostId = null, target = 'post' }: Props) {
  const { user } = useAuth()
  const [reason, setReason] = useState<ReportReason | ''>('')
  const [details, setDetails] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Travar scroll do body enquanto o modal está aberto
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [open])

  // Reset state ao fechar
  useEffect(() => {
    if (!open) {
      setReason('')
      setDetails('')
      setError(null)
      setSubmitting(false)
    }
  }, [open])

  if (!open) return null

  async function submit() {
    if (!user) { toast.error('Faça login para denunciar.'); return }
    if (!reason) { setError('Selecione um motivo.'); return }
    if (user.id === reportedUserId) { toast.error('Você não pode denunciar a si mesmo.'); return }
    setSubmitting(true)
    setError(null)

    const payload: Record<string, unknown> = {
      reporter_id: user.id,
      reported_user_id: reportedUserId,
      reason,
      details: details.trim().slice(0, 500) || '',
      status: 'pending',
    }
    if (reportedPostId) payload.reported_post_id = reportedPostId

    const { error: err } = await supabase.from('reports').insert(payload)
    setSubmitting(false)
    if (err) {
      console.error('[ReportModal] erro ao enviar denúncia:', err)
      setError(err.message)
      toast.error(`Erro: ${err.message}`)
      return
    }
    toast.success('Denúncia enviada. Vamos analisar.')
    onClose()
  }

  const targetLabel = target === 'profile' ? 'este perfil' : 'esta foto'

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-md p-0 sm:p-4 fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-title"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full sm:max-w-md bg-[#0a0a0a] rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.7)]">
        {/* Header MISHH dark */}
        <div className="px-5 py-4 text-white bg-[#0a0a0a]">
          <div className="flex items-center justify-between">
            <h2 id="report-title" className="text-lg font-light tracking-wide">Denunciar {targetLabel}</h2>
            <button
              onClick={onClose}
              aria-label="Fechar"
              className="w-9 h-9 rounded-full bg-[#262626] hover:bg-[#404040] flex items-center justify-center transition text-white"
            >
              ✕
            </button>
          </div>
          <p className="text-sm text-[#a8a8a8] mt-1 font-light">Por que você está denunciando?</p>
        </div>

        {/* Corpo */}
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="space-y-2">
            {REASONS.map((r) => (
              <label
                key={r.value}
                className={`flex items-center gap-3 p-3 rounded-full cursor-pointer transition ${
                  reason === r.value
                    ? 'bg-[#262626]'
                    : 'bg-[#0a0a0a] hover:bg-[#1a1a1a]'
                }`}
              >
                <input
                  type="radio"
                  name="reason"
                  value={r.value}
                  checked={reason === r.value}
                  onChange={() => { setReason(r.value); setError(null) }}
                  className="accent-white w-4 h-4"
                />
                <span className="text-xl" aria-hidden>{r.emoji}</span>
                <span className="text-sm font-light text-white">{r.label}</span>
              </label>
            ))}
          </div>

          <div>
            <label className="block text-sm font-light text-white mb-1.5">
              Detalhes <span className="text-[#a8a8a8] font-light">(opcional)</span>
            </label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Conte um pouco mais para ajudar nossa equipe..."
              className="w-full p-3 rounded-2xl text-sm resize-none bg-[#262626] text-white placeholder:text-[#a8a8a8]"
            />
            <div className="text-xs text-[#a8a8a8] text-right mt-1 font-light">{details.length}/500</div>
          </div>

          {error && (
            <div className="text-sm text-white bg-[#262626] rounded-full px-4 py-2 font-light">
              {error}
            </div>
          )}

          <div className="text-xs text-[#a8a8a8] bg-[#0a0a0a] rounded-2xl p-3 font-light">
            Sua denúncia é anônima. O usuário denunciado não verá quem denunciou.
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex-1 bg-[#262626] text-white font-light py-3 rounded-full hover:bg-[#404040] transition disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={submitting || !reason}
            className="flex-1 bg-white text-black font-light py-3 rounded-full hover:opacity-90 transition disabled:opacity-50"
          >
            {submitting ? 'Enviando...' : 'Enviar Denúncia'}
          </button>
        </div>
      </div>
    </div>
  )
}