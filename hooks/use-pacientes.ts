import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import type { Paciente } from '@/types'

export interface PacientesFilter {
  busca?: string
  ativo?: boolean
  page?: number
  page_size?: number
}

export interface PacienteListResponse {
  items: Paciente[]
  total: number
}

export interface PacienteCreatePayload {
  nome: string
  cpf?: string
  data_nascimento?: string // YYYY-MM-DD
  telefone?: string
  email?: string
  endereco?: Record<string, string>
  dados_extras?: Record<string, unknown>
}

export interface PacienteUpdatePayload {
  nome?: string
  cpf?: string
  data_nascimento?: string // YYYY-MM-DD
  telefone?: string
  email?: string
  endereco?: Record<string, string>
  dados_extras?: Record<string, unknown>
  ativo?: boolean
}

export function usePacientes(filtros?: PacientesFilter) {
  const params = new URLSearchParams()
  if (filtros?.busca) params.set('busca', filtros.busca)
  if (filtros?.ativo !== undefined) params.set('ativo', String(filtros.ativo))
  if (filtros?.page) params.set('page', String(filtros.page))
  if (filtros?.page_size) params.set('page_size', String(filtros.page_size))
  const query = params.toString() ? `?${params.toString()}` : ''

  return useQuery<PacienteListResponse>({
    queryKey: ['pacientes', filtros],
    queryFn: () => apiFetch<PacienteListResponse>(`/api/v1/pacientes${query}`),
  })
}

export function usePaciente(id: string) {
  return useQuery<Paciente>({
    queryKey: ['pacientes', id],
    queryFn: () => apiFetch<Paciente>(`/api/v1/pacientes/${id}`),
    enabled: !!id,
  })
}

export function useCriarPaciente() {
  const queryClient = useQueryClient()
  return useMutation<Paciente, Error, PacienteCreatePayload>({
    mutationFn: (payload) =>
      apiFetch<Paciente>('/api/v1/pacientes', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pacientes'] })
    },
  })
}

export function useAtualizarPaciente() {
  const queryClient = useQueryClient()
  return useMutation<Paciente, Error, { id: string; payload: PacienteUpdatePayload }>({
    mutationFn: ({ id, payload }) =>
      apiFetch<Paciente>(`/api/v1/pacientes/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['pacientes'] })
      queryClient.invalidateQueries({ queryKey: ['pacientes', id] })
    },
  })
}
