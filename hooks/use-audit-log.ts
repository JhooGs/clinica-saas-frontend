import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'

export interface AuditLogEntry {
  id: string
  actor_email: string
  acao: string
  entidade: string
  entidade_id: string
  descricao: string | null
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
  // Pacientes
  PACIENTE_CRIADO:              'Paciente criado',
  PACIENTE_ATUALIZADO:          'Dados atualizados',
  PACIENTE_DESATIVADO:          'Paciente desativado',
  PACIENTE_REATIVADO:           'Paciente reativado',
  PACIENTE_ANONIMIZADO:         'Dados anonimizados (LGPD)',
  PACIENTE_EXPORTADO:           'Dados exportados (LGPD)',
  PLANO_ATENDIMENTO_ALTERADO:   'Plano de atendimento alterado',
  // Registros
  REGISTRO_CRIADO:              'Registro criado',
  REGISTRO_VISUALIZADO:         'Registro acessado',
  REGISTRO_ATUALIZADO:          'Registro atualizado',
  // Financeiro
  FINANCEIRO_CRIADO:            'Lançamento financeiro',
  FINANCEIRO_ATUALIZADO:        'Financeiro atualizado',
  FINANCEIRO_EXCLUIDO:          'Financeiro excluído',
  // Agenda
  AGENDAMENTO_CRIADO:           'Agendamento criado',
  AGENDAMENTO_RECORRENTE_GERADO:'Agenda recorrente gerada',
  AGENDAMENTO_CANCELADO:        'Agendamento cancelado',
  NOTIFICACAO_ENVIADA:          'Notificação enviada',
  // Usuários
  USUARIO_CONVIDADO:            'Usuário convidado',
  // Planos
  TIPO_ATENDIMENTO_CRIADO:      'Tipo de atendimento criado',
  TIPO_ATENDIMENTO_ATUALIZADO:  'Tipo de atendimento atualizado',
  TIPO_ATENDIMENTO_EXCLUIDO:    'Tipo de atendimento excluído',
  PACOTE_CRIADO:                'Pacote criado',
  PACOTE_ATUALIZADO:            'Pacote atualizado',
  PACOTE_EXCLUIDO:              'Pacote excluído',
}

export const LABELS_ENTIDADE: Record<string, string> = {
  paciente:        'Paciente',
  registro:        'Registro',
  financeiro:      'Financeiro',
  agendamento:     'Agenda',
  usuario:         'Usuário',
  tipo_atendimento:'Tipo de atendimento',
  pacote:          'Pacote',
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
