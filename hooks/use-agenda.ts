import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { hojeISO } from '@/lib/timezone'
import type { Agendamento, AgendamentoListResponse, AgendamentoCreatePayload, AgendamentoUpdatePayload } from '@/types'

// ── Tipos para geração de recorrentes ────────────────────────────────────────

export interface SlotRecorrenteInput {
  dia_semana?: number   // 0-6 (semanal/quinzenal)
  dia_mes?: number      // 1-28 (mensal)
  horario: string       // HH:MM
  horario_fim?: string  // HH:MM
}

export interface GerarRecorrentesInput {
  paciente_id: string
  recorrencia: 'semanal' | 'quinzenal' | 'mensal'
  vezes_por_semana?: number | null
  atendimento_em_grupo?: boolean
  tipo_atendimento?: string
  slots: SlotRecorrenteInput[]
  semana_referencia?: string | null  // YYYY-MM-DD
  pacientes_ids?: string[]   // UUIDs dos membros do grupo
}

export interface ConflitoInfo {
  data: string
  horario: string
  horario_fim: string
  motivo: string
}

export interface GerarRecorrentesResult {
  criados: number
  cancelados: number
  conflitos: ConflitoInfo[]
}

export interface AgendaFilter {
  data_inicio: string   // YYYY-MM-DD — obrigatório
  data_fim: string      // YYYY-MM-DD — obrigatório
  paciente_id?: string
  status?: string
  sem_registro?: boolean
  page_size?: number
}

export function useAgendamentos(filtros: AgendaFilter) {
  const params = new URLSearchParams({
    data_inicio: filtros.data_inicio,
    data_fim: filtros.data_fim,
  })
  if (filtros.paciente_id) params.set('paciente_id', filtros.paciente_id)
  if (filtros.status) params.set('status', filtros.status)
  if (filtros.sem_registro) params.set('sem_registro', 'true')
  if (filtros.page_size) params.set('page_size', String(filtros.page_size))

  return useQuery<AgendamentoListResponse>({
    queryKey: ['agenda', filtros],
    queryFn: () => apiFetch<AgendamentoListResponse>(`/api/v1/agendamentos?${params.toString()}`),
  })
}

export function useAgendamentosHoje() {
  const hoje = hojeISO()
  return useAgendamentos({ data_inicio: hoje, data_fim: hoje })
}

export function useAgendamento(id: string) {
  return useQuery<Agendamento>({
    queryKey: ['agenda', id],
    queryFn: () => apiFetch<Agendamento>(`/api/v1/agendamentos/${id}`),
    enabled: !!id,
  })
}

export function useCriarAgendamento() {
  const queryClient = useQueryClient()
  return useMutation<Agendamento, Error, AgendamentoCreatePayload>({
    mutationFn: (payload) =>
      apiFetch<Agendamento>('/api/v1/agendamentos', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agenda'] })
    },
  })
}

export function useAtualizarAgendamento() {
  const queryClient = useQueryClient()
  return useMutation<Agendamento, Error, { id: string; payload: AgendamentoUpdatePayload }>({
    mutationFn: ({ id, payload }) =>
      apiFetch<Agendamento>(`/api/v1/agendamentos/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agenda'] })
    },
  })
}

export function useCancelarAgendamento() {
  const queryClient = useQueryClient()
  return useMutation<void, Error, string>({
    mutationFn: (id) =>
      apiFetch<void>(`/api/v1/agendamentos/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agenda'] })
    },
  })
}

export function useGerarAgendamentosRecorrentes() {
  const queryClient = useQueryClient()
  return useMutation<GerarRecorrentesResult, Error, GerarRecorrentesInput>({
    mutationFn: (payload) =>
      apiFetch<GerarRecorrentesResult>('/api/v1/agendamentos/recorrentes', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agenda'] })
    },
  })
}

export interface CancelarAgendaFuturaResult {
  cancelados: number
}

export function useCancelarAgendaFuturaPaciente() {
  const queryClient = useQueryClient()
  return useMutation<CancelarAgendaFuturaResult, Error, string>({
    mutationFn: (pacienteId) =>
      apiFetch<CancelarAgendaFuturaResult>(`/api/v1/agendamentos/paciente/${pacienteId}/futuros`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agenda'] })
    },
  })
}
