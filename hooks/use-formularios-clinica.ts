import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'

export interface FormularioClinica {
  id: string
  paciente_id: string
  paciente_nome: string
  template_id: string | null
  template_nome: string | null
  nome: string
  status: 'rascunho' | 'finalizado'
  criado_em: string
  atualizado_em: string
}

interface Params {
  status?: string
  tipo?: string
  limit?: number
}

function buildParams(params?: Params) {
  const p = new URLSearchParams()
  if (params?.status) p.set('status', params.status)
  if (params?.tipo) p.set('tipo', params.tipo)
  if (params?.limit) p.set('limit', String(params.limit))
  const str = p.toString()
  return str ? `?${str}` : ''
}

export function useFormulariosClinica(params?: Params) {
  return useQuery<FormularioClinica[]>({
    queryKey: ['formularios-clinica', params ?? null],
    queryFn: () => apiFetch<FormularioClinica[]>(`/api/v1/formularios${buildParams(params)}`),
  })
}
