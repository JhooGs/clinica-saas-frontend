'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import type {
  Pacote,
  PacoteListResponse,
  PacoteTipoInput,
  PlanoAtendimentoPayload,
  TipoAtendimento,
  TipoAtendimentoListResponse,
  VigenciasListResponse,
} from '@/lib/types/planos'

// ── Tipos de Atendimento ──────────────────────────────────────────────────────

export function useTiposAtendimento() {
  return useQuery<TipoAtendimentoListResponse>({
    queryKey: ['planos', 'tipos-atendimento'],
    queryFn: () => apiFetch<TipoAtendimentoListResponse>('/api/v1/planos/tipos-atendimento'),
    staleTime: 2 * 60 * 1000,
  })
}

export function useCriarTipoAtendimento() {
  const queryClient = useQueryClient()
  return useMutation<TipoAtendimento, Error, { nome: string; valor_padrao?: string | null }>({
    mutationFn: ({ nome, valor_padrao }) =>
      apiFetch<TipoAtendimento>('/api/v1/planos/tipos-atendimento', {
        method: 'POST',
        body: JSON.stringify({ nome, valor_padrao }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planos', 'tipos-atendimento'] })
    },
  })
}

export function useAtualizarTipoAtendimento() {
  const queryClient = useQueryClient()
  return useMutation<TipoAtendimento, Error, { id: string; payload: { nome?: string | null; valor_padrao?: string | null; conta_como_atendimento?: boolean } }>({
    mutationFn: ({ id, payload }) =>
      apiFetch<TipoAtendimento>(`/api/v1/planos/tipos-atendimento/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planos', 'tipos-atendimento'] })
    },
  })
}

export function useAtualizarContaComoAtendimentoLote() {
  const queryClient = useQueryClient()
  return useMutation<void, Error, { id: string; conta_como_atendimento: boolean }[]>({
    mutationFn: (items) =>
      apiFetch<void>('/api/v1/planos/tipos-atendimento/conta-como-atendimento-lote', {
        method: 'PATCH',
        body: JSON.stringify({ items }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planos', 'tipos-atendimento'] })
    },
  })
}

export function useExcluirTipoAtendimento() {
  const queryClient = useQueryClient()
  return useMutation<void, Error, string>({
    mutationFn: (id) =>
      apiFetch<void>(`/api/v1/planos/tipos-atendimento/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planos', 'tipos-atendimento'] })
    },
  })
}

// ── Pacotes ───────────────────────────────────────────────────────────────────

export function usePacotes() {
  return useQuery<PacoteListResponse>({
    queryKey: ['planos', 'pacotes'],
    queryFn: () => apiFetch<PacoteListResponse>('/api/v1/planos/pacotes'),
    staleTime: 2 * 60 * 1000,
  })
}

export interface PacoteCreatePayload {
  nome: string
  descricao?: string | null
  valor?: string | null
  tipos?: PacoteTipoInput[]
  ativo?: boolean
}

export interface PacoteUpdatePayload {
  nome?: string | null
  descricao?: string | null
  valor?: string | null
  tipos?: PacoteTipoInput[] | null
  ativo?: boolean | null
}

export function useCriarPacote() {
  const queryClient = useQueryClient()
  return useMutation<Pacote, Error, PacoteCreatePayload>({
    mutationFn: (payload) =>
      apiFetch<Pacote>('/api/v1/planos/pacotes', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planos', 'pacotes'] })
    },
  })
}

export function useAtualizarPacote() {
  const queryClient = useQueryClient()
  return useMutation<Pacote, Error, { id: string; payload: PacoteUpdatePayload }>({
    mutationFn: ({ id, payload }) =>
      apiFetch<Pacote>(`/api/v1/planos/pacotes/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planos', 'pacotes'] })
    },
  })
}

export function useExcluirPacote() {
  const queryClient = useQueryClient()
  return useMutation<void, Error, string>({
    mutationFn: (id) =>
      apiFetch<void>(`/api/v1/planos/pacotes/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planos', 'pacotes'] })
    },
  })
}

// ── PlanoAtendimento por paciente ─────────────────────────────────────────────

export function usePlanoAtendimento(pacienteId: string | undefined) {
  return useQuery<PlanoAtendimentoPayload>({
    queryKey: ['pacientes', pacienteId, 'plano'],
    queryFn: () => apiFetch<PlanoAtendimentoPayload>(`/api/v1/pacientes/${pacienteId}/plano`),
    enabled: !!pacienteId,
    staleTime: 60 * 1000,
  })
}

export function useSalvarPlanoAtendimento(pacienteId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation<PlanoAtendimentoPayload, Error, PlanoAtendimentoPayload>({
    mutationFn: (payload) =>
      apiFetch<PlanoAtendimentoPayload>(`/api/v1/pacientes/${pacienteId}/plano`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    onSuccess: (savedPlan) => {
      // Atualiza o cache do paciente com o novo plano_atendimento para que, ao
      // navegar de volta, o useState em PacienteDetalheContent inicialize com o
      // valor correto em vez de usar o snapshot antigo do cache.
      queryClient.setQueryData(
        ['pacientes', pacienteId],
        (old: Record<string, unknown> | undefined) =>
          old ? { ...old, plano_atendimento: savedPlan } : old,
      )
      queryClient.invalidateQueries({ queryKey: ['pacientes', pacienteId, 'plano'] })
      queryClient.invalidateQueries({ queryKey: ['planos', 'vigencias-gratuito'] })
    },
  })
}

// ── Vigências do Pacote Gratuito ──────────────────────────────────────────────

export function useVigenciasGratuito() {
  return useQuery<VigenciasListResponse>({
    queryKey: ['planos', 'vigencias-gratuito'],
    queryFn: () => apiFetch<VigenciasListResponse>('/api/v1/planos/vigencias-gratuito'),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  })
}
