'use client'

/**
 * Selo dourado de conta verificada (igual ao das redes sociais).
 * Mostra apenas quando `verificado === true`.
 *
 * Uso:
 *   <VerifiedBadge size={32} />           -> só o selo circular
 *   <VerifiedNameLabel name="Fulano" ... /> -> nome + texto "Verificado"
 */

type BadgeProps = {
  /** Tamanho em px (largura/altura do círculo). Padrão: 32 */
  size?: number
  /** Classe extra opcional */
  className?: string
}

export function VerifiedBadge({ size = 32, className = '' }: BadgeProps) {
  // Proporções do ícone de check ~ 56% do tamanho do círculo
  const iconSize = Math.round(size * 0.56)
  return (
    <div
      className={`bg-gradient-to-br from-yellow-300 to-yellow-600 rounded-full flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.6)] ${className}`}
      style={{ width: size, height: size }}
      aria-label="Conta verificada"
      role="img"
    >
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 24 24"
        fill="white"
        aria-hidden="true"
      >
        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
      </svg>
    </div>
  )
}

/**
 * Wrapper "absolute bottom-0 right-0" para colocar o selo em cima do
 * container do avatar. Use dentro de um `div` com `relative`.
 */
export function VerifiedBadgeOverlay({ size = 32 }: { size?: number }) {
  return (
    <div className="absolute bottom-0 right-0">
      <VerifiedBadge size={size} />
    </div>
  )
}

/**
 * Nome do usuário + selo "Verificado" inline (igual à imagem).
 *
 * Props:
 *   - name: texto principal (ex: "@fulano" ou nome completo)
 *   - verificado: se true, mostra o texto dourado
 *   - nameClassName: classes extras para o nome
 *   - textClassName: classes extras para o texto "Verificado"
 */
export function VerifiedNameLabel({
  name,
  verificado,
  nameClassName = '',
  textClassName = '',
}: {
  name: React.ReactNode
  verificado?: boolean
  nameClassName?: string
  textClassName?: string
}) {
  if (!verificado) {
    return <span className={nameClassName}>{name}</span>
  }
  return (
    <span className={`inline-flex items-center gap-1.5 ${nameClassName}`}>
      <span>{name}</span>
      <span
        className={`text-[#D4AF37] text-sm font-light ${textClassName}`}
      >
        Verificado
      </span>
    </span>
  )
}