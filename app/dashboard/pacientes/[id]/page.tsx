'use client'

import { useState, useMemo, Fragment } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, User, CheckCircle2, XCircle,
  Pencil, Save, Hash, Activity, DollarSign, TrendingUp,
  ChevronDown, ChevronUp, FileText, ExternalLink, CreditCard,
} from 'lucide-react'
import { cn, extractTiptapText } from '@/lib/utils'
import { ConfirmDiscard } from '@/components/confirm-discard'
import { DatePicker } from '@/components/ui/date-picker'
import { toast } from 'sonner'

/* ── Types ─────────────────────────────────────────── */

const TIPOS_SESSAO = [
  'Sessão',
  'Sessão família',
  'Sessão em grupo',
  'Anamnese',
  'Devolutiva família',
  'Reunião com a escola',
  'Reunião multidisciplinar',
] as const

type StatusTipo = 'valorSessao' | 'inclusa' | 'cobradaAParte'

type TipoSessaoPlano = { tipo: string; status: StatusTipo; valor: string }

type PlanoData = { tipos: TipoSessaoPlano[] }

const PLANO_PADRAO: PlanoData = {
  tipos: TIPOS_SESSAO.map(t => {
    const status: StatusTipo =
      t === 'Devolutiva família'
        ? 'inclusa'
        : ['Reunião com a escola', 'Reunião multidisciplinar'].includes(t)
          ? 'cobradaAParte'
          : 'valorSessao'
    return { tipo: t, status, valor: '' }
  }),
}

type Sessao = {
  id: number
  numero: number
  data: string
  tipoSessao: string
  presenca: boolean
  material: string
  links: string[]
  notasSessaoJson: Record<string, unknown> | null
}

type ValorHistorico = { mesAno: string; valor: number }

type PacienteCompleto = {
  id: number
  ativo: boolean
  nome: string
  dataNascimento: string
  responsavel: string
  dataAnamnese: string
  valorSessao: string
  gratuito: boolean
  gratuitoInicio: string
  gratuitoFim: string
  dataInicio: string
  dataFim: string | null
  totalSessoes: number
  presencas: number
  faltas: number
  historicoValores: ValorHistorico[]
  plano: PlanoData
}

/* ── Helpers ───────────────────────────────────────── */

function brToIso(d: string): string {
  if (!d || d === '-' || d === '—') return ''
  const [day, month, year] = d.split('/')
  return `${year}-${month}-${day}`
}

