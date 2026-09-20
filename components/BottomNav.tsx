'use client'
import { useRouter, usePathname } from 'next/navigation'
import { Home, Search, PlusSquare, Crown, User } from 'lucide-react'
import { classNames } from '@/lib/helpers'

const items = [
  { href: '/feed', label: 'Feed', icon: Home },
  { href: '/search', label: 'Pesquisar', icon: Search },
  { href: '/post/new', label: 'Postar', icon: PlusSquare, isCenter: true },
  { href: '/ranking', label: 'Ranking', icon: Crown },
  { href: '/profile', label: 'Perfil', icon: User },
]

export default function BottomNav() {
  const router = useRouter()
  const pathname = usePathname()
  return (
    <nav className="fixed bottom-3 left-1/2 -translate-x-1/2 z-40 bg-[#0a0a0a]/90 backdrop-blur-md rounded-2xl pb-safe shadow-[0_4px_24px_rgba(0,0,0,0.5)]" style={{ width: '60%', maxWidth: '600px' }}>
      <div className="grid grid-cols-5 h-[30px] sm:h-[30px] px-1 sm:px-2 items-center">
        {items.map(it => {
          const Icon = it.icon
          const active = pathname === it.href
          if (it.isCenter) {
            return (
              <button key={it.href} onClick={() => router.push(it.href)}
                aria-label="Postar"
                className="flex flex-col items-center justify-center -mt-2 sm:-mt-2.5">
                <div className="bg-white text-black rounded-full p-1.5 sm:p-2 pulse-orange">
                  <Icon className="w-7 h-7 sm:w-7 sm:h-7" />
                </div>
                <span className="text-[9px] sm:text-[11px] mt-0.5 text-white font-light tracking-wide">{it.label}</span>
              </button>
            )
          }
          return (
            <button key={it.href} onClick={() => router.push(it.href)}
              aria-label={it.label}
              className={classNames(
                'flex flex-col items-center justify-center gap-0.5 active:scale-95 transition',
                active ? 'text-white' : 'text-[#a8a8a8]'
              )}>
              <Icon className={classNames('w-7 h-7 sm:w-7 sm:h-7', active && 'text-white')} />
              <span className="text-[9px] sm:text-[11px] leading-tight font-light">{it.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
