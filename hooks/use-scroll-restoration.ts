'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

const STORAGE_KEY_PREFIX = 'scroll_'

export function useScrollRestoration(containerRef: React.RefObject<HTMLElement | null>) {
  const pathname = usePathname()
  const prevPathname = useRef<string>(pathname)

  // Ao mudar de rota: restaura a posição salva para a nova rota
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    prevPathname.current = pathname

    const saved = sessionStorage.getItem(STORAGE_KEY_PREFIX + pathname)
    if (saved) {
      const scrollTop = parseInt(saved, 10)
      // Double rAF garante que o conteúdo foi renderizado antes de scrollar
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          container.scrollTop = scrollTop
        })
      })
    } else {
      container.scrollTop = 0
    }
  }, [pathname, containerRef])

  // Salva posição durante scroll (debounced 100ms)
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let timer: ReturnType<typeof setTimeout>

    const handleScroll = () => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        sessionStorage.setItem(
          STORAGE_KEY_PREFIX + pathname,
          String(container.scrollTop)
        )
      }, 100)
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      clearTimeout(timer)
      container.removeEventListener('scroll', handleScroll)
    }
  }, [pathname, containerRef])
}
