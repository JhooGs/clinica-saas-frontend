import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'

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
