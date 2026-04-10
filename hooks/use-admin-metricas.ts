'use client'

import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'

export interface CrescimentoMensal {
  mes: string
  novas: number
}

export interface AdminMetricas {
  clinicas_total: number
  clinicas_por_plano: Record<string, number>
  mrr_estimado: number
  usuarios_total: number
  pacientes_total: number
  novas_clinicas_mes: number
  clinicas_ativas: number
  clinicas_inativas: number
  crescimento_mensal: CrescimentoMensal[]
}

export function useAdminMetricas() {
  return useQuery<AdminMetricas>({
    queryKey: ['admin', 'metricas'],
    queryFn: () => apiFetch('/api/v1/admin/metricas'),
    staleTime: 5 * 60 * 1000, // 5min (igual ao cache Redis)
  })
}
