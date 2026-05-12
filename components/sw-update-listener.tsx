'use client'

import { useEffect } from 'react'
import { toast } from 'sonner'

/**
 * Escuta o evento `controllerchange` do service worker.
 * Quando um novo SW assume o controle (graças a skipWaiting + clientsClaim),
 * exibe um toast persistente pedindo ao usuário que recarregue a página.
 *
 * Por que é necessário: mesmo com o novo SW ativo, o bundle JS da aba já carregado
 * é da versão anterior. O reload garante que os chunks JS batem com o SW novo.
 */
export function SWUpdateListener() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    function handleControllerChange() {
      toast.info('Nova versão disponível', {
        description: 'Recarregue para aplicar a atualização.',
        duration: Infinity,
        id: 'sw-update',
        action: {
          label: 'Recarregar',
          onClick: () => window.location.reload(),
        },
      })
    }

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange)
    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange)
    }
  }, [])

  return null
}