function isoToBr(d: string): string {
  if (!d) return '-'
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

function calcularIdade(dataNascBR: string): number {
  const [d, m, y] = dataNascBR.split('/').map(Number)
  const nasc = new Date(y, m - 1, d)
  const hoje = new Date()
  let idade = hoje.getFullYear() - nasc.getFullYear()
  if (hoje.getMonth() < m - 1 || (hoje.getMonth() === m - 1 && hoje.getDate() < d)) idade--
  return idade
}

function formatValorBRL(raw: string): string {
  const limpo = raw.replace(/[^\d,]/g, '')
  if (!limpo) return ''
  const num = parseFloat(limpo.replace(',', '.'))
  if (isNaN(num)) return raw
  const formatted = num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return `R$ ${formatted}`
}

/* ── Notas mock para sessões ──────────────────────── */

const notasMock: (Record<string, unknown> | null)[] = [
  {
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Sessão com excelente engajamento. Paciente demonstrou melhora significativa no controle postural durante as atividades com bambolês. Trabalhou-se coordenação bilateral e planejamento motor com circuito de obstáculos. Vocalização espontânea durante a atividade lúdica.' }] }],
  },
  {
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Foco em regulação sensorial com pressão profunda. Boa tolerância ao toque leve com tecidos. Realizou sequência de 4 movimentos de imitação com sucesso. Família relatou melhora no sono durante a semana — continuar protocolo atual.' }] }],
  },
  null,
  {
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Trabalho de equilíbrio dinâmico com prancha e bastões. Progressão notável: completou o circuito em tempo recorde. Introduzido o conceito de movimento cruzado (crossing midline) com êxito. Próxima sessão: ampliar para dois planos simultâneos.' }] }],
  },
  null,
  {
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Integração bilateral com bolas de diferentes pesos e texturas. Coordenação óculo-manual em desenvolvimento — acertou 7 de 10 lançamentos. Paciente pediu para repetir a atividade com caixas: boa indicação de preferência e autorregulação.' }] }],
  },
  null,
  null,
]

/* ── Gerador de sessões fake ──────────────────────── */

const tiposRotacao = [
  'Sessão', 'Sessão', 'Sessão', 'Sessão família', 'Sessão',
  'Anamnese', 'Sessão', 'Sessão em grupo', 'Sessão', 'Devolutiva família',
  'Sessão', 'Sessão', 'Reunião com a escola', 'Sessão', 'Sessão',
] as const

function gerarSessoes(totalSessoes: number, totalFaltas: number): Sessao[] {
  const sessoes: Sessao[] = []
  const materiais = [
    'Caixas, bambolês, bastões e cordas',
    'Caixas, tecidos e cordas',
    'Bolas, caixas e bambolês',
    'Tecidos, bastões e bolas',
    'Caixas e cordas',
    'Bambolês, tecidos e bastões',
    'Bolas, tecidos e cordas',
    'Caixas, bolas e bambolês',
  ]

  const qtd = Math.min(15, totalSessoes)
  const faltasRecentes = Math.min(totalFaltas, Math.floor(qtd * 0.3))
  const faltaIndices = new Set<number>()
  for (let i = 0; i < faltasRecentes; i++) {
    faltaIndices.add(2 + i * 3)
  }

  for (let i = 0; i < qtd; i++) {
    const numero = totalSessoes - i
    const d = new Date(2026, 2, 17)
    d.setDate(d.getDate() - i * 7)
    const isFalta = faltaIndices.has(i)

    sessoes.push({
      id: numero,
      numero,
      data: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`,
      tipoSessao: tiposRotacao[i % tiposRotacao.length],
      presenca: !isFalta,
      material: isFalta ? '-' : materiais[i % materiais.length],
      links: isFalta ? [] : (i % 3 === 0 ? [`https://youtube.com/watch?v=sess${numero}`] : []),
      notasSessaoJson: isFalta ? null : (notasMock[i % notasMock.length] ?? null),
    })
  }

  return sessoes
}

/* ── Dados fake (espelho do cadastro) ─────────────── */

const pacientesData: PacienteCompleto[] = [
  { id: 1,  ativo: true,  nome: 'Bernardo Antonio L.F.',    dataNascimento: '15/10/2019', responsavel: 'Bruna e Maikal',       dataAnamnese: '19/05/2023', valorSessao: 'R$ 120,00', gratuito: false, gratuitoInicio: '-', gratuitoFim: '-',            dataInicio: '25/05/2023', dataFim: null,         totalSessoes: 111, presencas: 106, faltas: 5,
    historicoValores: [{ mesAno: 'mai/2023', valor: 80 }, { mesAno: 'jan/2024', valor: 100 }, { mesAno: 'set/2024', valor: 120 }],
    plano: PLANO_PADRAO },
  { id: 2,  ativo: true,  nome: 'Angelo Gustavo P. Holub',  dataNascimento: '24/03/2017', responsavel: 'Cristiane e Anderson', dataAnamnese: '15/02/2024', valorSessao: 'R$ 100,00', gratuito: true,  gratuitoInicio: '16/02/2024', gratuitoFim: '16/05/2024', dataInicio: '16/02/2024', dataFim: null,         totalSessoes: 77,  presencas: 74,  faltas: 3,
    historicoValores: [{ mesAno: 'fev/2024', valor: 0 }, { mesAno: 'mai/2024', valor: 80 }, { mesAno: 'nov/2024', valor: 100 }],
    plano: PLANO_PADRAO },
  { id: 3,  ativo: true,  nome: 'Lorenzo de Souza Bueno',   dataNascimento: '15/04/2017', responsavel: 'Micheli e Marcelo',   dataAnamnese: '09/05/2024', valorSessao: 'R$ 150,00', gratuito: false, gratuitoInicio: '-', gratuitoFim: '-',            dataInicio: '16/05/2024', dataFim: null,         totalSessoes: 74,  presencas: 70,  faltas: 4,
    historicoValores: [{ mesAno: 'mai/2024', valor: 120 }, { mesAno: 'nov/2024', valor: 150 }],
    plano: PLANO_PADRAO },
  { id: 4,  ativo: false, nome: 'Gabriel Fernandes B.C.',   dataNascimento: '10/08/2019', responsavel: 'Aline',               dataAnamnese: '19/05/2023', valorSessao: 'R$ 80,00',  gratuito: false, gratuitoInicio: '-', gratuitoFim: '-',            dataInicio: '25/05/2023', dataFim: '08/03/2024', totalSessoes: 35,  presencas: 33,  faltas: 2,
    historicoValores: [{ mesAno: 'mai/2023', valor: 80 }],
    plano: PLANO_PADRAO },
  { id: 5,  ativo: true,  nome: 'Pietro Bizinelli Amorim',  dataNascimento: '17/03/2016', responsavel: 'Giovana e Marco',     dataAnamnese: '13/09/2024', valorSessao: 'R$ 150,00', gratuito: false, gratuitoInicio: '-', gratuitoFim: '-',            dataInicio: '20/09/2024', dataFim: null,         totalSessoes: 36,  presencas: 30,  faltas: 6,
    historicoValores: [{ mesAno: 'set/2024', valor: 120 }, { mesAno: 'jan/2025', valor: 150 }],
    plano: PLANO_PADRAO },
  { id: 6,  ativo: true,  nome: 'Rafaela de Souza Bueno',   dataNascimento: '26/11/2013', responsavel: 'Micheli e Marcelo',   dataAnamnese: '16/10/2024', valorSessao: 'R$ 120,00', gratuito: false, gratuitoInicio: '-', gratuitoFim: '-',            dataInicio: '03/10/2024', dataFim: null,         totalSessoes: 55,  presencas: 53,  faltas: 2,
    historicoValores: [{ mesAno: 'out/2024', valor: 100 }, { mesAno: 'fev/2025', valor: 120 }],
    plano: PLANO_PADRAO },
  { id: 7,  ativo: true,  nome: 'Vinícius Augusto Padilha', dataNascimento: '09/08/2012', responsavel: 'Rosilane',            dataAnamnese: '17/02/2025', valorSessao: 'R$ 160,00', gratuito: false, gratuitoInicio: '-', gratuitoFim: '-',            dataInicio: '28/02/2025', dataFim: null,         totalSessoes: 38,  presencas: 37,  faltas: 1,
    historicoValores: [{ mesAno: 'fev/2025', valor: 160 }],
    plano: PLANO_PADRAO },
  { id: 8,  ativo: true,  nome: 'Moysés Costa de Almeida',  dataNascimento: '23/07/2010', responsavel: 'Renata e Marcos',     dataAnamnese: '17/02/2025', valorSessao: 'R$ 160,00', gratuito: false, gratuitoInicio: '-', gratuitoFim: '-',            dataInicio: '28/02/2025', dataFim: null,         totalSessoes: 41,  presencas: 39,  faltas: 2,
    historicoValores: [{ mesAno: 'fev/2025', valor: 160 }],
    plano: PLANO_PADRAO },
  { id: 9,  ativo: true,  nome: 'Isadora Furman',           dataNascimento: '11/12/2019', responsavel: 'Louise e Rafael',     dataAnamnese: '20/05/2025', valorSessao: 'R$ 160,00', gratuito: false, gratuitoInicio: '-', gratuitoFim: '-',            dataInicio: '28/05/2025', dataFim: null,         totalSessoes: 29,  presencas: 26,  faltas: 3,
    historicoValores: [{ mesAno: 'mai/2025', valor: 160 }],
    plano: PLANO_PADRAO },
  { id: 10, ativo: false, nome: 'Arthur Henrique',          dataNascimento: '23/03/2022', responsavel: 'Jaqueline e Bernardo', dataAnamnese: '14/02/2025', valorSessao: 'R$ 160,00', gratuito: false, gratuitoInicio: '-', gratuitoFim: '-',           dataInicio: '18/02/2025', dataFim: '26/03/2025', totalSessoes: 12,  presencas: 11,  faltas: 1,
    historicoValores: [{ mesAno: 'fev/2025', valor: 160 }],
    plano: PLANO_PADRAO },
]

/* ── Helpers do gráfico de valor ──────────────────── */

const mesesAbrev = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

function parseMesAno(ma: string): Date {
  const [mes, ano] = ma.split('/')
  return new Date(parseInt(ano), mesesAbrev.indexOf(mes))
}

function niceStep(min: number, max: number): number {
  const range = max - min || max || 50
  const rough = range / 4
  const pow = Math.pow(10, Math.floor(Math.log10(rough)))
  const norm = rough / pow
  if (norm <= 1.5) return pow
  if (norm <= 3.5) return 2 * pow
  if (norm <= 7.5) return 5 * pow
  return 10 * pow
}

function smoothLinePath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return `M ${pts[0]?.x ?? 0} ${pts[0]?.y ?? 0}`
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i - 1]
    const c = pts[i]
    const cpx = (p.x + c.x) / 2
    d += ` C ${cpx.toFixed(1)} ${p.y.toFixed(1)}, ${cpx.toFixed(1)} ${c.y.toFixed(1)}, ${c.x.toFixed(1)} ${c.y.toFixed(1)}`
  }
  return d
}

/* ── Gráfico de evolução do valor (curva suave) ──── */

