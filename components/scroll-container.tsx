'use client'

import { useRef } from 'react'
import { useScrollRestoration } from '@/hooks/use-scroll-restoration'

export function ScrollContainer({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useScrollRestoration(ref)

  return (
    <main ref={ref} className="flex-1 overflow-y-auto p-3 sm:p-6">
      {children}
    </main>
  )
}
