'use client'

import { useEffect, useRef, useCallback } from 'react'
import { toast } from 'sonner'
import type { FormularioSchema } from '@/types'

export type TemplateDraftData = {
  nome: string
  categoria: string
  descricao: string
  schema: FormularioSchema
  savedAt: string
}

function chave(templateId: string) {
  return `clinitra:template-draft:${templateId}`
}

export function useTemplateDraft(templateId: string) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const toastMostradoRef = useRef(false)

  const carregarRascunho = useCallback((): TemplateDraftData | null => {
    try {
      const raw = localStorage.getItem(chave(templateId))
      if (!raw) return null
      const parsed = JSON.parse(raw) as TemplateDraftData
      if (!parsed?.nome || !Array.isArray(parsed?.schema?.secoes)) return null
      return parsed
    } catch {
      return null
    }
  }, [templateId])

  const salvarRascunho = useCallback(
    (dados: Omit<TemplateDraftData, 'savedAt'>) => {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        const draft: TemplateDraftData = { ...dados, savedAt: new Date().toISOString() }
        localStorage.setItem(chave(templateId), JSON.stringify(draft))
        if (!toastMostradoRef.current) {
          toastMostradoRef.current = true
          toast.info('Rascunho salvo', {
            id: `template-draft-${templateId}`,
            description: 'As alterações são salvas localmente até você confirmar.',
            duration: 2500,
          })
        }
      }, 1000)
    },
    [templateId],
  )

  const salvarAgora = useCallback(
    (dados: Omit<TemplateDraftData, 'savedAt'>) => {
      if (timerRef.current) clearTimeout(timerRef.current)
      const draft: TemplateDraftData = { ...dados, savedAt: new Date().toISOString() }
      localStorage.setItem(chave(templateId), JSON.stringify(draft))
    },
    [templateId],
  )

  const descartarRascunho = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    localStorage.removeItem(chave(templateId))
    toastMostradoRef.current = false
  }, [templateId])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return { carregarRascunho, salvarRascunho, salvarAgora, descartarRascunho }
}
