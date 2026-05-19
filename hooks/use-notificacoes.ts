'use client'

import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { createClient } from '@/lib/supabase'

export type NotificacaoUrgencia = 'alta' | 'media' | 'baixa' | 'informacao'

export type Notificacao = {
  id: string
  tipo: string
  referencia_id: string
  urgencia: NotificacaoUrgencia
  payload: {
    paciente_nome?: string
    vigencia_fim?: string
    dias_restantes?: number
    [key: string]: unknown
  }
  lida_em: string | null
  dispensada_em: string | null
  expires_at: string | null
  criado_em: string
  atualizado_em: string
}

type NotificacoesListResponse = {
  items: Notificacao[]
  total: number
}

const QK = ['notificacoes'] as const

function useHasSession() {
  const [hasSession, setHasSession] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getSession().then(({ data }) => {
      setHasSession(!!data.session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setHasSession(!!session)
    })

    return () => subscription.unsubscribe()
  }, [])

  return hasSession
}

export function useNotificacoes() {
  const hasSession = useHasSession()

  return useQuery<NotificacoesListResponse>({
    queryKey: QK,
    queryFn: () => apiFetch<NotificacoesListResponse>('/api/v1/notificacoes'),
    enabled: hasSession,
    refetchInterval: hasSession ? 60_000 : false,
    staleTime: 30_000,
    retry: false,
  })
}

export function useMarcarLida() {
  const qc = useQueryClient()
  return useMutation<void, Error, string>({
    mutationFn: (id) => apiFetch(`/api/v1/notificacoes/${id}/ler`, { method: 'PATCH' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  })
}

export function useMarcarTodasLidas() {
  const qc = useQueryClient()
  return useMutation<void, Error, void>({
    mutationFn: () => apiFetch('/api/v1/notificacoes/ler-todas', { method: 'PATCH' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  })
}

type DispensarCtx = { anterior?: NotificacoesListResponse }

export function useDispensarNotificacao() {
  const qc = useQueryClient()
  return useMutation<void, Error, string, DispensarCtx>({
    mutationFn: (id) => apiFetch(`/api/v1/notificacoes/${id}/dispensar`, { method: 'PATCH' }),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: QK })
      const anterior = qc.getQueryData<NotificacoesListResponse>(QK)
      // Optimistic: remove imediatamente da lista
      qc.setQueryData<NotificacoesListResponse>(QK, (old) =>
        old ? { ...old, items: old.items.filter((n) => n.id !== id), total: old.total - 1 } : old,
      )
      return { anterior }
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.anterior) qc.setQueryData(QK, ctx.anterior)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: QK }),
  })
}
