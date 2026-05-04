'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'

export interface PlanoConfig {
  slug: string
  nome_display: string
  preco: number
  max_pacientes: number | null
  max_usuarios: number | null
  max_tipos_atendimento: number | null
  max_ia_mes: number | null
  ativo: boolean
  ordem: number
}

export function useAdminPlanos() {
  return useQuery<PlanoConfig[]>({
    queryKey: ['admin', 'planos'],
    queryFn: () => apiFetch('/api/v1/admin/planos'),
  })
}

interface PlanoUpdateBody {
  nome_display?: string
  preco?: number
  max_pacientes?: number | null
  max_usuarios?: number | null
  max_tipos_atendimento?: number | null
  max_ia_mes?: number | null
  ativo?: boolean
  ordem?: number
}

export function useAdminAtualizarPlano() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ slug, body }: { slug: string; body: PlanoUpdateBody }) =>
      apiFetch(`/api/v1/admin/planos/${slug}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'planos'] })
    },
  })
}

interface PlanoCreateBody {
  slug: string
  nome_display: string
  preco: number
  max_pacientes?: number | null
  max_usuarios?: number | null
  max_tipos_atendimento?: number | null
  max_ia_mes?: number | null
  ativo?: boolean
  ordem?: number
}

export function useAdminCriarPlano() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: PlanoCreateBody) =>
      apiFetch<PlanoConfig>('/api/v1/admin/planos', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'planos'] })
    },
  })
}
