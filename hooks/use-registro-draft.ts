'use client'

import { useEffect, useRef, useCallback } from 'react'
import { toast } from 'sonner'
import type { UploadedFile } from '@/components/editor/rich-editor'

type DraftData = {
  form: {
    data: string
    tipoAtendimento: string
    numeroAtendimento: string
    presenca: boolean
    material: string
    links: string[]
    notasSessaoJson: Record<string, unknown> | null
  }
  arquivos: UploadedFile[]
  savedAt: string
}

function chave(agendamentoId: string) {
  return `clinitra:registro-draft:${agendamentoId}`
}

// ---------------------------------------------------------------------------
// Hook — autosave de rascunho no localStorage com debounce de 1,5s
// ---------------------------------------------------------------------------

export function useRegistroDraft(agendamentoId: string) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const toastMostradoRef = useRef(false)

  // Carrega o rascunho salvo (chamado uma vez na montagem)
  const carregarRascunho = useCallback((): DraftData | null => {
    try {
      const raw = localStorage.getItem(chave(agendamentoId))
      if (!raw) return null
      const parsed = JSON.parse(raw) as DraftData
      // Descarta drafts de versões antigas sem campos obrigatórios
      if (!parsed?.form || !Array.isArray(parsed.arquivos)) return null
      return parsed
    } catch {
      return null
    }
  }, [agendamentoId])

  // Salva com debounce — evita gravar a cada tecla
  const salvarRascunho = useCallback(
    (form: DraftData['form'], arquivos: UploadedFile[]) => {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        const draft: DraftData = { form, arquivos, savedAt: new Date().toISOString() }
        localStorage.setItem(chave(agendamentoId), JSON.stringify(draft))
        if (!toastMostradoRef.current) {
          toastMostradoRef.current = true
          toast.info('Rascunho salvo', {
            id: `draft-${agendamentoId}`,
            description: 'O registro está sendo salvo automaticamente.',
            duration: 2500,
          })
        }
      }, 1500)
    },
    [agendamentoId],
  )

  // Apaga o rascunho — chamado após salvar com sucesso
  const descartarRascunho = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    localStorage.removeItem(chave(agendamentoId))
    toastMostradoRef.current = false
  }, [agendamentoId])

  // Limpa o timer ao desmontar
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return { carregarRascunho, salvarRascunho, descartarRascunho }
}