function ValorSessaoChart({ historico, valorAtual }: { historico: ValorHistorico[]; valorAtual: string }) {
  if (historico.length === 0) return null

  const agora: ValorHistorico = { mesAno: 'mar/2026', valor: historico[historico.length - 1].valor }
  const lastIsNow = historico[historico.length - 1].mesAno === agora.mesAno
  const pontos = lastIsNow ? [...historico] : [...historico, agora]

  const dates = pontos.map(p => parseMesAno(p.mesAno))
  const valores = pontos.map(p => p.valor)

  const W = 560
  const H = 280
  const padL = 62
  const padR = 32
  const padT = 52
  const padB = 48
  const plotW = W - padL - padR  // 466
  const plotH = H - padT - padB  // 180

  const minTime = dates[0].getTime()
  const maxTime = dates[dates.length - 1].getTime()
  const timeRange = maxTime - minTime || 1

  const minV = Math.min(...valores)
  const maxV = Math.max(...valores)
  const margin = (maxV - minV) * 0.35 || maxV * 0.35 || 40
  const yMin = Math.max(0, minV - margin)
  const yMax = maxV + margin
  const yRange = yMax - yMin || 1

  function xPos(d: Date) { return padL + ((d.getTime() - minTime) / timeRange) * plotW }
  function yPos(v: number) { return padT + plotH - ((v - yMin) / yRange) * plotH }

  // Pontos para a curva
  const curvePts = pontos.map((_, i) => ({ x: xPos(dates[i]), y: yPos(valores[i]) }))
  const linePath = smoothLinePath(curvePts)

  // Área preenchida (fecha o path na base)
  const lastPt = curvePts[curvePts.length - 1]
  const firstPt = curvePts[0]
  const fillPath = linePath + ` L ${lastPt.x.toFixed(1)} ${(padT + plotH).toFixed(1)} L ${firstPt.x.toFixed(1)} ${(padT + plotH).toFixed(1)} Z`

  // Grid
  const step = niceStep(yMin, yMax)
  const gridVals: number[] = []
  let gv = Math.ceil(yMin / step) * step
  while (gv <= yMax) { gridVals.push(gv); gv += step }

  // Porcentagem: pega o primeiro valor NÃO zero como base
  const teveAlteracao = historico.length > 1
  const primeiroNaoZero = historico.find(h => h.valor > 0)
  const ultimoValor = historico[historico.length - 1].valor
  const variacaoNum = teveAlteracao && primeiroNaoZero && primeiroNaoZero !== historico[historico.length - 1]
    ? Math.round(((ultimoValor - primeiroNaoZero.valor) / primeiroNaoZero.valor) * 100)
    : null

  return (
    <div className="rounded-xl border bg-card shadow-sm flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 border-b">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="rounded-lg p-2 bg-[#04c2fb]/10 shrink-0">
              <DollarSign className="h-4 w-4 text-[#04c2fb]" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-snug">Evolução do Valor da Sessão</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Histórico desde {historico[0].mesAno}
              </p>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <span className="text-lg sm:text-2xl font-bold tracking-tight text-gray-800">{valorAtual}</span>
            {variacaoNum !== null && (
              <div className="mt-1">
                <span className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold',
                  variacaoNum >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600',
                )}>
                  {variacaoNum >= 0 ? '↑' : '↓'} {Math.abs(variacaoNum)}% total
                </span>
              </div>
            )}
            {!teveAlteracao && (
              <p className="text-xs text-muted-foreground mt-1">sem alterações</p>
            )}
          </div>
        </div>
      </div>

      {/* Gráfico */}
      <div className="p-4 pt-2">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
          <defs>
            {/* Gradiente de área principal */}
            <linearGradient id="valGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#04c2fb" stopOpacity="0.32" />
              <stop offset="35%"  stopColor="#04c2fb" stopOpacity="0.14" />
              <stop offset="70%"  stopColor="#04c2fb" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#04c2fb" stopOpacity="0.00" />
            </linearGradient>
            {/* Gradiente horizontal para shimmer sutil na linha */}
            <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%"   stopColor="#0094c8" />
              <stop offset="50%"  stopColor="#04c2fb" />
              <stop offset="100%" stopColor="#00d5f5" />
            </linearGradient>
            {/* Glow da linha */}
            <filter id="lineGlow" x="-5%" y="-50%" width="110%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {/* Glow dos pontos */}
            <filter id="dotGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {/* Clip da área do plot */}
            <clipPath id="valPlotArea">
              <rect x={padL} y={padT} width={plotW} height={plotH} />
            </clipPath>
          </defs>

          {/* Grid horizontal com linhas tracejadas suaves */}
          {gridVals.map(v => (
            <g key={v}>
              <line
                x1={padL} y1={yPos(v)} x2={W - padR} y2={yPos(v)}
                stroke="#e8f0f8" strokeWidth="1" strokeDasharray="4 4"
              />
              <text
                x={padL - 10} y={yPos(v)}
                textAnchor="end" dominantBaseline="middle"
                fontSize="13" fill="#94a3b8" fontWeight="600" fontFamily="Montserrat, sans-serif"
              >
                R${v}
              </text>
            </g>
          ))}

          {/* Linhas verticais suaves para cada ponto de dado */}
          {historico.map((_, i) => (
            <line
              key={`vline-${i}`}
              x1={xPos(dates[i])} y1={padT}
              x2={xPos(dates[i])} y2={padT + plotH}
              stroke="#f1f5f9" strokeWidth="1"
            />
          ))}

          {/* Eixo inferior */}
          <line
            x1={padL} y1={padT + plotH} x2={W - padR} y2={padT + plotH}
            stroke="#cbd5e1" strokeWidth="1.5"
          />

          {/* Área preenchida */}
          <path d={fillPath} fill="url(#valGrad)" clipPath="url(#valPlotArea)" />

          {/* Sombra difusa da linha (layer mais abaixo) */}
          <path
            d={linePath} fill="none"
            stroke="#04c2fb" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"
            opacity="0.12"
          />
          {/* Sombra próxima */}
          <path
            d={linePath} fill="none"
            stroke="#04c2fb" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"
            opacity="0.18"
            transform="translate(0, 1.5)"
          />
          {/* Linha principal com gradiente */}
          <path
            d={linePath} fill="none"
            stroke="url(#lineGrad)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
          />

          {/* Pontos do histórico real */}
          {historico.map((p, i) => {
            const cx = xPos(dates[i])
            const cy = yPos(p.valor)
            const isLast = i === historico.length - 1
            const isZero = p.valor === 0
            const prevValor = i > 0 ? historico[i - 1].valor : null
            const prevCx = i > 0 ? xPos(dates[i - 1]) : null
            const labelY = (prevCx !== null && cx - prevCx < 80) ? padT + plotH + 32 : padT + plotH + 18

            return (
              <g key={i}>
                {/* Halo externo suave */}
                <circle cx={cx} cy={cy} r="18" fill="#04c2fb" opacity="0.05" />
                {/* Anel médio */}
                <circle cx={cx} cy={cy} r="11" fill="#04c2fb" opacity="0.10" />
                {/* Anel interno */}
                <circle cx={cx} cy={cy} r="7"  fill="#04c2fb" opacity="0.18" />
                {/* Ponto principal */}
                <circle
                  cx={cx} cy={cy}
                  r={isLast ? '6' : '5'}
                  fill="white" stroke="#04c2fb" strokeWidth="2.5"
                  filter={isLast ? 'url(#dotGlow)' : undefined}
                />
                {/* Centro colorido no último ponto */}
                {isLast && <circle cx={cx} cy={cy} r="2.5" fill="#04c2fb" />}

                {/* Label do valor (pill badge) */}
                {isZero ? (
                  <g>
                    <rect
                      x={cx - 30} y={cy - 32} width="60" height="20" rx="10"
                      fill="#fef3c7" stroke="#fde68a" strokeWidth="1"
                    />
                    <text
                      x={cx} y={cy - 19}
                      textAnchor="middle" dominantBaseline="middle"
                      fontSize="12" fontWeight="700" fill="#92400e" fontFamily="Montserrat, sans-serif"
                    >
                      Gratuito
                    </text>
                  </g>
                ) : (
                  <g>
                    <rect
                      x={cx - 38} y={cy - 34} width="76" height="22" rx="11"
                      fill={isLast ? '#04c2fb' : 'white'}
                      stroke={isLast ? 'transparent' : '#e2e8f0'}
                      strokeWidth="1.2"
                      filter={isLast ? 'url(#dotGlow)' : undefined}
                    />
                    <text
                      x={cx} y={cy - 20}
                      textAnchor="middle" dominantBaseline="middle"
                      fontSize="13" fontWeight="700"
                      fill={isLast ? 'white' : '#1f2937'}
                      fontFamily="Montserrat, sans-serif"
                    >
                      R$ {p.valor}
                    </text>
                  </g>
                )}

                {/* Badge variação entre pontos (só se anterior > 0) */}
                {prevValor !== null && prevValor > 0 && (
                  (() => {
                    const pct = Math.round(((p.valor - prevValor) / prevValor) * 100)
                    const up = pct >= 0
                    return (
                      <g>
                        <rect
                          x={cx - 25} y={cy - 58} width="50" height="17" rx="8.5"
                          fill={up ? '#ecfdf5' : '#fef2f2'}
                          stroke={up ? '#86efac' : '#fca5a5'} strokeWidth="0.8"
                        />
                        <text
                          x={cx} y={cy - 48}
                          textAnchor="middle" dominantBaseline="middle"
                          fontSize="11" fontWeight="700"
                          fill={up ? '#059669' : '#dc2626'}
                          fontFamily="Montserrat, sans-serif"
                        >
                          {up ? '↑' : '↓'} {Math.abs(pct)}%
                        </text>
                      </g>
                    )
                  })()
                )}

                {/* Data abaixo do eixo */}
                <text
                  x={cx} y={labelY}
                  textAnchor="middle" fontSize="12" fill="#64748b" fontWeight="600"
                  fontFamily="Montserrat, sans-serif"
                >
                  {p.mesAno}
                </text>
              </g>
            )
          })}

          {/* Marcador "atual" projetado */}
          {!lastIsNow && (
            <g>
              <line
                x1={xPos(dates[dates.length - 1])}
                y1={padT}
                x2={xPos(dates[dates.length - 1])}
                y2={padT + plotH}
                stroke="#04c2fb" strokeWidth="1.5" strokeDasharray="5 4" opacity="0.35"
              />
              <circle
                cx={xPos(dates[dates.length - 1])}
                cy={yPos(valores[valores.length - 1])}
                r="4" fill="#04c2fb" opacity="0.5"
              />
              <text
                x={xPos(dates[dates.length - 1])}
                y={padT + plotH + 20}
                textAnchor="middle" fontSize="11" fill="#04c2fb" fontWeight="700"
                letterSpacing="0.8" fontFamily="Montserrat, sans-serif"
              >
                ATUAL
              </text>
            </g>
          )}
        </svg>
      </div>
    </div>
  )
}

