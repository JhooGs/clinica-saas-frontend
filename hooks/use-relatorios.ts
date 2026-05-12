import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'

export interface HistoricoFinanceiroItem {
  mes: string      // "YYYY-MM"
  receita: number
  despesa: number
  liquido: number
}

export interface HistoricoAtendimentosItem {
  mes: string      // "YYYY-MM"
  total: number
  realizados: number
  faltas: number
  cancelados: number
}

export interface VisaoGeral {
  projecao_atendimentos_mes: number
  receita_prevista_mes: number
  melhor_mes: { mes: string; receita: number } | null
  pior_mes: { mes: string; receita: number } | null
  media_mensal_receita: number
  media_mensal_atendimentos: number
}

export interface FiltrosHistorico {
  data_inicio?: string   // YYYY-MM
  data_fim?: string      // YYYY-MM
  paciente_id?: string
}

export function useHistoricoFinanceiro(filtros?: FiltrosHistorico) {
  const params = new URLSearchParams()
  if (filtros?.data_inicio) params.set('data_inicio', filtros.data_inicio)
  if (filtros?.data_fim) params.set('data_fim', filtros.data_fim)
  if (filtros?.paciente_id) params.set('paciente_id', filtros.paciente_id)
  const query = params.toString() ? `?${params}` : ''

  return useQuery<HistoricoFinanceiroItem[]>({
    queryKey: ['relatorios', 'historico-financeiro', filtros],
    queryFn: () =>
      apiFetch<HistoricoFinanceiroItem[]>(`/api/v1/relatorios/historico-financeiro${query}`),
  })
}

export function useHistoricoAtendimentos(filtros?: FiltrosHistorico) {
  const params = new URLSearchParams()
  if (filtros?.data_inicio) params.set('data_inicio', filtros.data_inicio)
  if (filtros?.data_fim) params.set('data_fim', filtros.data_fim)
  if (filtros?.paciente_id) params.set('paciente_id', filtros.paciente_id)
  const query = params.toString() ? `?${params}` : ''

  return useQuery<HistoricoAtendimentosItem[]>({
    queryKey: ['relatorios', 'historico-atendimentos', filtros],
    queryFn: () =>
      apiFetch<HistoricoAtendimentosItem[]>(`/api/v1/relatorios/historico-atendimentos${query}`),
  })
}

export function useVisaoGeral() {
  return useQuery<VisaoGeral>({
    queryKey: ['relatorios', 'visao-geral'],
    queryFn: () => apiFetch<VisaoGeral>('/api/v1/relatorios/visao-geral'),
    staleTime: 5 * 60 * 1000,
  })
}

export interface ItemReceitaFutura {
  data: string           // YYYY-MM-DD
  paciente_nome: string
  tipo_atendimento: string | null
  cobranca: string | null
  valor: number
  incluido: boolean
  motivo: string
}

export interface ReceitaPrevistaDetalhamento {
  mes: string            // YYYY-MM
  receita_realizada: number
  receita_futura: number
  receita_prevista_mes: number
  itens_futuros: ItemReceitaFutura[]
}

export function useReceitaPrevistaDetalhamento(enabled: boolean) {
  return useQuery<ReceitaPrevistaDetalhamento>({
    queryKey: ['relatorios', 'receita-prevista-detalhamento'],
    queryFn: () => apiFetch<ReceitaPrevistaDetalhamento>('/api/v1/relatorios/receita-prevista-detalhamento'),
    enabled,
    staleTime: 0,
  })
}
