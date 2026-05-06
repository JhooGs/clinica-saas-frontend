import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import type { FormularioTemplate } from '@/types'

interface TemplateCreatePayload {
  nome: string
  categoria: string
  descricao?: string
  schema: object
  origem?: 'manual' | 'ia'
  arquivo_origem_url?: string
}

interface TemplateUpdatePayload {
  nome?: string
  categoria?: string
  descricao?: string
  schema?: object
  ativo?: boolean
}

export function useTemplates(categoria?: string) {
  const params = categoria ? `?categoria=${encodeURIComponent(categoria)}` : ''
  return useQuery<FormularioTemplate[]>({
    queryKey: ['templates', categoria ?? null],
    queryFn: () => apiFetch<FormularioTemplate[]>(`/api/v1/formularios/templates${params}`),
  })
}

export function useTemplate(id: string) {
  return useQuery<FormularioTemplate>({
    queryKey: ['template', id],
    queryFn: () => apiFetch<FormularioTemplate>(`/api/v1/formularios/templates/${id}`),
    enabled: !!id,
  })
}

export function useCriarTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: TemplateCreatePayload) =>
      apiFetch<FormularioTemplate>('/api/v1/formularios/templates', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['templates'] }),
  })
}

export function useEditarTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }: TemplateUpdatePayload & { id: string }) =>
      apiFetch<FormularioTemplate>(`/api/v1/formularios/templates/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['templates'] })
      qc.invalidateQueries({ queryKey: ['template', vars.id] })
    },
  })
}

export function useDeletarTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/v1/formularios/templates/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['templates'] }),
  })
}

export interface ExtrairTemplateIAResult {
  schema: object
  arquivo_nome: string
}

export function useExtrairTemplateIA() {
  return useMutation({
    mutationFn: async (arquivo: File): Promise<ExtrairTemplateIAResult> => {
      const { createClient } = await import('@/lib/supabase')
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const form = new FormData()
      form.append('arquivo', arquivo)

      const API_URL = process.env.NEXT_PUBLIC_API_URL
      const res = await fetch(`${API_URL}/api/v1/formularios/templates/extrair`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      })

      if (!res.ok) {
        const err = await res.text()
        throw new Error(err)
      }

      return res.json()
    },
  })
}
