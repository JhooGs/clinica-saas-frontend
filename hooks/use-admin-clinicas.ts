'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'

export interface ClinicaListItem {
  id: string
  nome: string
  plano: string
  ativo: boolean
  criado_em: string
  usuarios_count: number
  pacientes_count: number
  quota_pacientes: number | null
  quota_usuarios: number | null
  uso_pacientes_pct: number | null
  uso_usuarios_pct: number | null
}

export interface ClinicaListResponse {
  items: ClinicaListItem[]
  total: number
  page: number
  per_page: number
}

export interface ClinicaDetalhe extends ClinicaListItem {
  cnpj: string | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  ultimo_acesso: string | null
  usuarios: {
    id: string
    nome: string
    email: string
    role: string
    ativo: boolean
    criado_em: string
  }[]
}

interface ClinicasParams {
  plano?: string
  ativo?: boolean
  busca?: string
  page?: number
  per_page?: number
}

export function useAdminClinicas(params: ClinicasParams = {}) {
  const { plano, ativo, busca, page = 1, per_page = 20 } = params
  const searchParams = new URLSearchParams()
  if (plano) searchParams.set('plano', plano)
  if (ativo !== undefined) searchParams.set('ativo', String(ativo))
  if (busca) searchParams.set('busca', busca)
  searchParams.set('page', String(page))
  searchParams.set('per_page', String(per_page))

  return useQuery<ClinicaListResponse>({
    queryKey: ['admin', 'clinicas', params],
    queryFn: () => apiFetch(`/api/v1/admin/clinicas?${searchParams.toString()}`),
  })
}

export function useAdminClinicaDetalhe(clinicaId: string) {
  return useQuery<ClinicaDetalhe>({
    queryKey: ['admin', 'clinica', clinicaId],
    queryFn: () => apiFetch(`/api/v1/admin/clinicas/${clinicaId}`),
    enabled: !!clinicaId,
  })
}

export function useAdminAtualizarClinica() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ clinicaId, body }: { clinicaId: string; body: { plano?: string; ativo?: boolean } }) =>
      apiFetch(`/api/v1/admin/clinicas/${clinicaId}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin'] })
    },
  })
}
