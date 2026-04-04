'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import type {
  Pacote,
  PacoteListResponse,
  PlanoAtendimentoPayload,
  TipoSessao,
  TipoSessaoListResponse,
  VigenciasListResponse,
} from '@/lib/types/planos'

// ── Tipos de Sessão ───────────────────────────────────────────────────────────

export function useTiposSessao() {
  return useQuery<TipoSessaoListResponse>({
    queryKey: ['planos', 'tipos-sessao'],
    queryFn: () => apiFetch<TipoSessaoListResponse>('/api/v1/planos/tipos-sessao'),
    staleTime: 2 * 60 * 1000,
  })
}

export function useCriarTipoSessao() {
  const queryClient = useQueryClient()
  return useMutation<TipoSessao, Error, { nome: string; valor_padrao?: string | null }>({
    mutationFn: (payload) =>
      apiFetch<TipoSessao>('/api/v1/planos/tipos-sessao', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planos', 'tipos-sessao'] })
    },
  })
}

export function useAtualizarTipoSessao() {
  const queryClient = useQueryClient()
  return useMutation<TipoSessao, Error, { id: string; payload: { nome?: string | null; valor_padrao?: string | null } }>({
    mutationFn: ({ id, payload }) =>
      apiFetch<TipoSessao>(`/api/v1/planos/tipos-sessao/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planos', 'tipos-sessao'] })
    },
  })
}

export function useExcluirTipoSessao() {
  const queryClient = useQueryClient()
  return useMutation<void, Error, string>({
    mutationFn: (id) =>
      apiFetch<void>(`/api/v1/planos/tipos-sessao/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planos', 'tipos-sessao'] })
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
  sessoes?: { tipoSessaoId: string }[]
  ativo?: boolean
}

export interface PacoteUpdatePayload {
  nome?: string | null
  descricao?: string | null
  valor?: string | null
  sessoes?: { tipoSessaoId: string }[] | null
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
    onSuccess: () => {
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
