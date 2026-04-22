'use client'

import { useEffect } from 'react'

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    navigator.serviceWorker.register('/sw.js').catch(() => {
      // falha silenciosa
    })

    // Quando um novo SW assume o controle (após novo deploy com skipWaiting: true),
    // recarrega a página para garantir que o HTML e os chunks sejam da versão nova.
    // Sem isso, o HTML cacheado referencia chunks antigos → ChunkLoadError.
    let refreshing = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true
        window.location.reload()
      }
    })
  }, [])

  return null
}
