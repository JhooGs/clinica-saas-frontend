'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState, startTransition } from 'react'
import { Sun, Moon } from 'lucide-react'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { startTransition(() => setMounted(true)) }, [])
  if (!mounted) return null

  const isDark = theme === 'dark'

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="relative flex items-center gap-2 select-none"
      title={isDark ? 'Modo claro' : 'Modo escuro'}
    >
      {/* Label esquerda */}
      <Sun className={`h-3.5 w-3.5 transition-colors duration-300 ${
        !isDark ? 'text-amber-500' : 'text-muted-foreground/40'
      }`} />

      {/* Track neumórfico */}
      <div
        className={`
          relative w-12 h-6 rounded-full transition-all duration-300
          ${isDark
            ? 'bg-[#1a1025] shadow-[inset_2px_2px_5px_rgba(0,0,0,0.5),inset_-1px_-1px_3px_rgba(255,255,255,0.05)]'
            : 'bg-[#e8e0ec] shadow-[inset_2px_2px_5px_rgba(0,0,0,0.12),inset_-2px_-2px_5px_rgba(255,255,255,0.8)]'
          }
        `}
      >
        {/* Thumb */}
        <div
          className={`
            absolute top-0.5 h-5 w-5 rounded-full transition-all duration-300
            flex items-center justify-center
            ${isDark
              ? 'translate-x-6 bg-[#441a3f] shadow-[2px_2px_6px_rgba(0,0,0,0.5),-1px_-1px_3px_rgba(255,255,255,0.05)]'
              : 'translate-x-0.5 bg-white shadow-[2px_2px_6px_rgba(0,0,0,0.15),-1px_-1px_3px_rgba(255,255,255,0.9)]'
            }
          `}
        />
      </div>

      {/* Label direita */}
      <Moon className={`h-3.5 w-3.5 transition-colors duration-300 ${
        isDark ? 'text-violet-400' : 'text-muted-foreground/40'
      }`} />
    </button>
  )
}