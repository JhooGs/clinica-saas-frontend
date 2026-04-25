'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import type {
  WhatsAppTemplate,
  WhatsAppTemplateCreatePayload,
  WhatsAppTemplateListResponse,
  WhatsAppTemplateUpdatePayload,
} from '@/types'

const QUERY_KEY = ['whatsapp-templates'] as const

export function useWhatsAppTemplates() {
  return useQuery<WhatsAppTemplateListResponse>({
    queryKey: QUERY_KEY,
    queryFn: () => apiFetch<WhatsAppTemplateListResponse>('/api/v1/whatsapp-templates'),
  })
}

export function useCriarWhatsAppTemplate() {
  const queryClient = useQueryClient()
  return useMutation<WhatsAppTemplate, Error, WhatsAppTemplateCreatePayload>({
    mutationFn: (payload) =>
      apiFetch<WhatsAppTemplate>('/api/v1/whatsapp-templates', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      toast.success('Template criado', { description: 'Seu template de WhatsApp foi salvo.' })
    },
    onError: () => {
      toast.error('Erro ao criar template', { description: 'Tente novamente.' })
    },
  })
}

export function useAtualizarWhatsAppTemplate() {
  const queryClient = useQueryClient()
  return useMutation<WhatsAppTemplate, Error, { id: string; payload: WhatsAppTemplateUpdatePayload }>({
    mutationFn: ({ id, payload }) =>
      apiFetch<WhatsAppTemplate>(`/api/v1/whatsapp-templates/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      toast.success('Template atualizado', { description: 'As alterações foram salvas.' })
    },
    onError: () => {
      toast.error('Erro ao atualizar template', { description: 'Tente novamente.' })
    },
  })
}

export function useDeletarWhatsAppTemplate() {
  const queryClient = useQueryClient()
  return useMutation<void, Error, string>({
    mutationFn: (id) =>
      apiFetch<void>(`/api/v1/whatsapp-templates/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      toast.success('Template excluído')
    },
    onError: () => {
      toast.error('Erro ao excluir template')
    },
  })
}