/* ── Cálculo do total ganho ───────────────────────── */

function calcularTotalGanho(
  historico: ValorHistorico[],
  presencas: number,
): { mesAno: string; total: number }[] {
  if (historico.length === 0) return []

  const hoje = 'mar/2026'
  const lastH = historico[historico.length - 1]
  const lastIsNow = lastH.mesAno === hoje
  const pontos = lastIsNow
    ? [...historico]
    : [...historico, { mesAno: hoje, valor: lastH.valor }]

  if (pontos.length < 2) return [{ mesAno: pontos[0].mesAno, total: 0 }]

  const duracoes = pontos.slice(0, -1).map((p, i) => {
    const start = parseMesAno(p.mesAno)
    const end = parseMesAno(pontos[i + 1].mesAno)
    return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth())
  })

  const totalMeses = duracoes.reduce((a, b) => a + b, 0) || 1

  let restante = presencas
  const presencasPorPeriodo = duracoes.map((dur, i) => {
    if (i === duracoes.length - 1) return restante
    const p = Math.round(presencas * dur / totalMeses)
    restante -= p
    return p
  })

  let acum = 0
  const result: { mesAno: string; total: number }[] = [{ mesAno: pontos[0].mesAno, total: 0 }]
  presencasPorPeriodo.forEach((p, i) => {
    acum += p * historico[i].valor
    result.push({ mesAno: pontos[i + 1].mesAno, total: acum })
  })
  return result
}

/* ── Gráfico de total ganho (curva esmeralda) ─────── */

