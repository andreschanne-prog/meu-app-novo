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
    <nav className="fixed bottom-0 left-0 right-0 z-40 w-full bg-[#0a0a0a]/95 backdrop-blur-md border-t border-[#262626] pb-[env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-5 h- sm:h- items-center max-w- mx-auto px-2">
        {items.map(it => {
          const Icon = it.icon
          const active = pathname === it.href
          if (it.isCenter) {
            return (
              <button key={it.href} onClick={() => router.push(it.href)}
                aria-label="Postar"
                className="flex flex-col items-center justify-center -mt-3">
                <div className="bg-white text-black rounded-full p-2 pulse-orange shadow-[0_2px_10px_rgba(255,255,255,0.2)]">
                  <Icon className="w-6 h-6" />
                </div>
                <span className="text- mt-1 text-white font-light tracking-wide">{it.label}</span>
              </button>
            )
          }
          return (
            <button key={it.href} onClick={() => router.push(it.href)}
              aria-label={it.label}
              className={classNames(
                'flex flex-col items-center justify-center gap-0.5 active:scale-95 transition',
                active? 'text-white' : 'text-[#a8a8a8]'
              )}>
              <Icon className={classNames('w-6 h-6', active && 'text-white')} />
              <span className="text- leading-tight font-light">{it.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}