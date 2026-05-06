import { useMemo } from 'react'
import { useAgendamentos } from '@/hooks/use-agenda'
import { useTransacoes } from '@/hooks/use-financeiro'
import { usePacientes } from '@/hooks/use-pacientes'
import { nowSP } from '@/lib/timezone'

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function calcularPeriodos() {
  const hoje = nowSP()
  const hojeStr = isoDate(hoje)

  // Mês atual
  const ano = hoje.getFullYear()
  const mes = hoje.getMonth() + 1
  const mesStr = `${ano}-${String(mes).padStart(2, '0')}`
  const inicioMes = `${mesStr}-01`
  const fimMes = isoDate(new Date(ano, mes, 0)) // último dia do mês atual

  // Mês passado
  const mpDate = new Date(ano, mes - 2, 1)
  const anoMP = mpDate.getFullYear()
  const mesMP = mpDate.getMonth() + 1
  const mesPassadoStr = `${anoMP}-${String(mesMP).padStart(2, '0')}`
  const inicioMesPassado = `${mesPassadoStr}-01`
  const fimMesPassado = isoDate(new Date(anoMP, mesMP, 0))

  const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

  return {
    hojeStr,
    mesStr,
    inicioMes,
    fimMes,
    mesPassadoStr,
    inicioMesPassado,
    fimMesPassado,
    nomeMesPassado: MESES[mesMP - 1],
  }
}

export function useDashboardMetricas() {
  const p = useMemo(() => calcularPeriodos(), [])

  // Mês atual completo — para contar atendimentos previstos (inclui futuros)
  const { data: agendaMesTodo, isLoading: l1 } = useAgendamentos({
    data_inicio: p.inicioMes,
    data_fim: p.fimMes,
    page_size: 500,
  })

  // Mês passado completo — para deltas de atendimentos e taxa de presença
  const { data: agendaMesPassado, isLoading: l2 } = useAgendamentos({
    data_inicio: p.inicioMesPassado,
    data_fim: p.fimMesPassado,
    page_size: 500,
  })

  // Mês atual até hoje — para taxa de presença (só status definitivos fazem sentido)
  const { data: agendaMesAtual, isLoading: l3 } = useAgendamentos({
    data_inicio: p.inicioMes,
    data_fim: p.hojeStr,
    page_size: 500,
  })

  const { data: financeiroMes, isLoading: l4 } = useTransacoes({
    mes: p.mesStr,
    tipo: 'receita',
  })

  const { data: financeiroMesPassado, isLoading: l5 } = useTransacoes({
    mes: p.mesPassadoStr,
    tipo: 'receita',
  })

  const { data: pacientesGratuitos } = usePacientes({
    ativo: true,
    gratuito: true,
  })

  const loading = l1 || l2 || l3 || l4 || l5

  // Atendimentos do mês: tudo exceto cancelado
  const contaAtendimento = (status: string) => status !== 'cancelado'

  const atendimentosMesPrevisto = useMemo(
    () => (agendaMesTodo?.items ?? []).filter(a => contaAtendimento(a.status)).length,
    [agendaMesTodo],
  )

  const deltaAtendimentos = useMemo<number | null>(() => {
    if (!agendaMesPassado) return null
    const totalMP = agendaMesPassado.items.filter(a => contaAtendimento(a.status)).length
    return atendimentosMesPrevisto - totalMP
  }, [atendimentosMesPrevisto, agendaMesPassado])

  // Faturamento
  const faturamentoMes = financeiroMes?.resumo.receita_mes ?? 0
  const deltaFaturamento = financeiroMesPassado
    ? faturamentoMes - (financeiroMesPassado.resumo.receita_mes ?? 0)
    : null

  // Presença — só conta status definitivos (realizado / falta), até hoje
  const { taxaPresenca, deltaPresenca } = useMemo(() => {
    const definitivos = (agendaMesAtual?.items ?? []).filter(
      a => a.status === 'realizado' || a.status === 'falta',
    )
    const presentes = definitivos.filter(a => a.status === 'realizado').length
    const taxa = definitivos.length > 0 ? Math.round((presentes / definitivos.length) * 100) : 0

    const definitivosMP = (agendaMesPassado?.items ?? []).filter(
      a => a.status === 'realizado' || a.status === 'falta',
    )
    const presentesMP = definitivosMP.filter(a => a.status === 'realizado').length
    const taxaMP = agendaMesPassado && definitivosMP.length > 0
      ? Math.round((presentesMP / definitivosMP.length) * 100)
      : null

    return {
      taxaPresenca: taxa,
      deltaPresenca: taxaMP !== null ? taxa - taxaMP : null,
    }
  }, [agendaMesAtual, agendaMesPassado])

  // Gratuitos — query dedicada ao backend com filtro gratuito=true; total vem direto do banco
  const gratuitos = pacientesGratuitos?.total ?? 0

  return {
    loading,
    atendimentosMesPrevisto,
    deltaAtendimentos,
    faturamentoMes,
    deltaFaturamento,
    taxaPresenca,
    deltaPresenca,
    gratuitos,
    nomeMesPassado: p.nomeMesPassado,
  }
}
