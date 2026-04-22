'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // ChunkLoadError ocorre quando o browser tenta carregar um chunk que não existe mais
    // (após um novo deploy). Recarregar força o download da versão nova.
    if (error?.name === 'ChunkLoadError' || error?.message?.includes('Loading chunk')) {
      window.location.reload()
    }
  }, [error])

  const isChunkError =
    error?.name === 'ChunkLoadError' || error?.message?.includes('Loading chunk')

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="text-center max-w-md">
        <h2 className="text-lg font-semibold text-gray-800 mb-2">
          {isChunkError ? 'Nova versão disponível' : 'Algo deu errado'}
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          {isChunkError
            ? 'O sistema foi atualizado. Recarregando automaticamente...'
            : 'Ocorreu um erro inesperado.'}
        </p>
        {!isChunkError && (
          <button
            onClick={() => reset()}
            className="px-4 py-2 bg-[#04c2fb] text-white text-sm font-medium rounded-md hover:bg-[#03a8d9] transition-colors"
          >
            Tentar novamente
          </button>
        )}
      </div>
    </div>
  )
}
