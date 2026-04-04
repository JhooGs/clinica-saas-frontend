import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import type { Agendamento, AgendamentoListResponse, AgendamentoCreatePayload, AgendamentoUpdatePayload } from '@/types'

export interface AgendaFilter {
  data_inicio: string   // YYYY-MM-DD — obrigatório
  data_fim: string      // YYYY-MM-DD — obrigatório
  paciente_id?: string
  status?: string
  sem_registro?: boolean
}

export function useAgendamentos(filtros: AgendaFilter) {
  const params = new URLSearchParams({
    data_inicio: filtros.data_inicio,
    data_fim: filtros.data_fim,
  })
  if (filtros.paciente_id) params.set('paciente_id', filtros.paciente_id)
  if (filtros.status) params.set('status', filtros.status)
  if (filtros.sem_registro) params.set('sem_registro', 'true')

  return useQuery<AgendamentoListResponse>({
    queryKey: ['agenda', filtros],
    queryFn: () => apiFetch<AgendamentoListResponse>(`/api/v1/agendamentos?${params.toString()}`),
  })
}

export function useAgendamentosHoje() {
  const hoje = new Date().toISOString().slice(0, 10)
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
