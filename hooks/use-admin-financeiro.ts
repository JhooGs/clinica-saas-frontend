'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import type {
  ClinitraAssinatura,
  ClinitraFinanceiro,
  ClinitraFinanceiroListResponse,
} from '@/types'

export interface LancamentosFilter {
  tipo?: 'receita' | 'despesa'
  status?: 'pendente' | 'pago' | 'atrasado' | 'cancelado'
  categoria?: string
  mes?: string  // YYYY-MM
  ano?: number
  page?: number
  page_size?: number
}

export interface CriarLancamentoPayload {
  tipo: 'receita' | 'despesa'
  categoria: string
  descricao: string
  valor: number
  data_referencia: string  // YYYY-MM
  data_vencimento?: string // YYYY-MM-DD
}

export interface AtualizarLancamentoPayload {
  status?: 'pendente' | 'pago' | 'atrasado' | 'cancelado'
  valor?: number
  descricao?: string
  data_referencia?: string
  data_vencimento?: string
  data_pagamento?: string
}

export interface CriarAssinaturaPayload {
  nome: string
  descricao?: string
  tipo: 'receita' | 'despesa'
  categoria: string
  valor: number
  dia_cobranca: number
  inicio: string  // YYYY-MM-DD
  fim?: string    // YYYY-MM-DD
}

export interface AtualizarAssinaturaPayload {
  nome?: string
  descricao?: string
  tipo?: 'receita' | 'despesa'
  categoria?: string
  valor?: number
  dia_cobranca?: number
  inicio?: string
  fim?: string
  ativo?: boolean
}

// ── Lançamentos ──────────────────────────────────────────────────────────────

export function useAdminLancamentos(filtros?: LancamentosFilter) {
  const params = new URLSearchParams()
  if (filtros?.tipo) params.set('tipo', filtros.tipo)
  if (filtros?.status) params.set('status', filtros.status)
  if (filtros?.categoria) params.set('categoria', filtros.categoria)
  if (filtros?.mes) params.set('mes', filtros.mes)
  if (filtros?.ano) params.set('ano', String(filtros.ano))
  if (filtros?.page) params.set('page', String(filtros.page))
  if (filtros?.page_size) params.set('page_size', String(filtros.page_size))

  const qs = params.toString()
  return useQuery<ClinitraFinanceiroListResponse>({
    queryKey: ['admin', 'financeiro', 'lancamentos', filtros],
    queryFn: () => apiFetch(`/api/v1/admin/financeiro${qs ? `?${qs}` : ''}`),
  })
}

export function useAdminCriarLancamento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CriarLancamentoPayload) =>
      apiFetch<ClinitraFinanceiro>('/api/v1/admin/financeiro', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'financeiro'] })
    },
  })
}

export function useAdminAtualizarLancamento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AtualizarLancamentoPayload }) =>
      apiFetch<ClinitraFinanceiro>(`/api/v1/admin/financeiro/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'financeiro'] })
    },
  })
}

export function useAdminExcluirLancamento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/v1/admin/financeiro/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'financeiro'] })
    },
  })
}

// ── Assinaturas ──────────────────────────────────────────────────────────────

export function useAdminAssinaturas(ativo?: boolean) {
  const params = new URLSearchParams()
  if (ativo !== undefined) params.set('ativo', String(ativo))
  const qs = params.toString()

  return useQuery<ClinitraAssinatura[]>({
    queryKey: ['admin', 'financeiro', 'assinaturas', { ativo }],
    queryFn: () => apiFetch(`/api/v1/admin/financeiro/assinaturas${qs ? `?${qs}` : ''}`),
  })
}

export function useAdminCriarAssinatura() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CriarAssinaturaPayload) =>
      apiFetch<ClinitraAssinatura>('/api/v1/admin/financeiro/assinaturas', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'financeiro', 'assinaturas'] })
    },
  })
}

export function useAdminAtualizarAssinatura() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AtualizarAssinaturaPayload }) =>
      apiFetch<ClinitraAssinatura>(`/api/v1/admin/financeiro/assinaturas/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'financeiro', 'assinaturas'] })
    },
  })
}

export function useAdminExcluirAssinatura() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/v1/admin/financeiro/assinaturas/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'financeiro', 'assinaturas'] })
    },
  })
}

export function useAdminSincronizarAssinatura() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ criados: number }>(`/api/v1/admin/financeiro/assinaturas/${id}/sincronizar`, {
        method: 'POST',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'financeiro'] })
    },
  })
}
