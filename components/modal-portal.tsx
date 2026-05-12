'use client'

/**
 * ModalPortal — renderiza filhos em um <div> isolado anexado ao document.body.
 *
 * Por quê: o layout do dashboard usa PageTransition com `transform` e `filter`
 * na animação. Qualquer propriedade transform/filter em um ancestral cria um
 * novo containing block para `position: fixed`, fazendo modais aparecerem no
 * topo do container ao invés do centro do viewport.
 *
 * Solução: criar um <div> dedicado por instância (não renderizar direto no body)
 * e removê-lo explicitamente no cleanup do useEffect. Isso previne o bug de
 * "overlay fantasma" onde o div fixed inset-0 persiste no DOM após desmontagem,
 * bloqueando todos os cliques da página.
 */

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

export function ModalPortal({ children }: { children: React.ReactNode }) {
  // Lazy initializer: cria o <div> durante o render (apenas no cliente).
  // O useEffect o apenda ao body e o remove no cleanup — sem setState dentro do effect.
  const [container] = useState<HTMLDivElement | null>(() => {
    if (typeof document === 'undefined') return null
    const el = document.createElement('div')
    el.setAttribute('data-modal-portal', '')
    return el
  })

  useEffect(() => {
    if (!container) return
    document.body.appendChild(container)
    return () => {
      // Remoção explícita garante que nenhum overlay fique "fantasma" no DOM
      // mesmo em erros de React, navegação rápida ou race conditions.
      if (document.body.contains(container)) {
        document.body.removeChild(container)
      }
    }
  }, [container])

  if (!container) return null
  return createPortal(children, container)
}
