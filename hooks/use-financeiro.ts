import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import type { Financeiro, FinanceiroListResponse, FormaPagamento } from '@/types'

export interface TransacoesFilter {
  tipo?: 'receita' | 'despesa'
  status?: 'pendente' | 'pago' | 'atrasado' | 'cancelado'
  paciente_id?: string
  mes?: string // YYYY-MM
  page?: number
  page_size?: number
}

export interface FinanceiroCreatePayload {
  paciente_id?: string
  registro_id?: string
  tipo: 'receita' | 'despesa'
  descricao: string
  valor: number
  data_referencia: string  // YYYY-MM obrigatório
  data_vencimento?: string // YYYY-MM-DD
  forma_pagamento?: FormaPagamento
}

export interface FinanceiroUpdatePayload {
  status?: 'pendente' | 'pago' | 'atrasado' | 'cancelado'
  valor?: number
  descricao?: string
  data_referencia?: string // YYYY-MM
  data_pagamento?: string  // YYYY-MM-DD
  forma_pagamento?: FormaPagamento
}

export function useTransacoes(filtros?: TransacoesFilter) {
  const params = new URLSearchParams()
  if (filtros?.tipo) params.set('tipo', filtros.tipo)
  if (filtros?.status) params.set('status', filtros.status)
  if (filtros?.paciente_id) params.set('paciente_id', filtros.paciente_id)
  if (filtros?.mes) params.set('mes', filtros.mes)
  if (filtros?.page) params.set('page', String(filtros.page))
  if (filtros?.page_size) params.set('page_size', String(filtros.page_size))

  const query = params.toString() ? `?${params.toString()}` : ''

  return useQuery<FinanceiroListResponse>({
    queryKey: ['financeiro', filtros],
    queryFn: () => apiFetch<FinanceiroListResponse>(`/api/v1/financeiro${query}`),
  })
}

export function useCriarTransacao() {
  const queryClient = useQueryClient()
  return useMutation<Financeiro, Error, FinanceiroCreatePayload>({
    mutationFn: (payload) =>
      apiFetch<Financeiro>('/api/v1/financeiro', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financeiro'] })
    },
  })
}

export function useAtualizarTransacao() {
  const queryClient = useQueryClient()
  return useMutation<Financeiro, Error, { id: string; payload: FinanceiroUpdatePayload }>({
    mutationFn: ({ id, payload }) =>
      apiFetch<Financeiro>(`/api/v1/financeiro/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financeiro'] })
    },
  })
}

export function useExcluirTransacao() {
  const queryClient = useQueryClient()
  return useMutation<void, Error, string>({
    mutationFn: (id) =>
      apiFetch(`/api/v1/financeiro/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financeiro'] })
    },
  })
}
