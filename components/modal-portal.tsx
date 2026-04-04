'use client'

/**
 * ModalPortal — renderiza filhos diretamente no document.body via createPortal.
 *
 * Por quê: o layout do dashboard usa PageTransition com `transform` e `filter`
 * na animação. Qualquer propriedade transform/filter em um ancestral cria um
 * novo containing block para `position: fixed`, fazendo modais aparecerem no
 * topo do container ao invés do centro do viewport.
 *
 * Solução: renderizar o overlay do modal fora da árvore React do dashboard,
 * diretamente no <body>, garantindo que o fixed se posicione relativo ao viewport.
 */

import { useEffect, useState, startTransition } from 'react'
import { createPortal } from 'react-dom'

export function ModalPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    startTransition(() => setMounted(true))
  }, [])

  if (!mounted) return null

  return createPortal(children, document.body)
}
