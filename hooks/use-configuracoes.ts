import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { uploadLogo, removerLogo } from '@/lib/logo-storage'

export type ConfiguracaoGeral = {
  nome_clinica: string
  especialidade: string | null
  telefone: string | null
  email_contato: string | null
  cep: string | null
  logradouro: string | null
  numero: string | null
  complemento: string | null
  bairro: string | null
  cidade: string | null
  estado: string | null
  nome_responsavel: string
  email_responsavel: string
  logo_url: string | null
  plano: string
}

export type ConfiguracaoGeralUpdate = Partial<Omit<ConfiguracaoGeral, 'email_responsavel'>>

const QUERY_KEY = ['clinica', 'config']

export function useConfiguracoes() {
  return useQuery<ConfiguracaoGeral>({
    queryKey: QUERY_KEY,
    queryFn: () => apiFetch<ConfiguracaoGeral>('/api/v1/clinicas/config'),
  })
}

export function useSalvarConfiguracoes() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: ConfiguracaoGeralUpdate) =>
      apiFetch<ConfiguracaoGeral>('/api/v1/clinicas/config', {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: (updated) => {
      qc.setQueryData(QUERY_KEY, updated)
    },
  })
}

export function useUploadLogo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ file, logoAtual }: { file: File; logoAtual: string | null }) => {
      // Remove a logo anterior do storage antes de subir a nova
      if (logoAtual) {
        await removerLogo(logoAtual).catch(() => {})
      }
      const url = await uploadLogo(file)
      return apiFetch<ConfiguracaoGeral>('/api/v1/clinicas/config', {
        method: 'PATCH',
        body: JSON.stringify({ logo_url: url }),
      })
    },
    onSuccess: (updated) => {
      qc.setQueryData(QUERY_KEY, updated)
    },
  })
}

export function useRemoverLogo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (logoAtual: string) => {
      await removerLogo(logoAtual).catch(() => {})
      return apiFetch<ConfiguracaoGeral>('/api/v1/clinicas/config', {
        method: 'PATCH',
        body: JSON.stringify({ logo_url: null }),
      })
    },
    onSuccess: (updated) => {
      qc.setQueryData(QUERY_KEY, updated)
    },
  })
}
