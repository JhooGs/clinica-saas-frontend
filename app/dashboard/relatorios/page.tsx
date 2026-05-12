'use client'

import { useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Award,
  BarChart2,
  CalendarDays,
  ChevronDown,
  Clock,
  Info,
  TrendingDown,
  TrendingUp,
  X,
  CheckCircle2,
  MinusCircle,
  Banknote,
  Loader2,
  TriangleAlert,
} from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { hojeISO } from '@/lib/timezone'
import { ModalPortal } from '@/components/modal-portal'
import { useVisaoGeral, useHistoricoFinanceiro, useHistoricoAtendimentos, useReceitaPrevistaDetalhamento } from '@/hooks/use-relatorios'
import { useTransacoes } from '@/hooks/use-financeiro'
import { usePacientes } from '@/hooks/use-pacientes'
import type { FiltrosHistorico } from '@/hooks/use-relatorios'

// ── Constantes ──────────────────────────────────────────────────────────────
const ANO_ATUAL = new Date().getFullYear()
const ANOS_PICKER = Array.from({ length: 6 }, (_, i) => ANO_ATUAL - 5 + i)
const MESES_NOMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]
const MESES_CURTOS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
type ModoFiltro = 'mes' | 'ano' | 'periodo'

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatBRL(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

function formatBRLAbrev(v: number) {
  if (v >= 1000) return `R$${(v / 1000).toFixed(0)}k`
  return `R$${v.toFixed(0)}`
}

function formatMesCurto(mesStr: string) {
  const [ano, mes] = mesStr.split('-')
  return `${MESES_CURTOS[parseInt(mes) - 1]}/${ano.slice(2)}`
}

function formatMesLongo(mesStr: string) {
  const [ano, mes] = mesStr.split('-')
  return `${MESES_NOMES[parseInt(mes) - 1]} ${ano}`
}

function labelFiltro(modo: ModoFiltro, mes: string, ano: number, inicio: string, fim: string) {
  if (modo === 'mes') {
    const [y, m] = mes.split('-')
    return `${MESES_NOMES[parseInt(m) - 1]} ${y}`
  }
  if (modo === 'ano') return `${ano}`
  if (inicio && fim) {
    const [yi, mi] = inicio.split('-')
    const [yf, mf] = fim.split('-')
    if (yi === yf) return `${MESES_CURTOS[parseInt(mi) - 1]} → ${MESES_CURTOS[parseInt(mf) - 1]} ${yi}`
    return `${MESES_CURTOS[parseInt(mi) - 1]} ${yi} → ${MESES_CURTOS[parseInt(mf) - 1]} ${yf}`
  }
  return 'Período'
}

// ── ChartTooltip ─────────────────────────────────────────────────────────────
function ChartTooltipBRL({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string; dataKey: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border bg-white p-3 shadow-lg text-sm min-w-[160px]">
      <p className="font-semibold text-slate-700 mb-2 text-xs">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-3 text-xs mb-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
            <span className="text-muted-foreground">{p.name}</span>
          </div>
          <span className="font-semibold tabular-nums">{formatBRL(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

function ChartTooltipNum({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string; dataKey: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border bg-white p-3 shadow-lg text-sm min-w-[140px]">
      <p className="font-semibold text-slate-700 mb-2 text-xs">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-3 text-xs mb-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
            <span className="text-muted-foreground">{p.name}</span>
          </div>
          <span className="font-semibold tabular-nums">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

// ── ChartSkeleton ─────────────────────────────────────────────────────────────
function ChartSkeleton() {
  return (
    <div className="h-[260px] flex items-end gap-2 px-2 animate-pulse">
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className="flex-1 rounded-t-md bg-muted/60"
          style={{ height: `${30 + Math.sin(i * 0.8) * 20 + 30}%` }}
        />
      ))}
    </div>
  )
}

// ── EmptyChart ────────────────────────────────────────────────────────────────
function EmptyChart() {
  return (
    <div className="h-[260px] flex flex-col items-center justify-center gap-2 text-muted-foreground">
      <BarChart2 className="h-8 w-8 opacity-30" />
      <p className="text-sm">Nenhum dado no período selecionado</p>
    </div>
  )
}

// ── MetricCard ────────────────────────────────────────────────────────────────
function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  gradFrom,
  gradTo,
  loading = false,
  onInfoClick,
}: {
  icon: React.ElementType
  label: string
  value: string
  sub?: string
  gradFrom: string
  gradTo: string
  loading?: boolean
  onInfoClick?: () => void
}) {
  return (
    <div className="rounded-xl border bg-card shadow-sm p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div
          className="rounded-xl p-2.5 shrink-0"
          style={{ background: `linear-gradient(135deg, ${gradFrom}, ${gradTo})` }}
        >
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-0.5">
            <p className="text-xs text-muted-foreground">{label}</p>
            {onInfoClick && (
              <button
                type="button"
                onClick={onInfoClick}
                className="rounded-full p-0.5 text-muted-foreground/50 hover:text-[#04c2fb] hover:bg-[#04c2fb]/10 transition-colors shrink-0"
                title="Ver detalhamento do cálculo"
              >
                <Info className="h-3 w-3" />
              </button>
            )}
          </div>
          {loading ? (
            <div className="h-7 w-24 rounded bg-muted animate-pulse mt-1" />
          ) : (
            <p className="text-2xl font-bold tabular-nums tracking-tight leading-tight">{value}</p>
          )}
          {sub && !loading && (
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{sub}</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Modal Detalhamento Receita Prevista ────────────────────────────────────────
const MESES_LONGOS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

function formatDataCurta(iso: string) {
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}

function ModalDetalhamentoReceita({ onClose }: { onClose: () => void }) {
  const { data, isLoading } = useReceitaPrevistaDetalhamento(true)

  const mesLabel = data
    ? (() => {
        const [ano, m] = data.mes.split('-')
        return `${MESES_LONGOS[parseInt(m) - 1]} ${ano}`
      })()
    : ''

  const totalIncluidos = data?.itens_futuros.filter(i => i.incluido).length ?? 0
  const totalFuturos   = data?.itens_futuros.length ?? 0

  return (
    <ModalPortal>
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-xl rounded-2xl border border-white/30 shadow-2xl overflow-hidden flex flex-col"
        style={{
          backdropFilter: 'blur(20px)',
          backgroundColor: 'rgba(255,255,255,0.98)',
          maxHeight: '88vh',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)' }}
        >
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white/20 p-2">
              <Banknote className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white leading-tight">Receita Prevista do Mês</p>
              <p className="text-xs text-white/80">{mesLabel || 'carregando...'}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/70 hover:bg-white/20 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16 gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-[#04c2fb]" />
            <span className="text-sm text-muted-foreground">Calculando projeção...</span>
          </div>
        ) : data ? (
          <>
            {/* Pills de resumo */}
            <div className="flex items-center gap-2 px-5 py-3 border-b bg-slate-50/60 shrink-0">
              <div className="flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-[11px] font-semibold text-emerald-700">Realizado</span>
                <span className="text-[11px] font-bold text-emerald-800 tabular-nums ml-1">
                  {formatBRL(data.receita_realizada)}
                </span>
              </div>
              <span className="text-muted-foreground/40 text-sm font-light">+</span>
              <div className="flex items-center gap-1.5 rounded-lg bg-[#04c2fb]/8 border border-[#04c2fb]/20 px-3 py-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#04c2fb] shrink-0" />
                <span className="text-[11px] font-semibold text-[#0094c8]">Projetado</span>
                <span className="text-[11px] font-bold text-[#04c2fb] tabular-nums ml-1">
                  {formatBRL(data.receita_futura)}
                </span>
              </div>
              <span className="text-muted-foreground/40 text-sm font-light">=</span>
              <div className="flex items-center gap-1.5 rounded-lg bg-gray-100 border border-gray-200 px-3 py-1.5">
                <span className="text-[11px] font-semibold text-gray-600">Total</span>
                <span className="text-[11px] font-bold text-gray-900 tabular-nums ml-1">
                  {formatBRL(data.receita_prevista_mes)}
                </span>
              </div>
            </div>

            {/* Corpo */}
            <div className="overflow-y-auto flex-1 min-h-0">

              {/* Bloco: Já realizado */}
              <div className="px-5 pt-4 pb-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  Já realizado este mês
                </p>
                <div className="flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span className="text-sm font-medium text-gray-700">
                      Receitas lançadas no financeiro
                    </span>
                  </div>
                  <span className="text-sm font-bold text-emerald-700 tabular-nums">
                    {formatBRL(data.receita_realizada)}
                  </span>
                </div>
              </div>

              {/* Bloco: Agendamentos futuros */}
              <div className="px-5 pb-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Agendamentos futuros
                  </p>
                  {totalFuturos > 0 && (
                    <span className="text-[10px] text-muted-foreground">
                      {totalIncluidos} de {totalFuturos} contribuem
                    </span>
                  )}
                </div>

                {data.itens_futuros.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-gray-200 py-8 text-center">
                    <p className="text-sm text-muted-foreground">Sem agendamentos futuros este mês</p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-gray-100 overflow-hidden divide-y divide-gray-50">
                    {data.itens_futuros.map((item, i) => (
                      <div
                        key={i}
                        className={cn(
                          'flex items-center gap-3 px-4 py-2.5 transition-colors',
                          item.incluido
                            ? 'bg-white hover:bg-slate-50/60'
                            : 'bg-gray-50/40',
                        )}
                      >
                        {/* Ícone de status */}
                        {item.incluido ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                        ) : (
                          <MinusCircle className="h-3.5 w-3.5 text-gray-300 shrink-0" />
                        )}

                        {/* Data */}
                        <span className={cn(
                          'text-[11px] font-bold tabular-nums shrink-0 w-10',
                          item.incluido ? 'text-gray-500' : 'text-gray-300',
                        )}>
                          {formatDataCurta(item.data)}
                        </span>

                        {/* Paciente + tipo + badge */}
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            'text-sm font-semibold leading-tight truncate',
                            item.incluido ? 'text-gray-800' : 'text-gray-300',
                          )}>
                            {item.paciente_nome}
                          </p>
                          {item.tipo_atendimento && (
                            <p className={cn(
                              'text-[11px] leading-snug truncate',
                              item.incluido ? 'text-muted-foreground' : 'text-gray-300',
                            )}>
                              {item.tipo_atendimento}
                            </p>
                          )}
                          {/* Badge de cobrança empilhado abaixo do tipo */}
                          {item.cobranca && (
                            <span className={cn(
                              'inline-flex mt-1 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide whitespace-nowrap',
                              !item.incluido
                                ? 'bg-gray-100 border border-gray-200 text-gray-400'
                                : item.cobranca === 'mensal'
                                  ? 'bg-violet-100 text-violet-600'
                                  : 'bg-[#04c2fb]/10 text-[#0094c8]',
                            )}>
                              {item.cobranca === 'mensal' ? 'mensalidade' : 'por atend.'}
                            </span>
                          )}
                        </div>

                        {/* Valor */}
                        <span className={cn(
                          'text-sm font-bold tabular-nums shrink-0 ml-1',
                          item.incluido ? 'text-gray-900' : 'text-gray-300',
                        )}>
                          {item.incluido ? formatBRL(item.valor) : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-5 py-3.5 border-t bg-slate-50/80 shrink-0">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Total previsto
              </span>
              <span className="text-lg font-bold tabular-nums text-gray-900">
                {formatBRL(data.receita_prevista_mes)}
              </span>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-muted-foreground">Erro ao carregar detalhamento.</p>
          </div>
        )}
      </div>
    </div>
    </ModalPortal>
  )
}

// ── FiltroPeriodo ────────────────────────────────────────────────────────────
function FiltroPeriodo({
  modo, setModo,
  mes, setMes,
  ano, setAno,
  inicio, setInicio,
  fim, setFim,
}: {
  modo: ModoFiltro; setModo: (m: ModoFiltro) => void
  mes: string; setMes: (v: string) => void
  ano: number; setAno: (v: number) => void
  inicio: string; setInicio: (v: string) => void
  fim: string; setFim: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const label = labelFiltro(modo, mes, ano, inicio, fim)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="inline-flex items-center gap-2 rounded-lg border bg-white px-3.5 py-2 text-sm font-medium shadow-sm hover:bg-muted/30 transition-colors">
          <CalendarDays className="h-4 w-4 text-[#04c2fb]" />
          <span>{label}</span>
          <ChevronDown className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform', open && 'rotate-180')} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4" align="start">
        {/* Abas de modo */}
        <div className="flex rounded-lg overflow-hidden border mb-4">
          {(['mes', 'ano', 'periodo'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setModo(m)}
              className={cn(
                'flex-1 py-1.5 text-xs font-semibold transition-colors',
                modo === m
                  ? 'bg-[#04c2fb] text-white'
                  : 'text-muted-foreground hover:bg-muted/50'
              )}
            >
              {m === 'mes' ? 'Mês' : m === 'ano' ? 'Ano' : 'Período'}
            </button>
          ))}
        </div>

        {/* Mês */}
        {modo === 'mes' && (
          <div className="flex gap-2">
            <Select
              value={mes.split('-')[1]}
              onValueChange={(v) => setMes(`${mes.split('-')[0]}-${v}`)}
            >
              <SelectTrigger className="flex-1 h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MESES_NOMES.map((nome, i) => (
                  <SelectItem key={i} value={String(i + 1).padStart(2, '0')}>
                    {nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={mes.split('-')[0]}
              onValueChange={(v) => setMes(`${v}-${mes.split('-')[1]}`)}
            >
              <SelectTrigger className="w-24 h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ANOS_PICKER.map((a) => (
                  <SelectItem key={a} value={String(a)}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Ano */}
        {modo === 'ano' && (
          <Select value={String(ano)} onValueChange={(v) => setAno(Number(v))}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ANOS_PICKER.map((a) => (
                <SelectItem key={a} value={String(a)}>{a}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Período */}
        {modo === 'periodo' && (
          <div className="space-y-2">
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">De</p>
              <div className="flex gap-2">
                <Select
                  value={inicio.split('-')[1] ?? '01'}
                  onValueChange={(v) => setInicio(`${inicio.split('-')[0] || ANO_ATUAL}-${v}`)}
                >
                  <SelectTrigger className="flex-1 h-9 text-sm">
                    <SelectValue placeholder="Mês" />
                  </SelectTrigger>
                  <SelectContent>
                    {MESES_CURTOS.map((m, i) => (
                      <SelectItem key={i} value={String(i + 1).padStart(2, '0')}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={inicio.split('-')[0] ?? String(ANO_ATUAL)}
                  onValueChange={(v) => setInicio(`${v}-${inicio.split('-')[1] || '01'}`)}
                >
                  <SelectTrigger className="w-24 h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ANOS_PICKER.map((a) => (
                      <SelectItem key={a} value={String(a)}>{a}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Até</p>
              <div className="flex gap-2">
                <Select
                  value={fim.split('-')[1] ?? '12'}
                  onValueChange={(v) => setFim(`${fim.split('-')[0] || ANO_ATUAL}-${v}`)}
                >
                  <SelectTrigger className="flex-1 h-9 text-sm">
                    <SelectValue placeholder="Mês" />
                  </SelectTrigger>
                  <SelectContent>
                    {MESES_CURTOS.map((m, i) => (
                      <SelectItem key={i} value={String(i + 1).padStart(2, '0')}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={fim.split('-')[0] ?? String(ANO_ATUAL)}
                  onValueChange={(v) => setFim(`${v}-${fim.split('-')[1] || '12'}`)}
                >
                  <SelectTrigger className="w-24 h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ANOS_PICKER.map((a) => (
                      <SelectItem key={a} value={String(a)}>{a}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

// ── Página principal ─────────────────────────────────────────────────────────
export default function RelatoriosPage() {
  const mesAtual = useMemo(() => hojeISO().slice(0, 7), [])
  const [modoFiltro, setModoFiltro] = useState<ModoFiltro>('ano')
  const [filtroMes, setFiltroMes] = useState(mesAtual)
  const [filtroAno, setFiltroAno] = useState(ANO_ATUAL)
  const [filtroInicio, setFiltroInicio] = useState(`${ANO_ATUAL - 1}-01`)
  const [filtroFim, setFiltroFim] = useState(mesAtual)
  const [pacienteId, setPacienteId] = useState<string | null>(null)
  const [pacienteNome, setPacienteNome] = useState('')

  // Filtros derivados para os gráficos históricos
  const filtros = useMemo<FiltrosHistorico>(() => {
    let data_inicio: string | undefined
    let data_fim: string | undefined
    if (modoFiltro === 'mes') {
      data_inicio = filtroMes
      data_fim = filtroMes
    } else if (modoFiltro === 'ano') {
      data_inicio = `${filtroAno}-01`
      data_fim = `${filtroAno}-12`
    } else {
      data_inicio = filtroInicio || undefined
      data_fim = filtroFim || undefined
    }
    return { data_inicio, data_fim, paciente_id: pacienteId ?? undefined }
  }, [modoFiltro, filtroMes, filtroAno, filtroInicio, filtroFim, pacienteId])

  // Modal detalhamento receita
  const [modalDetalhamento, setModalDetalhamento] = useState(false)

  // Dados
  const { data: visaoGeral, isLoading: loadingVisao } = useVisaoGeral()
  const { data: transacoesMes } = useTransacoes({ mes: mesAtual })
  const { data: historicoFin, isLoading: loadingFin } = useHistoricoFinanceiro(filtros)
  const { data: historicoAt, isLoading: loadingAt } = useHistoricoAtendimentos(filtros)
  const { data: historicoCompleto, isLoading: loadingSaz } = useHistoricoFinanceiro(
    pacienteId ? { paciente_id: pacienteId } : undefined
  )
  const { data: pacientesData } = usePacientes({ page_size: 300, ativo: true })
  const pacientes = pacientesData?.items ?? []

  const resumo = transacoesMes?.resumo

  // Dados para os gráficos
  const chartFin = useMemo(
    () =>
      historicoFin?.map((item) => ({
        mes: formatMesCurto(item.mes),
        Receita: item.receita,
        Despesa: item.despesa,
      })) ?? [],
    [historicoFin]
  )

  const chartAt = useMemo(
    () =>
      historicoAt?.map((item) => ({
        mes: formatMesCurto(item.mes),
        Realizados: item.realizados,
        Faltas: item.faltas,
      })) ?? [],
    [historicoAt]
  )

  // Sazonalidade: média de receita por mês do ano (Jan–Dez)
  const sazonalidade = useMemo(() => {
    if (!historicoCompleto?.length) return []
    const acc: Record<number, { total: number; count: number }> = {}
    for (const item of historicoCompleto) {
      const m = parseInt(item.mes.split('-')[1])
      if (!acc[m]) acc[m] = { total: 0, count: 0 }
      acc[m].total += item.receita
      acc[m].count += 1
    }
    return MESES_CURTOS.map((nome, idx) => {
      const d = acc[idx + 1]
      return { mes: nome, Média: d ? Math.round(d.total / d.count) : 0 }
    })
  }, [historicoCompleto])

  const melhorMesSaz = useMemo(() => {
    const comDados = sazonalidade.filter((m) => m.Média > 0)
    return comDados.length ? comDados.reduce((a, b) => (b.Média > a.Média ? b : a)) : null
  }, [sazonalidade])

  const piorMesSaz = useMemo(() => {
    const comDados = sazonalidade.filter((m) => m.Média > 0)
    return comDados.length ? comDados.reduce((a, b) => (b.Média < a.Média ? b : a)) : null
  }, [sazonalidade])

  // Taxa média de presença no período selecionado
  const taxaPresenca = useMemo(() => {
    if (!historicoAt?.length) return null
    const total = historicoAt.reduce((s, m) => s + m.total - m.cancelados, 0)
    const realizados = historicoAt.reduce((s, m) => s + m.realizados, 0)
    return total > 0 ? Math.round((realizados / total) * 100) : null
  }, [historicoAt])

  return (
    <>
    <div className="p-3 sm:p-6 space-y-6 max-w-screen-xl mx-auto">

      {/* ── Header ─────────────────────────────────────── */}
      <div
        className="rounded-2xl p-5 sm:p-8 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0094c8 0%, #04c2fb 60%, #00d5f5 100%)' }}
      >
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/10" />
          <div className="absolute bottom-0 left-1/3 w-32 h-32 rounded-full bg-white/5" />
        </div>
        <div className="relative">
          <h1 className="text-xl sm:text-2xl font-bold text-white">Relatórios</h1>
          <p className="text-white/80 text-sm mt-0.5">
            Visão completa da sua clínica: passado, presente e projeções
          </p>
        </div>
      </div>

      {/* ── Banner de revisão ───────────────────────────── */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-amber-800">
        <TriangleAlert className="h-4 w-4 shrink-0 mt-0.5 text-amber-500" />
        <p className="text-sm leading-snug">
          <span className="font-semibold">Página em fase de revisão.</span>{' '}
          Alguns dados podem não representar a realidade com total precisão.
        </p>
      </div>

      {/* ── Barra de filtros ────────────────────────────── */}
      <div className="rounded-xl border bg-card shadow-sm p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider shrink-0">
              Período
            </span>
            <FiltroPeriodo
              modo={modoFiltro} setModo={setModoFiltro}
              mes={filtroMes} setMes={setFiltroMes}
              ano={filtroAno} setAno={setFiltroAno}
              inicio={filtroInicio} setInicio={setFiltroInicio}
              fim={filtroFim} setFim={setFiltroFim}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider shrink-0">
              Paciente
            </span>
            <Select
              value={pacienteId ?? 'todos'}
              onValueChange={(v) => {
                if (v === 'todos') {
                  setPacienteId(null)
                  setPacienteNome('')
                } else {
                  const p = pacientes.find((x) => x.id === v)
                  setPacienteId(v)
                  setPacienteNome(p?.nome ?? '')
                }
              }}
            >
              <SelectTrigger className="h-9 w-full sm:w-[200px] text-sm">
                <SelectValue placeholder="Todos os pacientes" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                <SelectItem value="todos">Todos os pacientes</SelectItem>
                {pacientes.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Banner de paciente ativo */}
        {pacienteId && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-[#04c2fb]/10 border border-[#04c2fb]/30 px-3 py-1.5 text-sm text-[#0094c8] font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[#04c2fb]" />
            Filtrando por <span className="font-semibold">{pacienteNome}</span>
            <button
              onClick={() => { setPacienteId(null); setPacienteNome('') }}
              className="ml-auto text-[#04c2fb] hover:text-[#0094c8]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <p className="mt-2 text-[11px] text-muted-foreground">
          Os filtros de período e paciente se aplicam aos gráficos históricos. A seção &ldquo;Visão do Mês Atual&rdquo; mostra sempre o mês vigente da clínica inteira.
        </p>
      </div>

      {/* ── Visão do Mês Atual ──────────────────────────── */}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Visão do Mês Atual
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <MetricCard
            icon={CalendarDays}
            label="Atendimentos previstos"
            value={String(visaoGeral?.projecao_atendimentos_mes ?? '—')}
            gradFrom="#0094c8"
            gradTo="#04c2fb"
            loading={loadingVisao}
          />
          <MetricCard
            icon={TrendingUp}
            label="Receita prevista do mês"
            value={visaoGeral ? formatBRL(visaoGeral.receita_prevista_mes) : '—'}
            loading={loadingVisao}
            gradFrom="#059669"
            gradTo="#10b981"
            onInfoClick={() => setModalDetalhamento(true)}
          />
          <MetricCard
            icon={Clock}
            label="A receber"
            value={resumo ? formatBRL(resumo.a_receber) : '—'}
            sub={resumo?.atrasado ? `${formatBRL(resumo.atrasado)} em atraso` : 'sem inadimplência'}
            gradFrom="#d97706"
            gradTo="#f59e0b"
          />
          <MetricCard
            icon={Award}
            label="Melhor mês histórico"
            value={visaoGeral?.melhor_mes ? formatBRL(visaoGeral.melhor_mes.receita) : '—'}
            sub={visaoGeral?.melhor_mes ? formatMesLongo(visaoGeral.melhor_mes.mes) : 'sem histórico'}
            gradFrom="#7c3aed"
            gradTo="#8b5cf6"
            loading={loadingVisao}
          />
        </div>

        {/* Média mensal */}
        {!loadingVisao && visaoGeral && (
          <div className="mt-3 flex flex-wrap gap-3">
            <div className="rounded-lg bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground">
              Média mensal de receita:{' '}
              <span className="font-semibold text-foreground">{formatBRL(visaoGeral.media_mensal_receita)}</span>
            </div>
            <div className="rounded-lg bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground">
              Média mensal de atendimentos:{' '}
              <span className="font-semibold text-foreground">{visaoGeral.media_mensal_atendimentos.toFixed(0)}</span>
            </div>
            {visaoGeral.pior_mes && (
              <div className="rounded-lg bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground">
                Mês de menor receita:{' '}
                <span className="font-semibold text-foreground">
                  {formatMesLongo(visaoGeral.pior_mes.mes)} ({formatBRL(visaoGeral.pior_mes.receita)})
                </span>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── Histórico Financeiro ───────────────────────── */}
      <section>
        <div className="rounded-xl border bg-card shadow-sm p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Histórico Financeiro
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Receitas e despesas mês a mês
              </p>
            </div>
            {/* Legenda */}
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#04c2fb]" />
                Receita
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#f43f5e]" />
                Despesa
              </span>
            </div>
          </div>

          {loadingFin ? (
            <ChartSkeleton />
          ) : !chartFin.length ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chartFin} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gReceita" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#04c2fb" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#04c2fb" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gDespesa" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.22} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f4f8" />
                <XAxis
                  dataKey="mes"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tickFormatter={formatBRLAbrev}
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={52}
                />
                <Tooltip content={<ChartTooltipBRL />} />
                <Area
                  type="monotone"
                  dataKey="Receita"
                  stroke="#04c2fb"
                  strokeWidth={2}
                  fill="url(#gReceita)"
                  dot={false}
                  activeDot={{ r: 4, fill: '#04c2fb' }}
                />
                <Area
                  type="monotone"
                  dataKey="Despesa"
                  stroke="#f43f5e"
                  strokeWidth={2}
                  fill="url(#gDespesa)"
                  dot={false}
                  activeDot={{ r: 4, fill: '#f43f5e' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      {/* ── Histórico de Atendimentos ──────────────────── */}
      <section>
        <div className="rounded-xl border bg-card shadow-sm p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Histórico de Atendimentos
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Realizados e faltas por mês
              </p>
            </div>
            <div className="flex items-center gap-4">
              {taxaPresenca !== null && (
                <div className="text-xs bg-[#04c2fb]/10 text-[#0094c8] font-semibold px-2.5 py-1 rounded-full border border-[#04c2fb]/20">
                  {taxaPresenca}% presença
                </div>
              )}
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-[#04c2fb]" />
                  Realizados
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-[#f59e0b]" />
                  Faltas
                </span>
              </div>
            </div>
          </div>

          {loadingAt ? (
            <ChartSkeleton />
          ) : !chartAt.length ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartAt} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barGap={3}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f4f8" />
                <XAxis
                  dataKey="mes"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                  width={32}
                />
                <Tooltip content={<ChartTooltipNum />} />
                <Bar dataKey="Realizados" fill="#04c2fb" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Faltas" fill="#f59e0b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      {/* ── Sazonalidade ────────────────────────────────── */}
      <section>
        <div className="rounded-xl border bg-card shadow-sm p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-5">
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Sazonalidade
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Receita média por mês do ano — usa todo o histórico disponível
              </p>
            </div>
            {/* Insights */}
            {(melhorMesSaz || piorMesSaz) && (
              <div className="flex flex-wrap gap-2 shrink-0">
                {melhorMesSaz && (
                  <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-700">
                    <TrendingUp className="h-3.5 w-3.5" />
                    {melhorMesSaz.mes} — melhor mês típico
                  </div>
                )}
                {piorMesSaz && (
                  <div className="flex items-center gap-1.5 rounded-full bg-rose-50 border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600">
                    <TrendingDown className="h-3.5 w-3.5" />
                    {piorMesSaz.mes} — mês mais fraco
                  </div>
                )}
              </div>
            )}
          </div>

          {loadingSaz ? (
            <ChartSkeleton />
          ) : !sazonalidade.some((m) => m.Média > 0) ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={sazonalidade} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gSaz" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#04c2fb" stopOpacity={1} />
                    <stop offset="100%" stopColor="#0094c8" stopOpacity={0.8} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f4f8" />
                <XAxis
                  dataKey="mes"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tickFormatter={formatBRLAbrev}
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={52}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null
                    return (
                      <div className="rounded-xl border bg-white p-3 shadow-lg text-xs">
                        <p className="font-semibold text-slate-700 mb-1">{label}</p>
                        <p className="text-muted-foreground">
                          Média:{' '}
                          <span className="font-semibold text-foreground tabular-nums">
                            {formatBRL(payload[0].value as number)}
                          </span>
                        </p>
                      </div>
                    )
                  }}
                />
                <Bar
                  dataKey="Média"
                  fill="url(#gSaz)"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

    </div>

    {/* Modal detalhamento da receita prevista */}
    {modalDetalhamento && (
      <ModalDetalhamentoReceita onClose={() => setModalDetalhamento(false)} />
    )}
    </>
  )
}
