import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import type { FormularioPaciente } from '@/types'

interface FormularioCreatePayload {
  template_id?: string
  nome: string
  arquivo_anexo_url?: string
}

interface FormularioUpdatePayload {
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

export function useFormulariosPaciente(pacienteId: string, statusFiltro?: string, tipo?: TipoFiltro) {
  return useQuery<FormularioPaciente[]>({
    queryKey: ['formularios', pacienteId, statusFiltro ?? null, tipo ?? null],
    queryFn: () =>
      apiFetch<FormularioPaciente[]>(
        `/api/v1/pacientes/${pacienteId}/formularios${buildParams(statusFiltro, tipo)}`,
      ),
    enabled: !!pacienteId,
  })
}

export function useFormulario(pacienteId: string, formularioId: string) {
  return useQuery<FormularioPaciente>({
    queryKey: ['formulario', pacienteId, formularioId],
    queryFn: () => apiFetch<FormularioPaciente>(`/api/v1/pacientes/${pacienteId}/formularios/${formularioId}`),
    enabled: !!pacienteId && !!formularioId,
  })
}

export function useCriarFormulario(pacienteId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: FormularioCreatePayload) =>
      apiFetch<FormularioPaciente>(`/api/v1/pacientes/${pacienteId}/formularios`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['formularios', pacienteId] }),
  })
}

export function useSalvarRespostas(pacienteId: string, formularioId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: FormularioUpdatePayload) =>
      apiFetch<FormularioPaciente>(`/api/v1/pacientes/${pacienteId}/formularios/${formularioId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['formularios', pacienteId] })
      qc.invalidateQueries({ queryKey: ['formulario', pacienteId, formularioId] })
    },
  })
}

export function useDeletarFormulario(pacienteId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (formularioId: string) =>
      apiFetch(`/api/v1/pacientes/${pacienteId}/formularios/${formularioId}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['formularios', pacienteId] }),
  })
}

export function useDeletarFormularioGlobal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ pacienteId, formularioId }: { pacienteId: string; formularioId: string }) =>
      apiFetch(`/api/v1/pacientes/${pacienteId}/formularios/${formularioId}`, { method: 'DELETE' }),
    onSuccess: (_, { pacienteId }) => {
      qc.invalidateQueries({ queryKey: ['formularios', pacienteId] })
      qc.invalidateQueries({ queryKey: ['formularios-clinica'] })
    },
  })
}