function TotalGanhoChart({ historico, presencas }: { historico: ValorHistorico[]; presencas: number }) {
  if (historico.length === 0) return null

  const dadosGanho = calcularTotalGanho(historico, presencas)
  if (dadosGanho.length === 0) return null

  const totalFinal = dadosGanho[dadosGanho.length - 1].total

  const W = 560
  const H = 280
  const padL = 62
  const padR = 52
  const padT = 52
  const padB = 48
  const plotW = W - padL - padR
  const plotH = H - padT - padB

  const dates = dadosGanho.map(d => parseMesAno(d.mesAno))
  const totais = dadosGanho.map(d => d.total)

  const minTime = dates[0].getTime()
  const maxTime = dates[dates.length - 1].getTime()
  const timeRange = maxTime - minTime || 1

  const maxV = Math.max(...totais)
  const margin = maxV * 0.25 || 200
  const yMax = maxV + margin
  const yRange = yMax || 1

  function xPos(d: Date) { return padL + ((d.getTime() - minTime) / timeRange) * plotW }
  function yPos(v: number) { return padT + plotH - (v / yRange) * plotH }

  const curvePts = dadosGanho.map((_, i) => ({ x: xPos(dates[i]), y: yPos(totais[i]) }))
  const linePath = smoothLinePath(curvePts)

  const lastPt = curvePts[curvePts.length - 1]
  const firstPt = curvePts[0]
  const fillPath = linePath + ` L ${lastPt.x.toFixed(1)} ${(padT + plotH).toFixed(1)} L ${firstPt.x.toFixed(1)} ${(padT + plotH).toFixed(1)} Z`

  const step = niceStep(0, yMax)
  const gridVals: number[] = []
  let gv = 0
  while (gv <= yMax) { gridVals.push(gv); gv += step }

  function formatGrid(v: number) {
    if (v === 0) return 'R$0'
    if (v >= 1000) return `R$${(v / 1000).toFixed(0)}k`
    return `R$${v}`
  }

  return (
    <div className="rounded-xl border bg-card shadow-sm flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 border-b">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="rounded-lg p-2 bg-emerald-500/10 shrink-0">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-snug">Total Ganho com o Paciente</p>
              <p className="text-xs text-muted-foreground mt-0.5">Apenas presenças contabilizadas</p>
            </div>
          </div>
          <span className="shrink-0 text-lg sm:text-2xl font-bold tracking-tight text-emerald-800 text-right">
            {totalFinal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </span>
        </div>
      </div>

      {/* Gráfico */}
      <div className="p-4 pt-2">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="totGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#10b981" stopOpacity="0.28" />
              <stop offset="35%"  stopColor="#10b981" stopOpacity="0.12" />
              <stop offset="70%"  stopColor="#10b981" stopOpacity="0.04" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.00" />
            </linearGradient>
            <linearGradient id="totLineGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%"   stopColor="#059669" />
              <stop offset="50%"  stopColor="#10b981" />
              <stop offset="100%" stopColor="#34d399" />
            </linearGradient>
            <filter id="totLineGlow" x="-5%" y="-50%" width="110%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="totDotGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <clipPath id="totPlotArea">
              <rect x={padL} y={padT} width={plotW} height={plotH} />
            </clipPath>
          </defs>

          {/* Grid horizontal */}
          {gridVals.map(v => (
            <g key={v}>
              <line
                x1={padL} y1={yPos(v)} x2={W - padR} y2={yPos(v)}
                stroke="#e8f0f8" strokeWidth="1" strokeDasharray="4 4"
              />
              <text
                x={padL - 10} y={yPos(v)}
                textAnchor="end" dominantBaseline="middle"
                fontSize="13" fill="#94a3b8" fontWeight="600" fontFamily="Montserrat, sans-serif"
              >
                {formatGrid(v)}
              </text>
            </g>
          ))}

          {/* Linhas verticais para cada ponto */}
          {dadosGanho.map((_, i) => (
            <line
              key={`tvline-${i}`}
              x1={xPos(dates[i])} y1={padT}
              x2={xPos(dates[i])} y2={padT + plotH}
              stroke="#f1f5f9" strokeWidth="1"
            />
          ))}

          {/* Eixo inferior */}
          <line
            x1={padL} y1={padT + plotH} x2={W - padR} y2={padT + plotH}
            stroke="#cbd5e1" strokeWidth="1.5"
          />

          {/* Área preenchida */}
          <path d={fillPath} fill="url(#totGrad)" clipPath="url(#totPlotArea)" />

          {/* Sombra difusa */}
          <path d={linePath} fill="none" stroke="#10b981" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" opacity="0.12" />
          <path d={linePath} fill="none" stroke="#10b981" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" opacity="0.18" transform="translate(0, 1.5)" />
          {/* Linha principal */}
          <path d={linePath} fill="none" stroke="url(#totLineGrad)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

          {/* Pontos */}
          {dadosGanho.map((d, i) => {
            const cx = xPos(dates[i])
            const cy = yPos(d.total)
            const isLast = i === dadosGanho.length - 1
            const prevCx = i > 0 ? xPos(dates[i - 1]) : null
            const labelY = (prevCx !== null && cx - prevCx < 80) ? padT + plotH + 32 : padT + plotH + 18

            return (
              <g key={i}>
                <circle cx={cx} cy={cy} r="18" fill="#10b981" opacity="0.05" />
                <circle cx={cx} cy={cy} r="11" fill="#10b981" opacity="0.10" />
                <circle cx={cx} cy={cy} r="7"  fill="#10b981" opacity="0.18" />
                <circle
                  cx={cx} cy={cy}
                  r={isLast ? '6' : '5'}
                  fill="white" stroke="#10b981" strokeWidth="2.5"
                  filter={isLast ? 'url(#totDotGlow)' : undefined}
                />
                {isLast && <circle cx={cx} cy={cy} r="2.5" fill="#10b981" />}

                {/* Badge do valor */}
                {d.total > 0 && (() => {
                  const badgeW = 92
                  const halfBadge = badgeW / 2
                  // Clamp badge para não sair do viewBox
                  const badgeCx = Math.min(Math.max(cx, padL + halfBadge), W - padR)
                  return (
                    <g>
                      <rect
                        x={badgeCx - halfBadge} y={cy - 34} width={badgeW} height="22" rx="11"
                        fill={isLast ? '#10b981' : 'white'}
                        stroke={isLast ? 'transparent' : '#e2e8f0'}
                        strokeWidth="1.2"
                        filter={isLast ? 'url(#totDotGlow)' : undefined}
                      />
                      <text
                        x={badgeCx} y={cy - 20}
                        textAnchor="middle" dominantBaseline="middle"
                        fontSize="12" fontWeight="700"
                        fill={isLast ? 'white' : '#1f2937'}
                        fontFamily="Montserrat, sans-serif"
                      >
                        {d.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </text>
                    </g>
                  )
                })()}

                {/* Label mês/ano */}
                <text
                  x={cx} y={labelY}
                  textAnchor="middle" fontSize="12" fill="#64748b" fontWeight="600"
                  fontFamily="Montserrat, sans-serif"
                >
                  {d.mesAno}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}

/* ── Info Item (view mode) ────────────────────────── */

function InfoItem({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className={cn('text-sm mt-1', highlight ? 'font-semibold text-emerald-600' : 'font-medium text-gray-800')}>{value}</p>
    </div>
  )
}

/* ── Card de Plano ────────────────────────────────── */

const STATUS_META: Record<StatusTipo, {
  label: string
  labelEdit: string
  dotColor: string
  rowCls: string
  activeCls: string
}> = {
  valorSessao: {
    label: 'Valor da sessão',
    labelEdit: 'Valor da sessão',
    dotColor: 'bg-emerald-500',
    rowCls: 'bg-emerald-50/70 border-emerald-100',
    activeCls: 'bg-emerald-500 text-white',
  },
  inclusa: {
    label: 'Inclusa no plano',
    labelEdit: 'Inclusa',
    dotColor: 'bg-[#04c2fb]',
    rowCls: 'bg-[#04c2fb]/5 border-[#04c2fb]/20',
    activeCls: 'bg-[#04c2fb] text-white',
  },
  cobradaAParte: {
    label: 'Cobrado à parte',
    labelEdit: 'À parte',
    dotColor: 'bg-amber-500',
    rowCls: 'bg-amber-50/60 border-amber-100',
    activeCls: 'bg-amber-500 text-white',
  },
}

function CardPlano({
  planoInicial,
  valorSessao,
  onSalvar,
}: {
  planoInicial: PlanoData
  valorSessao: string
  onSalvar: (novoPlano: PlanoData) => void
}) {
  const [editando, setEditando] = useState(false)
  const [form, setForm] = useState<PlanoData>(planoInicial)

  function setStatus(tipo: string, status: StatusTipo) {
    setForm(prev => ({
      tipos: prev.tipos.map(t => t.tipo === tipo ? { ...t, status } : t),
    }))
  }

  function setValor(tipo: string, valor: string) {
    setForm(prev => ({
      tipos: prev.tipos.map(t => t.tipo === tipo ? { ...t, valor } : t),
    }))
  }

  function formatarValor(tipo: string) {
    setForm(prev => ({
      tipos: prev.tipos.map(t => {
        if (t.tipo !== tipo || !t.valor.trim()) return t
        return { ...t, valor: formatValorBRL(t.valor) }
      }),
    }))
  }

  function salvar() {
    onSalvar(form)
    setEditando(false)
    toast.success('Plano atualizado', {
      description: 'As alterações valem apenas para sessões registradas a partir de agora.',
    })
  }

  function cancelar() {
    setForm(planoInicial)
    setEditando(false)
  }

  const tiposPorStatus = (s: StatusTipo) => planoInicial.tipos.filter(t => t.status === s)
  const resumo = (['valorSessao', 'inclusa', 'cobradaAParte'] as StatusTipo[])
    .filter(s => tiposPorStatus(s).length > 0)
    .map(s => {
      const n = tiposPorStatus(s).length
      const labels: Record<StatusTipo, string> = { valorSessao: 'no valor', inclusa: 'inclusa', cobradaAParte: 'à parte' }
      return `${n} ${labels[s]}`
    })
    .join(' · ')

  const inputCls = 'w-full rounded-lg border border-gray-200 bg-white/80 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#04c2fb]/40 transition-all'

  return (
    <div className="rounded-xl border bg-card shadow-sm">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="rounded-lg p-2 bg-[#04c2fb]/10 shrink-0">
            <CreditCard className="h-4 w-4 text-[#04c2fb]" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold">Plano de atendimento</p>
            {!editando && resumo && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{resumo}</p>
            )}
            {editando && (
              <p className="text-xs text-muted-foreground mt-0.5">Defina a cobrança de cada tipo de sessão</p>
            )}
          </div>
        </div>
        {!editando ? (
          <button
            onClick={() => { setForm(planoInicial); setEditando(true) }}
            className="group/edit shrink-0 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-[#04c2fb]/5 hover:text-[#04c2fb] transition-all duration-200 border hover:border-[#04c2fb]/30"
          >
            <Pencil className="h-3.5 w-3.5 transition-transform duration-200 group-hover/edit:-rotate-12 group-hover/edit:scale-110" /> Editar
          </button>
        ) : (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={cancelar}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors border"
            >
              Cancelar
            </button>
            <button
              onClick={salvar}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-white transition-colors hover:brightness-110"
              style={{ background: 'linear-gradient(135deg, #0094c8 0%, #04c2fb 60%, #00d5f5 100%)' }}
            >
              <Save className="h-3.5 w-3.5" /> Salvar
            </button>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-4 sm:p-5">
        {editando ? (
          <div className="space-y-3">
            {/* Legenda dos 3 estados */}
            <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted/40 border p-3">
              {(['valorSessao', 'inclusa', 'cobradaAParte'] as StatusTipo[]).map(s => (
                <div key={s} className="flex flex-col items-center gap-1 text-center">
                  <span className={cn('inline-block h-2 w-2 rounded-full', STATUS_META[s].dotColor)} />
                  <span className="text-[10px] font-medium text-muted-foreground leading-tight">
                    {s === 'valorSessao' ? `${STATUS_META[s].label} (${valorSessao})` : STATUS_META[s].label}
                  </span>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              {form.tipos.map(({ tipo, status, valor }) => (
                <div key={tipo} className="rounded-lg border bg-white/50 p-3 space-y-2">
                  <p className="text-sm font-medium text-gray-800">{tipo}</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {(['valorSessao', 'inclusa', 'cobradaAParte'] as StatusTipo[]).map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setStatus(tipo, s)}
                        className={cn(
                          'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                          status === s
                            ? STATUS_META[s].activeCls
                            : 'border text-muted-foreground hover:bg-muted',
                        )}
                      >
                        {STATUS_META[s].labelEdit}
                      </button>
                    ))}
                  </div>
                  {status === 'cobradaAParte' && (
                    <div className="space-y-1 pt-0.5">
                      <label className="text-xs font-medium text-muted-foreground">
                        Valor <span className="font-normal text-muted-foreground/70">(deixe em branco para &ldquo;a combinar&rdquo;)</span>
                      </label>
                      <input
                        value={valor}
                        onChange={e => setValor(tipo, e.target.value)}
                        onBlur={() => formatarValor(tipo)}
                        placeholder="Ex: R$ 200,00"
                        className={inputCls}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Valor da sessão */}
            {tiposPorStatus('valorSessao').length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Valor da sessão
                  </p>
                </div>
                <div className="space-y-1">
                  {tiposPorStatus('valorSessao').map(({ tipo }) => (
                    <div key={tipo} className="flex items-center justify-between px-3 py-2 rounded-lg bg-emerald-50/70 border border-emerald-100">
                      <span className="text-sm text-gray-800">{tipo}</span>
                      <span className="text-sm font-semibold text-emerald-700">{valorSessao}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Inclusa no plano */}
            {tiposPorStatus('inclusa').length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#04c2fb]" />
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Inclusa no plano
                  </p>
                </div>
                <div className="space-y-1">
                  {tiposPorStatus('inclusa').map(({ tipo }) => (
                    <div key={tipo} className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#04c2fb]/5 border border-[#04c2fb]/20">
                      <span className="text-sm text-gray-800">{tipo}</span>
                      <span className="inline-flex items-center rounded-full bg-[#04c2fb]/10 px-2 py-0.5 text-[11px] font-semibold text-[#0094c8]">
                        Sem cobrança adicional
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cobrado à parte */}
            {tiposPorStatus('cobradaAParte').length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Cobrado à parte
                  </p>
                </div>
                <div className="space-y-1">
                  {tiposPorStatus('cobradaAParte').map(({ tipo, valor }) => (
                    <div key={tipo} className="flex items-center justify-between px-3 py-2 rounded-lg bg-amber-50/60 border border-amber-100">
                      <span className="text-sm text-gray-800">{tipo}</span>
                      {valor ? (
                        <span className="text-sm font-semibold text-amber-700">{valor}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">A combinar</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Conteúdo principal (separado para evitar hooks condicionais) ── */

function PacienteDetalheContent({ pacienteInicial }: { pacienteInicial: PacienteCompleto }) {
  const router = useRouter()

  const [paciente, setPaciente] = useState(pacienteInicial)
  const [plano, setPlano] = useState<PlanoData>(pacienteInicial.plano)
  const [editando, setEditando] = useState(false)
  const [confirmarDescartar, setConfirmarDescartar] = useState<'cancelar' | 'voltar' | null>(null)
  const [form, setForm] = useState({
    nome: paciente.nome,
    responsavel: paciente.responsavel,
    dataNascimento: brToIso(paciente.dataNascimento),
    dataAnamnese: brToIso(paciente.dataAnamnese),
    valorSessao: paciente.valorSessao,
    gratuito: paciente.gratuito,
    gratuitoInicio: brToIso(paciente.gratuitoInicio),
    gratuitoFim: brToIso(paciente.gratuitoFim),
    dataInicio: brToIso(paciente.dataInicio),
    dataFim: paciente.dataFim ? brToIso(paciente.dataFim) : '',
    ativo: paciente.ativo,
  })

  const sessoes = useMemo(
    () => gerarSessoes(paciente.totalSessoes, paciente.faltas),
    [paciente.totalSessoes, paciente.faltas],
  )
  const [expandidoSessaoId, setExpandidoSessaoId] = useState<number | null>(null)

  function toggleSessao(id: number) {
    setExpandidoSessaoId(prev => (prev === id ? null : id))
  }

  const idade = calcularIdade(paciente.dataNascimento)
  const taxaPresenca = paciente.totalSessoes > 0
    ? Math.round((paciente.presencas / paciente.totalSessoes) * 100)
    : 0

  // Snapshot do form no momento em que o usuário clicou em "Editar"
  function formOriginal() {
    return {
      nome: paciente.nome,
      responsavel: paciente.responsavel,
      dataNascimento: brToIso(paciente.dataNascimento),
      dataAnamnese: brToIso(paciente.dataAnamnese),
      valorSessao: paciente.valorSessao,
      gratuito: paciente.gratuito,
      gratuitoInicio: brToIso(paciente.gratuitoInicio),
      gratuitoFim: brToIso(paciente.gratuitoFim),
      dataInicio: brToIso(paciente.dataInicio),
      dataFim: paciente.dataFim ? brToIso(paciente.dataFim) : '',
      ativo: paciente.ativo,
    }
  }

  function formFoiAlterado(): boolean {
    const orig = formOriginal()
    return (Object.keys(orig) as (keyof typeof orig)[]).some(k => String(form[k]) !== String(orig[k]))
  }

  function f(field: string, value: string | boolean) {
    setForm(prev => {
      const next = { ...prev, [field]: value }
      if (field === 'ativo' && value === true) next.dataFim = ''
      if (field === 'gratuito' && value === false) {
        next.gratuitoInicio = ''
        next.gratuitoFim = ''
      }
      return next
    })
  }

  function salvarEdicao() {
    setPaciente(prev => ({
      ...prev,
      nome: form.nome,
      responsavel: form.responsavel,
      dataNascimento: form.dataNascimento ? isoToBr(form.dataNascimento) : prev.dataNascimento,
      dataAnamnese: form.dataAnamnese ? isoToBr(form.dataAnamnese) : prev.dataAnamnese,
      valorSessao: form.valorSessao ? formatValorBRL(form.valorSessao) : prev.valorSessao,
      gratuito: form.gratuito,
      gratuitoInicio: form.gratuito && form.gratuitoInicio ? isoToBr(form.gratuitoInicio) : '-',
      gratuitoFim: form.gratuito && form.gratuitoFim ? isoToBr(form.gratuitoFim) : '-',
      dataInicio: form.dataInicio ? isoToBr(form.dataInicio) : prev.dataInicio,
      dataFim: !form.ativo && form.dataFim ? isoToBr(form.dataFim) : null,
      ativo: form.ativo,
    }))
    setEditando(false)
    toast.success('Alterações salvas', { description: 'Os dados do paciente foram atualizados.' })
  }

  function resetarForm() {
    setForm(formOriginal())
    setEditando(false)
  }

  function tentarCancelar() {
    if (formFoiAlterado()) setConfirmarDescartar('cancelar')
    else resetarForm()
  }

  function tentarVoltar() {
    if (editando && formFoiAlterado()) setConfirmarDescartar('voltar')
    else router.push('/dashboard/pacientes')
  }

  function executarDescarte() {
    const acao = confirmarDescartar
    setConfirmarDescartar(null)
    resetarForm()
    if (acao === 'voltar') router.push('/dashboard/pacientes')
  }

  const inputCls = 'w-full rounded-lg border border-gray-200 bg-white/80 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#04c2fb]/40 transition-all'

  return (
    <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto">

      {/* ── Alerta de descarte ───────────────────── */}
      {confirmarDescartar && (
        <ConfirmDiscard
          onConfirmar={executarDescarte}
          onCancelar={() => setConfirmarDescartar(null)}
        />
      )}

      {/* ── Header ───────────────────────────────── */}
      <div className="flex items-center gap-4">
        <button
          onClick={tentarVoltar}
          className="rounded-xl p-2.5 text-muted-foreground hover:bg-muted transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-semibold tracking-tight truncate">{paciente.nome}</h1>
            <span className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium shrink-0',
              paciente.ativo ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500',
            )}>
              <span className={cn('h-1.5 w-1.5 rounded-full', paciente.ativo ? 'bg-green-500' : 'bg-gray-400')} />
              {paciente.ativo ? 'Ativo' : 'Inativo'}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {idade} anos · Responsável: {paciente.responsavel}
          </p>
        </div>
      </div>

      {/* ── Cards de resumo ──────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {[
          { label: 'Total Sessões', valor: paciente.totalSessoes, cor: 'text-gray-800',  bg: 'bg-blue-500/10',     icon: <Hash className="h-4 w-4 text-blue-500" /> },
          { label: 'Presenças',     valor: paciente.presencas,    cor: 'text-emerald-600', bg: 'bg-emerald-500/10', icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" /> },
          { label: 'Faltas',        valor: paciente.faltas,       cor: 'text-red-500',     bg: 'bg-red-500/10',     icon: <XCircle className="h-4 w-4 text-red-500" /> },
          { label: 'Taxa Presença', valor: `${taxaPresenca}%`,    cor: 'text-[#04c2fb]',   bg: 'bg-[#04c2fb]/10',   icon: <Activity className="h-4 w-4 text-[#04c2fb]" /> },
        ].map(card => (
          <div key={card.label} className="rounded-xl border bg-card p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-medium text-muted-foreground">{card.label}</p>
                <p className={cn('mt-2 text-2xl font-bold tracking-tight', card.cor)}>{card.valor}</p>
              </div>
              <div className={cn('rounded-lg p-2.5', card.bg)}>{card.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Informações do paciente ──── */}
      <div className="rounded-xl border bg-card shadow-sm">
          <div className="p-5 border-b flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Informações</p>
              <p className="text-xs text-muted-foreground mt-0.5">Dados cadastrais do paciente</p>
            </div>
            {!editando ? (
              <button
                onClick={() => setEditando(true)}
                className="group/edit flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-[#04c2fb]/5 hover:text-[#04c2fb] transition-all duration-200 border hover:border-[#04c2fb]/30"
              >
                <Pencil className="h-3.5 w-3.5 transition-transform duration-200 group-hover/edit:-rotate-12 group-hover/edit:scale-110" /> Editar
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={tentarCancelar}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors border"
                >
                  Cancelar
                </button>
                <button
                  onClick={salvarEdicao}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-white transition-colors hover:brightness-110"
                  style={{ background: 'linear-gradient(135deg, #0094c8 0%, #04c2fb 60%, #00d5f5 100%)' }}
                >
                  <Save className="h-3.5 w-3.5" /> Salvar
                </button>
              </div>
            )}
          </div>

          {editando ? (
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-medium text-muted-foreground">Nome completo</label>
                  <input value={form.nome} onChange={e => f('nome', e.target.value)} className={inputCls} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Responsável</label>
                  <input value={form.responsavel} onChange={e => f('responsavel', e.target.value)} className={inputCls} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Data de Nascimento</label>
                  <DatePicker value={form.dataNascimento} onChange={v => f('dataNascimento', v)} placeholder="Selecionar data" variant="birthdate" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Data da Anamnese</label>
                  <DatePicker value={form.dataAnamnese} onChange={v => f('dataAnamnese', v)} placeholder="Selecionar data" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Valor da Sessão</label>
                  <input
                    value={form.valorSessao}
                    onChange={e => f('valorSessao', e.target.value)}
                    onBlur={() => { if (form.valorSessao.trim()) f('valorSessao', formatValorBRL(form.valorSessao)) }}
                    className={inputCls}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Data de Início</label>
                  <DatePicker value={form.dataInicio} onChange={v => f('dataInicio', v)} placeholder="Selecionar data" />
                </div>

                {/* Gratuito */}
                <div className="space-y-3 sm:col-span-2">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <div
                      className={cn(
                        'flex h-5 w-5 items-center justify-center rounded border-2 transition-colors',
                        form.gratuito ? 'border-[#04c2fb] bg-[#04c2fb]' : 'border-gray-300 bg-white hover:border-gray-400',
                      )}
                      onClick={() => f('gratuito', !form.gratuito)}
                    >
                      {form.gratuito && (
                        <svg viewBox="0 0 12 10" className="h-3 w-3 text-white" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 5l3 3 7-7" />
                        </svg>
                      )}
                    </div>
                    <span className="text-sm font-medium text-gray-700">Período gratuito</span>
                  </label>
                  {form.gratuito && (
                    <div className="grid grid-cols-1 gap-3 pl-7 sm:grid-cols-2">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Início</label>
                        <DatePicker value={form.gratuitoInicio} onChange={v => f('gratuitoInicio', v)} placeholder="Selecionar data" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Fim</label>
                        <DatePicker value={form.gratuitoFim} onChange={v => f('gratuitoFim', v)} placeholder="Selecionar data" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Status */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Status</label>
                  <button
                    type="button"
                    onClick={() => f('ativo', !form.ativo)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                      form.ativo ? 'border-green-200 bg-green-50 text-green-700' : 'border-gray-200 bg-gray-50 text-gray-500',
                    )}
                  >
                    <span className={cn('h-2 w-2 rounded-full', form.ativo ? 'bg-green-500' : 'bg-gray-400')} />
                    {form.ativo ? 'Ativo' : 'Inativo'}
                  </button>
                </div>
                {!form.ativo && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Data de Fim</label>
                    <DatePicker value={form.dataFim} onChange={v => f('dataFim', v)} placeholder="Selecionar data" />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-5">
              <div className="grid grid-cols-1 gap-y-4 sm:grid-cols-2 sm:gap-y-5 sm:gap-x-6">
                <InfoItem label="Responsável" value={paciente.responsavel} />
                <InfoItem label="Data de Nascimento" value={`${paciente.dataNascimento} (${idade} anos)`} />
                <InfoItem label="Data da Anamnese" value={paciente.dataAnamnese} />
                <InfoItem label="Valor da Sessão" value={paciente.valorSessao} highlight />
                <InfoItem label="Data de Início" value={paciente.dataInicio} />
                {paciente.dataFim && <InfoItem label="Data de Fim" value={paciente.dataFim} />}
                {paciente.gratuito && (
                  <>
                    <InfoItem label="Início Gratuidade" value={paciente.gratuitoInicio} />
                    <InfoItem label="Fim Gratuidade" value={paciente.gratuitoFim} />
                  </>
                )}
              </div>
            </div>
          )}
        </div>

      {/* ── Plano ────────────────────────────────── */}
      <CardPlano
        planoInicial={plano}
        valorSessao={paciente.valorSessao}
        onSalvar={setPlano}
      />

      {/* ── Gráficos lado a lado ─────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ValorSessaoChart historico={paciente.historicoValores} valorAtual={paciente.valorSessao} />
        <TotalGanhoChart historico={paciente.historicoValores} presencas={paciente.presencas} />
      </div>

      {/* ── Tabela de sessões ────────────────────── */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="p-5 border-b flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">Sessões Recentes</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Últimas {sessoes.length} de {paciente.totalSessoes} sessões registradas
            </p>
          </div>
          <span className="text-xs text-muted-foreground">{sessoes.length} exibida(s)</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Data</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Presença</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Tipo</th>
                <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Material</th>
                <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Notas</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground w-20">Ações</th>
                <th className="px-4 py-3 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {sessoes.map(s => {
                const textoPreview = extractTiptapText(s.notasSessaoJson, 70)
                const textoCompleto = extractTiptapText(s.notasSessaoJson, 1000)
                const aberto = expandidoSessaoId === s.id
                const temNotas = !!s.notasSessaoJson && textoCompleto.length > 0

                return (
                  <Fragment key={s.id}>
                    <tr className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground">
                        {s.data}
                        {/* Mobile: notas preview abaixo da data */}
                        {temNotas && (
                          <div className="flex items-start gap-1 mt-1 md:hidden">
                            <FileText className="h-3 w-3 text-[#04c2fb] shrink-0 mt-0.5" />
                            <span className="text-[11px] text-muted-foreground line-clamp-1">{textoPreview}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium',
                          s.presenca ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600',
                        )}>
                          <span className={cn('h-1.5 w-1.5 rounded-full', s.presenca ? 'bg-green-500' : 'bg-red-500')} />
                          {s.presenca ? 'Presente' : 'Falta'}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-[130px]">
                        <span className="inline-flex items-center rounded-full bg-[#04c2fb]/8 border border-[#04c2fb]/20 px-2 py-0.5 text-[11px] font-medium text-[#04c2fb] truncate max-w-full">
                          {s.tipoSessao}
                        </span>
                      </td>
                      <td className="hidden md:table-cell px-4 py-3 text-muted-foreground max-w-[180px] truncate" title={s.material}>
                        {s.material}
                      </td>
                      {/* Coluna Notas — desktop */}
                      <td className="hidden md:table-cell px-4 py-3 max-w-[220px]">
                        {temNotas ? (
                          <div className="flex items-start gap-1.5">
                            <FileText className="h-3.5 w-3.5 text-[#04c2fb] shrink-0 mt-0.5" />
                            <span className="text-xs text-muted-foreground line-clamp-1">{textoPreview}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                      {/* Botão editar */}
                      <td className="px-3 py-3 text-center">
                        <button
                          onClick={() => router.push(`/dashboard/registros/${s.id}?editar=true`)}
                          title="Editar sessão"
                          className="group/edit inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-[#04c2fb]/5 hover:text-[#04c2fb] transition-all duration-200"
                        >
                          <Pencil className="h-3.5 w-3.5 transition-transform duration-200 group-hover/edit:-rotate-12 group-hover/edit:scale-110" />
                        </button>
                      </td>
                      {/* Botão expandir */}
                      <td className="px-3 py-3 text-right">
                        {temNotas && (
                          <button
                            onClick={() => toggleSessao(s.id)}
                            title={aberto ? 'Fechar notas' : 'Ver notas'}
                            className={cn(
                              'inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors',
                              aberto
                                ? 'bg-[#04c2fb]/10 text-[#04c2fb]'
                                : 'text-muted-foreground hover:bg-muted hover:text-gray-700',
                            )}
                          >
                            <span className="hidden sm:inline">{aberto ? 'Fechar' : 'Ver notas'}</span>
                            {aberto
                              ? <ChevronUp className="h-3.5 w-3.5" />
                              : <ChevronDown className="h-3.5 w-3.5" />
                            }
                          </button>
                        )}
                      </td>
                    </tr>

                    {/* Painel expandido */}
                    {temNotas && (
                      <tr className={aberto ? '' : 'hidden'}>
                        <td colSpan={7} className="px-0 py-0">
                          <div
                            className={cn(
                              'grid transition-all duration-200',
                              aberto ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
                            )}
                          >
                            <div className="overflow-hidden">
                              <div className="mx-4 my-3 rounded-lg border-l-4 border-[#04c2fb] bg-[#04c2fb]/5 px-4 py-3">
                                <div className="flex items-center gap-2 mb-2">
                                  <FileText className="h-3.5 w-3.5 text-[#04c2fb]" />
                                  <span className="text-xs font-semibold text-[#04c2fb]">Notas da Sessão</span>
                                </div>
                                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                                  {textoCompleto}
                                </p>
                                {(s.material && s.material !== '-') || s.links.length > 0 ? (
                                  <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-[#04c2fb]/15">
                                    {s.material && s.material !== '-' && (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-white border border-gray-200 px-2.5 py-0.5 text-[11px] text-gray-600">
                                        Material: {s.material}
                                      </span>
                                    )}
                                    {s.links.map((link, i) => (
                                      <a
                                        key={i}
                                        href={link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 rounded-full border border-[#04c2fb]/30 bg-[#04c2fb]/5 px-2.5 py-0.5 text-[11px] text-[#04c2fb] hover:bg-[#04c2fb]/10 transition-colors max-w-[180px]"
                                        title={link}
                                      >
                                        <ExternalLink className="h-3 w-3 shrink-0" />
                                        <span className="truncate">{(() => { try { return new URL(link).hostname.replace('www.', '') } catch { return link } })()}</span>
                                      </a>
                                    ))}
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
              {sessoes.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    Nenhuma sessão registrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

/* ── Page wrapper ─────────────────────────────────── */

export default function PacienteDetalhePage() {
  const params = useParams()
  const router = useRouter()
  const id = Number(params.id)

  const paciente = pacientesData.find(p => p.id === id)

  if (!paciente) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 max-w-7xl mx-auto">
        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
          <User className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-lg font-semibold text-gray-800">Paciente não encontrado</p>
        <p className="text-sm text-muted-foreground">O paciente solicitado não existe ou foi removido.</p>
        <button
          onClick={() => router.push('/dashboard/pacientes')}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors hover:brightness-110 mt-2"
          style={{ background: 'linear-gradient(135deg, #0094c8 0%, #04c2fb 60%, #00d5f5 100%)' }}
        >
          <ArrowLeft className="h-4 w-4" /> Voltar para lista
        </button>
      </div>
    )
  }

  return <PacienteDetalheContent pacienteInicial={paciente} />
}
