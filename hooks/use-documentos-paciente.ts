import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import type { DocumentoPaciente } from '@/types'

interface DocumentoCreatePayload {
  template_id?: string
  nome: string
  arquivo_anexo_url?: string
}

interface DocumentoUpdatePayload {
  nome?: string
  respostas?: Record<string, unknown>
  status?: 'rascunho' | 'finalizado'
  arquivo_anexo_url?: string
}

type TipoFiltro = 'formulario' | 'arquivo' | undefined

function buildParams(statusFiltro?: string, tipo?: TipoFiltro) {
  const p = new URLSearchParams()
  if (statusFiltro) p.set('status', statusFiltro)
  if (tipo) p.set('tipo', tipo)
  const str = p.toString()
  return str ? `?${str}` : ''
}

export function useDocumentosPaciente(pacienteId: string, statusFiltro?: string, tipo?: TipoFiltro) {
  return useQuery<DocumentoPaciente[]>({
    queryKey: ['documentos', pacienteId, statusFiltro ?? null, tipo ?? null],
    queryFn: () =>
      apiFetch<DocumentoPaciente[]>(
        `/api/v1/pacientes/${pacienteId}/documentos${buildParams(statusFiltro, tipo)}`,
      ),
    enabled: !!pacienteId,
  })
}

export function useDocumento(pacienteId: string, docId: string) {
  return useQuery<DocumentoPaciente>({
    queryKey: ['documento', pacienteId, docId],
    queryFn: () => apiFetch<DocumentoPaciente>(`/api/v1/pacientes/${pacienteId}/documentos/${docId}`),
    enabled: !!pacienteId && !!docId,
  })
}

export function useCriarDocumento(pacienteId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: DocumentoCreatePayload) =>
      apiFetch<DocumentoPaciente>(`/api/v1/pacientes/${pacienteId}/documentos`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documentos', pacienteId] }),
  })
}

export function useSalvarRespostas(pacienteId: string, docId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: DocumentoUpdatePayload) =>
      apiFetch<DocumentoPaciente>(`/api/v1/pacientes/${pacienteId}/documentos/${docId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documentos', pacienteId] })
      qc.invalidateQueries({ queryKey: ['documento', pacienteId, docId] })
    },
  })
}

export function useDeletarDocumento(pacienteId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (docId: string) =>
      apiFetch(`/api/v1/pacientes/${pacienteId}/documentos/${docId}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documentos', pacienteId] }),
  })
}

export function useDeletarDocumentoGlobal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ pacienteId, docId }: { pacienteId: string; docId: string }) =>
      apiFetch(`/api/v1/pacientes/${pacienteId}/documentos/${docId}`, { method: 'DELETE' }),
    onSuccess: (_, { pacienteId }) => {
      qc.invalidateQueries({ queryKey: ['documentos', pacienteId] })
      qc.invalidateQueries({ queryKey: ['documentos-clinica'] })
    },
  })
}
