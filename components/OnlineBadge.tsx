'use client'

/**
 * Bolinha verde de "online" (estilo Instagram).
 * Deve ser posicionada em um container `relative` junto da foto.
 * Aparece em absolute bottom-0 right-0 com borda branca para destacar.
 */

type Props = {
  /** Tamanho em px (largura/altura do círculo). Padrão: 14 */
  size?: number
  /** Cor de fundo. Padrão: verde Instagram (#22c55e). */
  color?: string
  /** Espessura do anel externo (cor do fundo do app). Padrão: 2 */
  ringWidth?: number
  /** Classes extras (ex: ajuste de posicionamento). */
  className?: string
  /** aria-label. */
  label?: string
}

export default function OnlineBadge({
  size = 14,
  color = '#22c55e',
  ringWidth = 2,
  className = '',
  label = 'Online',
}: Props) {
  return (
    <span
      role="img"
      aria-label={label}
      className={`absolute bottom-0 right-0 rounded-full ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        boxShadow: `0 0 0 ${ringWidth}px #000000`,
      }}
    />
  )
}