import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'

export interface AuditLogEntry {
  id: string
  actor_email: string
  acao: string
  entidade: string
  entidade_id: string
  ip: string | null
  criado_em: string
}

export interface AuditLogResponse {
  items: AuditLogEntry[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface FiltrosAuditLog {
  entidade?: string
  acao?: string
  data_inicio?: string
  data_fim?: string
  page?: number
  page_size?: number
}

export const LABELS_ACAO: Record<string, string> = {
  PACIENTE_CRIADO:       'Paciente criado',
  PACIENTE_ATUALIZADO:   'Dados atualizados',
  PACIENTE_DESATIVADO:   'Paciente desativado',
  PACIENTE_REATIVADO:    'Paciente reativado',
  PACIENTE_ANONIMIZADO:  'Dados anonimizados (LGPD)',
  REGISTRO_CRIADO:       'Registro criado',
  REGISTRO_VISUALIZADO:  'Registro acessado',
  REGISTRO_ATUALIZADO:   'Registro atualizado',
}

export const LABELS_ENTIDADE: Record<string, string> = {
  paciente: 'Paciente',
  registro: 'Registro',
}

export function useAuditLog(filtros: FiltrosAuditLog = {}) {
  const params = new URLSearchParams()
  if (filtros.entidade)    params.set('entidade',    filtros.entidade)
  if (filtros.acao)        params.set('acao',        filtros.acao)
  if (filtros.data_inicio) params.set('data_inicio', filtros.data_inicio)
  if (filtros.data_fim)    params.set('data_fim',    filtros.data_fim)
  params.set('page',      String(filtros.page      ?? 1))
  params.set('page_size', String(filtros.page_size ?? 50))

  return useQuery<AuditLogResponse>({
    queryKey: ['audit-log', filtros],
    queryFn: () => apiFetch<AuditLogResponse>(`/api/v1/audit-log?${params}`),
    staleTime: 30_000,
  })
}
