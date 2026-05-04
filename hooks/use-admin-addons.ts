'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'

export interface AddonCatalogoItem {
  slug: string
  descricao: string
  preco_padrao: number
  recorrente: boolean
  campo_limite: string | null
  incremento_por_unidade: number
}

export interface ClinicaAddon {
  id: string
  clinica_id: string
  addon_slug: string
  descricao: string
  quantidade: number
  preco_unitario: number
  recorrente: boolean
  ativo: boolean
  observacao: string | null
}

export function useAdminAddonsCatalogo() {
  return useQuery<AddonCatalogoItem[]>({
    queryKey: ['admin', 'addons', 'catalogo'],
    queryFn: () => apiFetch('/api/v1/admin/addons/catalogo'),
    staleTime: Infinity,
  })
}

export function useAdminAddonsClinica(clinicaId: string) {
  return useQuery<ClinicaAddon[]>({
    queryKey: ['admin', 'addons', clinicaId],
    queryFn: () => apiFetch(`/api/v1/admin/clinicas/${clinicaId}/addons`),
    enabled: !!clinicaId,
  })
}

interface AddonCreateBody {
  addon_slug: string
  quantidade?: number
  preco_unitario?: number | null
  observacao?: string | null
}

export function useAdminCriarAddon(clinicaId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: AddonCreateBody) =>
      apiFetch<ClinicaAddon>(`/api/v1/admin/clinicas/${clinicaId}/addons`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'addons', clinicaId] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'metricas'] })
    },
  })
}

interface AddonPatchBody {
  quantidade?: number
  preco_unitario?: number
  ativo?: boolean
  observacao?: string | null
}

export function useAdminAtualizarAddon(clinicaId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ addonId, body }: { addonId: string; body: AddonPatchBody }) =>
      apiFetch<ClinicaAddon>(`/api/v1/admin/clinicas/${clinicaId}/addons/${addonId}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'addons', clinicaId] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'metricas'] })
    },
  })
}

export function useAdminRemoverAddon(clinicaId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (addonId: string) =>
      apiFetch(`/api/v1/admin/clinicas/${clinicaId}/addons/${addonId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'addons', clinicaId] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'metricas'] })
    },
  })
}
