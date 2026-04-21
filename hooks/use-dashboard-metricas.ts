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

  // Semana atual: segunda → domingo
  const diaSemana = hoje.getDay() // 0=dom
  const diffSeg = diaSemana === 0 ? -6 : 1 - diaSemana
  const seg = new Date(hoje)
  seg.setDate(hoje.getDate() + diffSeg)
  const dom = new Date(seg)
  dom.setDate(seg.getDate() + 6)

  // Mês atual
  const ano = hoje.getFullYear()
  const mes = hoje.getMonth() + 1
  const mesStr = `${ano}-${String(mes).padStart(2, '0')}`
  const inicioMes = `${mesStr}-01`

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
    inicioSemana: isoDate(seg),
    fimSemana: isoDate(dom),
    mesStr,
    inicioMes,
    mesPassadoStr,
    inicioMesPassado,
    fimMesPassado,
    nomeMesPassado: MESES[mesMP - 1],
  }
}

export function useDashboardMetricas() {
  const p = useMemo(() => calcularPeriodos(), [])

  const { data: agendaSemana, isLoading: l1 } = useAgendamentos({
    data_inicio: p.inicioSemana,
    data_fim: p.fimSemana,
    page_size: 500,
  })

  const { data: agendaMesPassado, isLoading: l2 } = useAgendamentos({
    data_inicio: p.inicioMesPassado,
    data_fim: p.fimMesPassado,
    page_size: 500,
  })

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

  const { data: pacientesAtivos, isLoading: l6 } = usePacientes({
    ativo: true,
    page_size: 500,
  })

  const loading = l1 || l2 || l3 || l4 || l5 || l6

  // Atendimentos da semana
  const atendimentosSemana = useMemo(
    () => (agendaSemana?.items ?? []).filter(a => a.status !== 'cancelado').length,
    [agendaSemana],
  )

  const deltaAtendimentos = useMemo<number | null>(() => {
    if (!agendaMesPassado) return null
    const totalMP = (agendaMesPassado.items).filter(a => a.status !== 'cancelado').length
    return Math.round(atendimentosSemana - totalMP / 4)
  }, [atendimentosSemana, agendaMesPassado])

  // Faturamento
  const faturamentoMes = financeiroMes?.resumo.receita_mes ?? 0
  const deltaFaturamento = financeiroMesPassado
    ? faturamentoMes - (financeiroMesPassado.resumo.receita_mes ?? 0)
    : null

  // Presença — só conta status definitivos (realizado / falta)
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

  // Gratuitos
  const gratuitos = useMemo(
    () => (pacientesAtivos?.items ?? []).filter(p => p.gratuito).length,
    [pacientesAtivos],
  )

  return {
    loading,
    atendimentosSemana,
    deltaAtendimentos,
    faturamentoMes,
    deltaFaturamento,
    taxaPresenca,
    deltaPresenca,
    gratuitos,
    nomeMesPassado: p.nomeMesPassado,
  }
}
