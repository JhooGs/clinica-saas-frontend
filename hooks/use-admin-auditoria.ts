'use client'

import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'

export interface AuditLogItem {
  id: string
  actor_email: string
  acao: string
  entidade: string
  entidade_id: string | null
  payload_antes: Record<string, unknown> | null
  payload_depois: Record<string, unknown> | null
  ip: string | null
  criado_em: string
}

export interface AuditLogResponse {
  items: AuditLogItem[]
  total: number
  page: number
  per_page: number
}

interface Params {
  acao?: string
  entidade?: string
  page?: number
  per_page?: number
}

export function useAdminAuditoria(params: Params = {}) {
  const { acao, entidade, page = 1, per_page = 50 } = params

  const query = new URLSearchParams()
  if (acao)    query.set('acao', acao)
  if (entidade) query.set('entidade', entidade)
  query.set('page', String(page))
  query.set('per_page', String(per_page))

  return useQuery<AuditLogResponse>({
    queryKey: ['admin', 'auditoria', acao, entidade, page],
    queryFn: () => apiFetch(`/api/v1/admin/auditoria?${query}`),
  })
}
