import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import type { Registro, RegistroGrupoCreatePayload } from '@/types'

export interface RegistrosFilter {
  paciente_id?: string
  presenca?: boolean
  data_inicio?: string // YYYY-MM-DD
  data_fim?: string    // YYYY-MM-DD
  page?: number
  page_size?: number
}

export interface RegistroListResponse {
  items: Registro[]
  total: number
}

export interface RegistroCreatePayload {
  paciente_id: string
  agendamento_id?: string  // UUID do agendamento de origem — garante vínculo 1:1
  titulo?: string
  tipo_atendimento?: string
  presenca?: boolean
  valor_atendimento?: number
  data_atendimento?: string // YYYY-MM-DD
  conteudo_json?: Record<string, unknown> | null
  material?: string
  link_youtube?: string
  observacao?: string
  arquivos?: { nome: string; url: string; tipo: string; tamanho: number }[]
}

export interface RegistroUpdatePayload {
  titulo?: string
  tipo_atendimento?: string
  presenca?: boolean
  conteudo_json?: Record<string, unknown> | null
  material?: string
  link_youtube?: string
  observacao?: string
  arquivos?: { nome: string; url: string; tipo: string; tamanho: number }[]
  data_atendimento?: string
  numero_atendimento?: number  // quando presente, ancora o recálculo no backend
}

export function useRegistros(filtros?: RegistrosFilter) {
  const params = new URLSearchParams()
  if (filtros?.paciente_id) params.set('paciente_id', filtros.paciente_id)
  if (filtros?.presenca !== undefined) params.set('presenca', String(filtros.presenca))
  if (filtros?.data_inicio) params.set('data_inicio', filtros.data_inicio)
  if (filtros?.data_fim) params.set('data_fim', filtros.data_fim)
  if (filtros?.page) params.set('page', String(filtros.page))
  if (filtros?.page_size) params.set('page_size', String(filtros.page_size))
  const query = params.toString() ? `?${params.toString()}` : ''

  return useQuery<RegistroListResponse>({
    queryKey: ['registros', filtros],
    queryFn: () => apiFetch<RegistroListResponse>(`/api/v1/registros${query}`),
  })
}

export function useRegistro(id: string) {
  return useQuery<Registro>({
    queryKey: ['registros', id],
    queryFn: () => apiFetch<Registro>(`/api/v1/registros/${id}`),
    enabled: !!id,
    retry: false,  // não retenta em 404 — é sinal de novo registro
  })
}

export function useCriarRegistro() {
  const queryClient = useQueryClient()
  return useMutation<Registro, Error, RegistroCreatePayload>({
    mutationFn: (payload) =>
      apiFetch<Registro>('/api/v1/registros', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registros'] })
      // Invalida financeiro pois pode ter gerado transação automática
      queryClient.invalidateQueries({ queryKey: ['financeiro'] })
      // Invalida agendamentos para remover da seção "Aguardando registro"
      queryClient.invalidateQueries({ queryKey: ['agenda'] })
    },
  })
}

export function useCriarRegistroGrupo() {
  const queryClient = useQueryClient()
  return useMutation<Registro[], Error, RegistroGrupoCreatePayload>({
    mutationFn: (payload) =>
      apiFetch<Registro[]>('/api/v1/registros/grupo', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registros'] })
      queryClient.invalidateQueries({ queryKey: ['financeiro'] })
      queryClient.invalidateQueries({ queryKey: ['agenda'] })
    },
  })
}

export function useAtualizarRegistro() {
  const queryClient = useQueryClient()
  return useMutation<Registro, Error, { id: string; payload: RegistroUpdatePayload }>({
    mutationFn: ({ id, payload }) =>
      apiFetch<Registro>(`/api/v1/registros/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['registros'] })
      queryClient.invalidateQueries({ queryKey: ['registros', id] })
    },
  })
}

export function useExcluirRegistro() {
  const queryClient = useQueryClient()
  return useMutation<void, Error, string>({
    mutationFn: (id) =>
      apiFetch<void>(`/api/v1/registros/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registros'] })
      queryClient.invalidateQueries({ queryKey: ['agenda'] })
      queryClient.invalidateQueries({ queryKey: ['financeiro'] })
    },
  })
}
