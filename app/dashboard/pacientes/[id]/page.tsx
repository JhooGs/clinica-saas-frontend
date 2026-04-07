'use client'

import { useState, useMemo, Fragment } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { usePaciente, useAtualizarPaciente } from '@/hooks/use-pacientes'
import {
  ArrowLeft, User, CheckCircle2, XCircle,
  Pencil, Save, Hash, Activity,
  ChevronDown, ChevronUp, FileText, ExternalLink, CreditCard,
  Package, CalendarDays, Check, Ban, Receipt, Repeat2,
  Clock, X, Sparkles, PowerOff, CalendarRange, Loader2,
} from 'lucide-react'
import { cn, extractTiptapText } from '@/lib/utils'
import { usePacotes, useTiposSessao, useSalvarPlanoAtendimento } from '@/hooks/use-planos'
import { useAgendamentos, useGerarAgendamentosRecorrentes } from '@/hooks/use-agenda'
import type { AgendamentoComSource } from '@/lib/google-calendar'
import { ConfirmDiscard } from '@/components/confirm-discard'
import { DatePicker } from '@/components/ui/date-picker'
import { ModalHorarioRecorrente } from '@/components/modal-horario-recorrente'
import { toast } from 'sonner'
import type { Pacote, TipoSessao } from '@/lib/types/planos'

/* ── Types ─────────────────────────────────────────── */

type Recorrencia = 'semanal' | 'quinzenal' | 'mensal'

type ModoCobranca = 'por_atendimento' | 'mensal'

type SlotAgendamento = {
  diaSemana?: number   // 0=Dom 1=Seg…6=Sáb (semanal e quinzenal)
  diaMes?: number      // 1-31 (mensal)
  horario: string      // "HH:MM"
}

type AgendaRecorrente = {
  slots: SlotAgendamento[]
}

type PlanoAtendimento = {
  pacoteId: string | null
  recorrencia: Recorrencia | null
  vezesPorSemana: number | null
  cobranca: ModoCobranca | null
  agenda: AgendaRecorrente | null
  sessoEmGrupo: boolean
  vigenciaInicio?: string | null  // ISO YYYY-MM-DD, exclusivo do Pacote Gratuito
  vigenciaFim?: string | null     // ISO YYYY-MM-DD, exclusivo do Pacote Gratuito
}

const RECORRENCIAS: { id: Recorrencia; label: string; desc: string }[] = [
  { id: 'semanal',   label: 'Semanal',   desc: 'Por semana'        },
  { id: 'quinzenal', label: 'Quinzenal', desc: 'A cada 2 semanas'  },
  { id: 'mensal',    label: 'Mensal',    desc: '1× por mês'        },
]

const VEZES_POR_SEMANA = [1, 2, 3, 4, 5]

const DIAS_SEMANA = [
  { id: 1, label: 'Seg', nome: 'Segunda-feira'  },
  { id: 2, label: 'Ter', nome: 'Terça-feira'    },
  { id: 3, label: 'Qua', nome: 'Quarta-feira'   },
  { id: 4, label: 'Qui', nome: 'Quinta-feira'   },
  { id: 5, label: 'Sex', nome: 'Sexta-feira'    },
  { id: 6, label: 'Sáb', nome: 'Sábado'         },
  { id: 0, label: 'Dom', nome: 'Domingo'         },
]


function isoToBR(iso: string | null | undefined): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function todayIso(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatarAgenda(agenda: AgendaRecorrente | null, recorrencia: Recorrencia | null): string {
  if (!agenda || agenda.slots.length === 0) return ''
  if (recorrencia === 'mensal') {
    const s = agenda.slots[0]
    return `Dia ${s.diaMes} às ${s.horario}`
  }
  const ordem = [1, 2, 3, 4, 5, 6, 0]
  return agenda.slots
    .slice()
    .sort((a, b) => ordem.indexOf(a.diaSemana ?? 0) - ordem.indexOf(b.diaSemana ?? 0))
    .map(s => {
      const d = DIAS_SEMANA.find(d => d.id === s.diaSemana)
      return `${d?.label ?? '?'} ${s.horario}`
    })
    .join(' · ')
}

const MODOS_COBRANCA: {
  id: ModoCobranca
  label: string
  tagPreco: (valor: string) => string   // ex: "R$ 1.800 / sessão"
  descInclusos: string                  // o que acontece com tipos do plano
  descForaDoPlan: string                // o que acontece com tipos fora do plano
  icon: typeof Receipt
  cor: string
  corBg: string
  corBorder: string
  corActive: string
  corTag: string                        // cor do badge de preço
}[] = [
  {
    id: 'por_atendimento',
    label: 'Por sessão realizada',
    tagPreco: v => `R$ ${v} / sessão`,
    descInclusos: 'Cada sessão do plano é cobrada por este valor, independente do tipo.',
    descForaDoPlan: 'Tipos fora do plano são cobrados pelo valor individual definido em Tipos de Atendimento.',
    icon: Receipt,
    cor: 'text-emerald-600',
    corBg: 'bg-emerald-50',
    corBorder: 'border-emerald-200',
    corActive: 'border-emerald-400 bg-emerald-50',
    corTag: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
  {
    id: 'mensal',
    label: 'Mensalidade',
    tagPreco: v => `R$ ${v} / mês`,
    descInclusos: 'Todos os tipos do plano estão inclusos. Cobrado 1× por mês, independente de quantas sessões ocorreram.',
    descForaDoPlan: 'Tipos fora do plano são cobrados separadamente pelo valor individual.',
    icon: Repeat2,
    cor: 'text-violet-600',
    corBg: 'bg-violet-50',
    corBorder: 'border-violet-200',
    corActive: 'border-violet-400 bg-violet-50',
    corTag: 'bg-violet-100 text-violet-700 border-violet-200',
  },
]

function descRecorrencia(recorrencia: Recorrencia | null, vezesPorSemana: number | null): string {
  if (!recorrencia) return '—'
  if (recorrencia === 'semanal') {
    const v = vezesPorSemana ?? 1
    return `${v}× por semana`
  }
  return RECORRENCIAS.find(r => r.id === recorrencia)?.desc ?? recorrencia
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

type PacienteCompleto = {
  id: string  // UUID
  ativo: boolean
  nome: string
  dataNascimento: string
  responsavel: string
  dataAnamnese: string
  dataInicio: string
  dataFim: string | null
  totalSessoes: number
  presencas: number
  faltas: number
  plano: PlanoAtendimento
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

/* ── Mapper API → PacienteCompleto ────────────────── */

function _isoToBrFmt(iso: string | null | undefined): string {
  if (!iso) return '-'
  const clean = (iso as string).split('T')[0]
  const [y, m, d] = clean.split('-')
  return `${d}/${m}/${y}`
}

const _PLANO_VAZIO: PlanoAtendimento = {
  pacoteId: null,
  recorrencia: null,
  vezesPorSemana: null,
  cobranca: null,
  agenda: null,
  sessoEmGrupo: false,
}

function apiParaCompleto(p: import('@/types').Paciente): PacienteCompleto {
  const extras = (p.dados_extras ?? {}) as Record<string, unknown>
  return {
    id: String(p.id),
    ativo: p.ativo,
    nome: p.nome,
    dataNascimento: _isoToBrFmt(p.data_nascimento),
    responsavel: (extras.responsavel as string) || '-',
    dataAnamnese: _isoToBrFmt(extras.data_anamnese as string | undefined),
    dataInicio: _isoToBrFmt(extras.data_inicio as string | undefined),
    dataFim: null,
    totalSessoes: 0,  // será preenchido via API de registros
    presencas: 0,
    faltas: 0,
    plano: (p.plano_atendimento as PlanoAtendimento | null) ?? (extras.plano as PlanoAtendimento | null) ?? _PLANO_VAZIO,
  }
}

/* ── Info Item (view mode) ────────────────────────── */




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

function CardPlano({
  planoInicial,
  onSalvar,
  pacienteId,
  pacienteNome,
  pacienteAtivo,
  pacotesDisponiveis,
  tiposDisponiveis,
}: {
  planoInicial: PlanoAtendimento
  onSalvar: (novoPlano: PlanoAtendimento) => void
  pacienteId: string  // UUID
  pacienteNome: string
  pacienteAtivo: boolean
  pacotesDisponiveis: Pacote[]
  tiposDisponiveis: TipoSessao[]
}) {
  const router = useRouter()
  const [editando, setEditando] = useState(false)
  const [form, setForm] = useState<PlanoAtendimento>(planoInicial)
  const [modalHorarioAberto, setModalHorarioAberto] = useState(false)
  const [confirmarNavPlanos, setConfirmarNavPlanos] = useState(false)
  const gerarRecorrentes = useGerarAgendamentosRecorrentes()

  // Agendamentos reais das próximas 8 semanas para o modal de horário
  const hoje = new Date()
  const data_inicio = hoje.toISOString().slice(0, 10)
  const data_fim = new Date(hoje.getTime() + 56 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const { data: agendamentosData } = useAgendamentos({ data_inicio, data_fim })
  const agendamentosBase: AgendamentoComSource[] = (agendamentosData?.items ?? []).map(ag => ({
    id: ag.id,
    paciente: ag.paciente_nome ?? '',
    paciente_id: ag.paciente_id,
    pacientes: ag.pacientes_ids ? [ag.paciente_nome ?? ''] : undefined,
    pacientes_ids: ag.pacientes_ids?.map(String),
    tipo: ag.tipo_sessao,
    data: ag.data,
    horario: ag.horario,
    horarioFim: ag.horario_fim,
    source: 'clinitra' as const,
  }))

  function planoFoiAlterado(): boolean {
    return JSON.stringify(form) !== JSON.stringify(planoInicial)
  }

  function handleNavPlanos() {
    if (editando && planoFoiAlterado()) {
      setConfirmarNavPlanos(true)
    } else {
      router.push('/dashboard/planos')
    }
  }

  const pacoteSelecionado = pacotesDisponiveis.find(p => p.id === planoInicial.pacoteId) ?? null
  const recorrenciaSelecionada = RECORRENCIAS.find(r => r.id === planoInicial.recorrencia) ?? null
  const cobrancaSelecionada = MODOS_COBRANCA.find(c => c.id === planoInicial.cobranca) ?? null
  const descRec = descRecorrencia(planoInicial.recorrencia, planoInicial.vezesPorSemana)

  function nomeTipo(tipoSessaoId: string): string {
    return tiposDisponiveis.find(t => t.id === tipoSessaoId)?.nome ?? tipoSessaoId
  }

  // Detecta conflito de horário entre slots do mesmo plano (dois slots com mesmo horário)
  const temConflitoHorario = (() => {
    const slots = form.agenda?.slots ?? []
    const horarios = slots.map(s => s.horario).filter(Boolean)
    return new Set(horarios).size < horarios.length
  })()

  async function salvar() {
    if (temConflitoHorario) {
      toast.error('Conflito de horário', { description: 'Dois slots não podem ter o mesmo horário. Ajuste antes de salvar.' })
      return
    }
    onSalvar(form)
    setEditando(false)

    // Gerar sessões recorrentes no backend (substitui localStorage)
    if (form.agenda && form.recorrencia && form.agenda.slots.length > 0) {
      try {
        const result = await gerarRecorrentes.mutateAsync({
          paciente_id: pacienteId,
          recorrencia: form.recorrencia,
          vezes_por_semana: form.vezesPorSemana,
          sessao_em_grupo: form.sessoEmGrupo,
          tipo_sessao: form.sessoEmGrupo ? 'Sessão em grupo' : 'Sessão',
          slots: form.agenda.slots.map(s => ({
            dia_semana: s.diaSemana,
            dia_mes: s.diaMes,
            horario: s.horario,
          })),
        })
        const bloqueantes = result.conflitos.filter(c => c.motivo.startsWith('Conflito'))
        if (result.criados > 0 && bloqueantes.length === 0) {
          toast.success('Plano salvo', {
            description: `${result.criados} sessão(ões) agendada(s) para as próximas 8 semanas.`,
          })
        } else if (result.criados > 0) {
          toast.success('Plano salvo', {
            description: `${result.criados} sessão(ões) agendada(s). ${bloqueantes.length} conflito(s) ignorado(s).`,
          })
        } else {
          toast.success('Plano salvo', { description: 'Nenhuma sessão gerada — todos os horários conflitam.' })
        }
      } catch {
        toast.error('Erro ao gerar agenda', {
          description: 'O plano foi salvo, mas não foi possível gerar as sessões. Tente novamente.',
        })
      }
    } else {
      toast.success('Plano salvo', { description: 'Alterações salvas com sucesso.' })
    }
  }

  function cancelar() {
    setForm(planoInicial)
    setEditando(false)
  }

  return (
    <>
    {confirmarNavPlanos && (
      <ConfirmDiscard
        onConfirmar={() => {
          setConfirmarNavPlanos(false)
          router.push('/dashboard/planos')
        }}
        onCancelar={() => setConfirmarNavPlanos(false)}
      />
    )}
    <div className={cn(
      'rounded-xl border bg-card shadow-sm transition-all duration-300',
      !pacienteAtivo && 'opacity-60',
    )}>
      {/* Banner inativo */}
      {!pacienteAtivo && (
        <div className="flex items-center gap-2.5 rounded-t-xl border-b border-gray-200 bg-gray-100/80 px-4 sm:px-5 py-2.5">
          <PowerOff className="h-3.5 w-3.5 text-gray-400 shrink-0" />
          <p className="text-xs font-medium text-gray-500">
            Paciente inativo · plano suspenso
          </p>
        </div>
      )}

      {/* Header */}
      <div className="p-4 sm:p-5 border-b flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={cn(
            'rounded-lg p-2 shrink-0 transition-colors',
            pacienteAtivo ? 'bg-[#04c2fb]/10' : 'bg-gray-100',
          )}>
            <CreditCard className={cn('h-4 w-4', pacienteAtivo ? 'text-[#04c2fb]' : 'text-gray-400')} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold">Plano de atendimento</p>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {editando
                ? 'Selecione o pacote e a recorrência'
                : pacoteSelecionado
                  ? `${pacoteSelecionado.nome} · ${descRec}`
                  : 'Consultas pontuais'
              }
            </p>
          </div>
        </div>

        {!editando ? (
          <button
            disabled={!pacienteAtivo}
            onClick={() => {
              const f = { ...planoInicial }
              // Inicializa slots se recorrência definida mas agenda ainda não foi configurada
              if (f.pacoteId && f.recorrencia && (!f.agenda || f.agenda.slots.length === 0)) {
                const numSlots = f.recorrencia === 'semanal' ? (f.vezesPorSemana ?? 1) : 1
                f.agenda = {
                  slots: Array.from({ length: numSlots }, () =>
                    f.recorrencia === 'mensal'
                      ? { diaMes: 10, horario: '08:00' }
                      : { diaSemana: 1, horario: '08:00' }
                  ),
                }
              }
              setForm(f)
              setEditando(true)
            }}
            className={cn(
              'group/edit shrink-0 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 border',
              pacienteAtivo
                ? 'text-muted-foreground hover:bg-[#04c2fb]/5 hover:text-[#04c2fb] hover:border-[#04c2fb]/30'
                : 'text-gray-300 border-gray-200 cursor-not-allowed',
            )}
          >
            <Pencil className="h-3.5 w-3.5 transition-transform duration-200 group-hover/edit:-rotate-12 group-hover/edit:scale-110" /> Editar
          </button>
        ) : (
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={cancelar} className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors border">
              Cancelar
            </button>
            <button
              onClick={salvar}
              disabled={temConflitoHorario}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-white transition-colors',
                temConflitoHorario ? 'opacity-40 cursor-not-allowed' : 'hover:brightness-110',
              )}
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
          <div className="space-y-5">

            {/* Seleção de pacote */}
            <div className="space-y-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Pacote
              </p>

              {/* Opção: Nenhum plano */}
              <button
                type="button"
                onClick={() => setForm({ pacoteId: null, recorrencia: null, vezesPorSemana: null, cobranca: null, agenda: null, sessoEmGrupo: false })}
                className={cn(
                  'w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all',
                  form.pacoteId === null
                    ? 'border-slate-400 bg-slate-50'
                    : 'border-gray-200 bg-white/50 hover:border-gray-300',
                )}
              >
                <div className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors',
                  form.pacoteId === null ? 'bg-slate-200' : 'bg-gray-100',
                )}>
                  <Ban className="h-4 w-4 text-slate-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={cn(
                    'text-sm font-medium',
                    form.pacoteId === null ? 'text-slate-800' : 'text-gray-500',
                  )}>
                    Nenhum plano ativo
                  </p>
                  <p className="text-xs text-muted-foreground">Consultas pontuais, sem pacote associado</p>
                </div>
                {form.pacoteId === null && (
                  <Check className="h-4 w-4 text-slate-600 shrink-0" />
                )}
              </button>

              {/* Pacotes disponíveis */}
              {pacotesDisponiveis.map(pacote => {
                const selecionado = form.pacoteId === pacote.id
                return (
                  <button
                    key={pacote.id}
                    type="button"
                    onClick={() => setForm(prev => ({
                      ...prev,
                      pacoteId: pacote.id,
                      vigenciaInicio: pacote.sistema ? (prev.vigenciaInicio ?? todayIso()) : null,
                      vigenciaFim:    pacote.sistema ? (prev.vigenciaFim ?? null) : null,
                    }))}
                    className={cn(
                      'w-full flex items-start gap-3 rounded-xl border px-4 py-3 text-left transition-all',
                      selecionado
                        ? 'border-[#04c2fb]/40 bg-[#04c2fb]/5'
                        : 'border-gray-200 bg-white/50 hover:border-gray-300',
                    )}
                  >
                    <div className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg mt-0.5 transition-all',
                    )}
                      style={selecionado
                        ? { background: 'linear-gradient(135deg, #0094c8 0%, #04c2fb 60%, #00d5f5 100%)' }
                        : { background: '#f1f5f9' }
                      }
                    >
                      <Package className={cn('h-4 w-4', selecionado ? 'text-white' : 'text-gray-400')} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className={cn(
                          'text-sm font-medium',
                          selecionado ? 'text-gray-800' : 'text-gray-500',
                        )}>
                          {pacote.nome}
                        </p>
                        {(pacote.valor || pacote.sistema) && (
                          <span className="text-xs font-semibold text-emerald-600">R$ {pacote.valor || '0,00'}</span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {pacote.sessoes.map(s => (
                          <span key={s.tipoSessaoId} className="inline-flex items-center gap-1 rounded-md bg-[#04c2fb]/8 border border-[#04c2fb]/15 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                            <span className="h-1 w-1 rounded-full bg-[#04c2fb] shrink-0" />
                            {nomeTipo(s.tipoSessaoId)}
                          </span>
                        ))}
                      </div>
                    </div>
                    {selecionado && (
                      <Check className="h-4 w-4 text-[#04c2fb] shrink-0 mt-0.5" />
                    )}
                  </button>
                )
              })}
            </div>

            {/* Vigência do plano gratuito */}
            {form.pacoteId != null && form.pacoteId === pacotesDisponiveis.find(p => p.sistema)?.id && (
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <CalendarRange className="h-3.5 w-3.5 text-violet-500 shrink-0" />
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Vigência do plano gratuito
                  </p>
                </div>
                <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-4 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        Início
                      </label>
                      <DatePicker
                        value={form.vigenciaInicio ?? ''}
                        onChange={v => setForm(prev => ({ ...prev, vigenciaInicio: v || null }))}
                        placeholder="Selecionar início"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        Fim <span className="text-muted-foreground font-normal normal-case">(opcional)</span>
                      </label>
                      <DatePicker
                        value={form.vigenciaFim ?? ''}
                        onChange={v => setForm(prev => ({ ...prev, vigenciaFim: v || null }))}
                        placeholder="Selecionar fim"
                      />
                    </div>
                  </div>
                  <div className="flex items-start gap-2 pt-0.5">
                    <CalendarRange className="h-3.5 w-3.5 text-violet-400 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-violet-700 leading-relaxed">
                      O plano gratuito ficará ativo para este paciente dentro deste período.
                      Sem data de fim, permanece aberto indefinidamente.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Seleção de recorrência (só quando há pacote) */}
            {form.pacoteId !== null && (
              <div className="space-y-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Recorrência
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {RECORRENCIAS.map(rec => {
                    const ativo = form.recorrencia === rec.id
                    return (
                      <button
                        key={rec.id}
                        type="button"
                        onClick={() => setForm(prev => {
                          const numSlots = rec.id === 'semanal' ? (prev.vezesPorSemana ?? 1) : 1
                          const mkSlot = (i: number): SlotAgendamento =>
                            rec.id === 'mensal'
                              ? { diaMes: prev.agenda?.slots[i]?.diaMes ?? 10, horario: prev.agenda?.slots[i]?.horario ?? '08:00' }
                              : { diaSemana: prev.agenda?.slots[i]?.diaSemana ?? (i + 1), horario: prev.agenda?.slots[i]?.horario ?? '08:00' }
                          return {
                            ...prev,
                            recorrencia: rec.id,
                            vezesPorSemana: rec.id === 'semanal' ? (prev.vezesPorSemana ?? 1) : null,
                            agenda: { slots: Array.from({ length: numSlots }, (_, i) => mkSlot(i)) },
                          }
                        })}
                        className={cn(
                          'flex flex-col items-center gap-1 rounded-xl border px-3 py-3 text-center transition-all',
                          ativo
                            ? 'border-[#04c2fb]/40 bg-[#04c2fb]/5'
                            : 'border-gray-200 bg-white/50 hover:border-gray-300',
                        )}
                      >
                        <CalendarDays className={cn('h-4 w-4', ativo ? 'text-[#04c2fb]' : 'text-gray-400')} />
                        <p className={cn('text-xs font-semibold', ativo ? 'text-gray-800' : 'text-gray-500')}>
                          {rec.label}
                        </p>
                        <p className="text-[10px] text-muted-foreground leading-tight">{rec.desc}</p>
                      </button>
                    )
                  })}
                </div>

                {/* Sub-seletor de vezes por semana */}
                {form.recorrencia === 'semanal' && (
                  <div className="rounded-xl border border-[#04c2fb]/20 bg-[#04c2fb]/5 px-4 py-3 space-y-2.5">
                    <p className="text-xs font-medium text-gray-600">Quantas vezes por semana?</p>
                    <div className="flex gap-2">
                      {VEZES_POR_SEMANA.map(v => {
                        const ativo = (form.vezesPorSemana ?? 1) === v
                        return (
                          <button
                            key={v}
                            type="button"
                            onClick={() => setForm(prev => {
                              const currentSlots = prev.agenda?.slots ?? []
                              const newSlots = v > currentSlots.length
                                ? [...currentSlots, ...Array.from({ length: v - currentSlots.length }, (_, i) => ({ diaSemana: (currentSlots.length + i + 1) % 7 || 1, horario: '08:00' }))]
                                : currentSlots.slice(0, v)
                              return { ...prev, vezesPorSemana: v, agenda: { slots: newSlots } }
                            })}
                            className={cn(
                              'flex-1 rounded-lg border py-2 text-sm font-semibold transition-all',
                              ativo
                                ? 'border-[#04c2fb] bg-[#04c2fb] text-white shadow-sm'
                                : 'border-gray-200 bg-white text-gray-500 hover:border-[#04c2fb]/40 hover:text-[#04c2fb]',
                            )}
                          >
                            {v}×
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

            )}

            {/* Horário de atendimento (só quando há recorrência) */}
            {form.pacoteId !== null && form.recorrencia !== null && (
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Horário de Atendimento
                </p>

                {/* ── Painel de status do horário ── */}
                <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50/70 px-3 py-2.5 min-h-[2.5rem]">
                  <Clock className="h-3.5 w-3.5 text-[#04c2fb] shrink-0" />
                  {form.agenda && form.agenda.slots.length > 0 ? (
                    <>
                      <span className="flex-1 text-xs font-medium text-gray-800 truncate">
                        {formatarAgenda(form.agenda, form.recorrencia)}
                      </span>
                      {form.sessoEmGrupo && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-200 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 shrink-0">
                          <Sparkles className="h-2.5 w-2.5" /> Em grupo
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground">Sem horário definido</span>
                  )}
                </div>

                {/* ── Botão de configurar em destaque ── */}
                <button
                  type="button"
                  onClick={() => setModalHorarioAberto(true)}
                  className="w-full flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-[#04c2fb]/20 hover:brightness-105 active:scale-[0.99] transition-all"
                  style={{ background: 'linear-gradient(135deg, #0094c8 0%, #04c2fb 60%, #00d5f5 100%)' }}
                >
                  <CalendarDays className="h-4 w-4" />
                  Configurar horário
                </button>

                {temConflitoHorario && (
                  <p className="text-xs text-red-500 font-medium flex items-center gap-1.5">
                    <X className="h-3.5 w-3.5 shrink-0" />
                    Dois slots com o mesmo horário. Ajuste antes de salvar.
                  </p>
                )}
              </div>
            )}

            {/* Seleção de cobrança (só quando há pacote) */}
            {form.pacoteId !== null && (() => {
              const pacoteForm = pacotesDisponiveis.find(p => p.id === form.pacoteId) ?? null
              return (
                <div className="space-y-2.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Cobrança
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {MODOS_COBRANCA.map(modo => {
                      const ativo = form.cobranca === modo.id
                      const Icon = modo.icon
                      return (
                        <button
                          key={modo.id}
                          type="button"
                          onClick={() => setForm(prev => ({ ...prev, cobranca: modo.id }))}
                          className={cn(
                            'relative flex flex-col gap-2.5 rounded-xl border-2 px-4 py-4 text-left transition-all duration-200',
                            ativo ? modo.corActive : 'border-gray-200 bg-white/60 hover:border-gray-300',
                          )}
                        >
                          {/* Check mark quando ativo */}
                          {ativo && (
                            <span className={cn(
                              'absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full',
                              modo.id === 'por_atendimento' ? 'bg-emerald-500' : 'bg-violet-500',
                            )}>
                              <Check className="h-3 w-3 text-white" />
                            </span>
                          )}

                          {/* Ícone + label + badge de preço */}
                          <div className="flex items-center gap-2.5 pr-6">
                            <div className={cn(
                              'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors',
                              ativo ? cn(modo.corBg, modo.corBorder) : 'bg-gray-50 border-gray-200',
                            )}>
                              <Icon className={cn('h-4 w-4', ativo ? modo.cor : 'text-gray-400')} />
                            </div>
                            <div className="min-w-0">
                              <p className={cn(
                                'text-sm font-semibold leading-tight',
                                ativo ? 'text-gray-900' : 'text-gray-600',
                              )}>
                                {modo.label}
                              </p>
                              {pacoteForm && (
                                <span className={cn(
                                  'inline-block mt-0.5 rounded-md border px-1.5 py-0.5 text-[10px] font-bold leading-none',
                                  ativo ? modo.corTag : 'bg-gray-100 text-gray-500 border-gray-200',
                                )}>
                                  {modo.tagPreco(pacoteForm.valor || '0,00')}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Bloco: inclusos no plano */}
                          <div className="flex items-start gap-2 rounded-lg bg-white/70 border border-gray-100 px-3 py-2">
                            <span className="text-emerald-500 text-[13px] leading-snug shrink-0 mt-px">✓</span>
                            <p className="text-[11px] text-gray-600 leading-snug">
                              <span className="font-semibold text-gray-700">Tipos do plano</span>
                              {': '}{modo.descInclusos}
                            </p>
                          </div>

                          {/* Bloco: fora do plano */}
                          <div className="flex items-start gap-2 rounded-lg bg-amber-50/60 border border-amber-100 px-3 py-2">
                            <span className="text-amber-400 text-[13px] leading-snug shrink-0 mt-px">⚡</span>
                            <p className="text-[11px] text-amber-800 leading-snug">
                              {modo.id === 'por_atendimento' ? (
                                <>
                                  Tipos fora do plano são cobrados pelo valor individual definido em{' '}
                                  <span
                                    role="button"
                                    tabIndex={0}
                                    onClick={e => { e.stopPropagation(); handleNavPlanos() }}
                                    onKeyDown={e => e.key === 'Enter' && handleNavPlanos()}
                                    className="font-semibold underline underline-offset-2 decoration-amber-500 hover:text-amber-900 transition-colors cursor-pointer"
                                  >
                                    Tipos de Atendimento
                                  </span>.
                                </>
                              ) : (
                                modo.descForaDoPlan
                              )}
                            </p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })()}
          </div>

        ) : (
          /* ── View mode ── */
          pacoteSelecionado ? (
            <div className="space-y-4">
              {/* Pacote */}
              <div className="flex items-start gap-3 rounded-xl border border-[#04c2fb]/20 bg-[#04c2fb]/5 px-4 py-3.5">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg mt-0.5"
                  style={{ background: 'linear-gradient(135deg, #0094c8 0%, #04c2fb 60%, #00d5f5 100%)' }}
                >
                  <Package className="h-4 w-4 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-gray-800">{pacoteSelecionado.nome}</p>
                    {(pacoteSelecionado.valor || pacoteSelecionado.sistema) && (
                      <span className="text-sm font-bold text-emerald-600">R$ {pacoteSelecionado.valor || '0,00'}</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {pacoteSelecionado.sessoes.map(s => (
                      <span key={s.tipoSessaoId} className="inline-flex items-center gap-1 rounded-md bg-white border border-[#04c2fb]/20 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#04c2fb] shrink-0" />
                        {nomeTipo(s.tipoSessaoId)}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Vigência do plano gratuito — view mode */}
              {pacoteSelecionado.sistema && (planoInicial.vigenciaInicio || planoInicial.vigenciaFim) && (
                <div className="flex items-center gap-3 rounded-xl border border-violet-200 bg-violet-50/50 px-4 py-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-100">
                    <CalendarRange className="h-4 w-4 text-violet-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Vigência</p>
                    <p className="text-sm font-semibold text-violet-700 mt-0.5">
                      {planoInicial.vigenciaInicio && planoInicial.vigenciaFim
                        ? `${isoToBR(planoInicial.vigenciaInicio)} a ${isoToBR(planoInicial.vigenciaFim)}`
                        : planoInicial.vigenciaInicio
                          ? `A partir de ${isoToBR(planoInicial.vigenciaInicio)}`
                          : `Até ${isoToBR(planoInicial.vigenciaFim)}`
                      }
                    </p>
                  </div>
                </div>
              )}

              {/* Recorrência + Cobrança lado a lado */}
              {(recorrenciaSelecionada || cobrancaSelecionada) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Recorrência */}
                  {recorrenciaSelecionada && (
                    <div className="flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50/60 px-4 py-3.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                        <CalendarDays className="h-4 w-4 text-slate-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Recorrência</p>
                        <p className="text-sm font-semibold text-gray-800 mt-0.5">{recorrenciaSelecionada.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{descRec}</p>
                        {planoInicial.agenda && planoInicial.agenda.slots.length > 0 && (
                          <p className="text-xs text-[#04c2fb] font-medium mt-1 flex items-center gap-1 flex-wrap">
                            <Clock className="h-3 w-3 shrink-0" />
                            {formatarAgenda(planoInicial.agenda, planoInicial.recorrencia)}
                          </p>
                        )}
                        {planoInicial.sessoEmGrupo && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-200 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 mt-1.5">
                            <Sparkles className="h-2.5 w-2.5" /> Em grupo
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Cobrança */}
                  {cobrancaSelecionada && (() => {
                    const Icon = cobrancaSelecionada.icon
                    return (
                      <div className={cn(
                        'flex flex-col gap-2.5 rounded-xl border px-4 py-3.5',
                        cobrancaSelecionada.corBg, cobrancaSelecionada.corBorder,
                      )}>
                        {/* Header */}
                        <div className="flex items-center gap-2.5">
                          <div className={cn(
                            'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border',
                            cobrancaSelecionada.corBg, cobrancaSelecionada.corBorder,
                          )}>
                            <Icon className={cn('h-3.5 w-3.5', cobrancaSelecionada.cor)} />
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground leading-none">Cobrança</p>
                            <p className={cn('text-sm font-bold leading-tight mt-0.5', cobrancaSelecionada.cor)}>
                              {cobrancaSelecionada.label}
                            </p>
                          </div>
                          {pacoteSelecionado && (
                            <span className={cn(
                              'ml-auto shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-bold',
                              cobrancaSelecionada.corTag,
                            )}>
                              {cobrancaSelecionada.tagPreco(pacoteSelecionado.valor || '0,00')}
                            </span>
                          )}
                        </div>
                        {/* Resumo inclusos */}
                        <div className="flex items-start gap-1.5">
                          <span className="text-emerald-500 text-[12px] leading-snug shrink-0">✓</span>
                          <p className="text-[11px] text-gray-600 leading-snug">{cobrancaSelecionada.descInclusos}</p>
                        </div>
                        {/* Resumo fora do plano */}
                        <div className="flex items-start gap-1.5">
                          <span className="text-amber-400 text-[12px] leading-snug shrink-0">⚡</span>
                          <p className="text-[11px] text-gray-500 leading-snug">
                            {cobrancaSelecionada.id === 'por_atendimento' ? (
                              <>
                                Tipos fora do plano são cobrados pelo valor individual definido em{' '}
                                <span
                                  role="button"
                                  tabIndex={0}
                                  onClick={handleNavPlanos}
                                  onKeyDown={e => e.key === 'Enter' && handleNavPlanos()}
                                  className="font-semibold underline underline-offset-2 decoration-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
                                >
                                  Tipos de Atendimento
                                </span>.
                              </>
                            ) : (
                              cobrancaSelecionada.descForaDoPlan
                            )}
                          </p>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/40 px-4 py-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                <Ban className="h-4 w-4 text-slate-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700">Consultas pontuais</p>
                <p className="text-xs text-muted-foreground mt-0.5">Sem pacote ativo associado ao paciente</p>
              </div>
            </div>
          )
        )}
      </div>

      {/* Modal de horário recorrente */}
      {modalHorarioAberto && (
        <ModalHorarioRecorrente
          open={modalHorarioAberto}
          onClose={() => setModalHorarioAberto(false)}
          onConfirmar={(slots, sessoEmGrupo) => {
            setForm(prev => ({ ...prev, agenda: { slots }, sessoEmGrupo }))
            setModalHorarioAberto(false)
          }}
          pacienteId={pacienteId}
          pacienteNome={pacienteNome}
          planoAtual={form}
          agendamentosBase={agendamentosBase}
        />
      )}
    </div>
    </>
  )
}

/* ── Conteúdo principal (separado para evitar hooks condicionais) ── */

function PacienteDetalheContent({ pacienteInicial }: { pacienteInicial: PacienteCompleto }) {
  const router = useRouter()
  const atualizarPaciente = useAtualizarPaciente()

  const [paciente, setPaciente] = useState(pacienteInicial)
  const [plano, setPlano] = useState<PlanoAtendimento>(pacienteInicial.plano)
  const salvarPlanoMutation = useSalvarPlanoAtendimento(pacienteInicial.id)
  const { data: pacotesData } = usePacotes()
  const { data: tiposData } = useTiposSessao()
  const pacotesDisponiveis = pacotesData?.items ?? []
  const tiposDisponiveis = tiposData?.items ?? []
  const [editando, setEditando] = useState(false)
  const [confirmarDescartar, setConfirmarDescartar] = useState<'cancelar' | 'voltar' | null>(null)
  const [form, setForm] = useState({
    nome: paciente.nome,
    responsavel: paciente.responsavel,
    dataNascimento: brToIso(paciente.dataNascimento),
    dataAnamnese: brToIso(paciente.dataAnamnese),
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
      return next
    })
  }

  function salvarEdicao() {
    atualizarPaciente.mutate(
      {
        id: paciente.id,
        payload: {
          nome: form.nome,
          ativo: form.ativo,
          dados_extras: {
            ...(form.responsavel && { responsavel: form.responsavel }),
            ...(form.dataAnamnese && { data_anamnese: form.dataAnamnese }),
            ...(form.dataInicio && { data_inicio: form.dataInicio }),
          },
        },
      },
      {
        onSuccess: () => {
          setPaciente(prev => ({
            ...prev,
            nome: form.nome,
            responsavel: form.responsavel,
            dataNascimento: form.dataNascimento ? isoToBr(form.dataNascimento) : prev.dataNascimento,
            dataAnamnese: form.dataAnamnese ? isoToBr(form.dataAnamnese) : prev.dataAnamnese,
            dataInicio: form.dataInicio ? isoToBr(form.dataInicio) : prev.dataInicio,
            dataFim: !form.ativo && form.dataFim ? isoToBr(form.dataFim) : null,
            ativo: form.ativo,
          }))
          setEditando(false)
          toast.success('Alterações salvas', { description: 'Os dados do paciente foram atualizados.' })
        },
        onError: (err) => {
          toast.error('Erro ao salvar', { description: err.message })
        },
      }
    )
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

  function toggleAtivo() {
    const novoAtivo = !paciente.ativo
    const hoje = new Date()
    const dataFimStr = `${String(hoje.getDate()).padStart(2, '0')}/${String(hoje.getMonth() + 1).padStart(2, '0')}/${hoje.getFullYear()}`
    atualizarPaciente.mutate(
      { id: paciente.id, payload: { ativo: novoAtivo } },
      {
        onSuccess: () => {
          setPaciente(prev => ({
            ...prev,
            ativo: novoAtivo,
            dataFim: novoAtivo ? null : dataFimStr,
          }))
          setForm(prev => ({
            ...prev,
            ativo: novoAtivo,
            dataFim: novoAtivo ? '' : brToIso(dataFimStr),
          }))
          if (novoAtivo) {
            toast.success('Paciente reativado', { description: 'O paciente foi marcado como ativo.' })
          } else {
            toast.info('Paciente desativado', { description: 'O plano de atendimento foi suspenso.' })
          }
        },
        onError: (err) => {
          toast.error('Erro ao alterar status', { description: err.message })
        },
      }
    )
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
      <div className="flex items-center gap-3 sm:gap-4">
        <button
          onClick={tentarVoltar}
          className="rounded-xl p-2.5 text-muted-foreground hover:bg-muted transition-colors shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-semibold tracking-tight truncate">{paciente.nome}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {idade} anos · Responsável: {paciente.responsavel}
          </p>
        </div>

        {/* Toggle ativo / inativo */}
        <button
          type="button"
          onClick={toggleAtivo}
          title={paciente.ativo ? 'Desativar paciente' : 'Reativar paciente'}
          className="group flex items-center gap-2.5 rounded-xl border px-3 py-2 transition-all duration-200 shrink-0 hover:shadow-sm"
          style={{
            borderColor: paciente.ativo ? 'rgba(34,197,94,0.3)' : 'rgba(156,163,175,0.4)',
            backgroundColor: paciente.ativo ? 'rgba(240,253,244,0.8)' : 'rgba(249,250,251,0.8)',
          }}
        >
          {/* Pill switch */}
          <div
            className={cn(
              'relative h-5 w-9 rounded-full transition-colors duration-300 shrink-0',
              paciente.ativo ? 'bg-emerald-500' : 'bg-gray-300',
            )}
          >
            <span
              className={cn(
                'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-md transition-all duration-300 ease-in-out',
                paciente.ativo ? 'left-[18px]' : 'left-0.5',
              )}
            />
          </div>
          <span className={cn(
            'text-xs font-semibold tracking-wide transition-colors duration-200 select-none',
            paciente.ativo ? 'text-emerald-700' : 'text-gray-400',
          )}>
            {paciente.ativo ? 'Ativo' : 'Inativo'}
          </span>
        </button>
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
                  <label className="text-xs font-medium text-muted-foreground">Data de Início</label>
                  <DatePicker value={form.dataInicio} onChange={v => f('dataInicio', v)} placeholder="Selecionar data" />
                </div>
              </div>
            </div>
          ) : (
            <div className="p-5">
              <div className="grid grid-cols-1 gap-y-4 sm:grid-cols-2 sm:gap-y-5 sm:gap-x-6">
                <InfoItem label="Responsável" value={paciente.responsavel} />
                <InfoItem label="Data de Nascimento" value={`${paciente.dataNascimento} (${idade} anos)`} />
                <InfoItem label="Data da Anamnese" value={paciente.dataAnamnese} />
                <InfoItem label="Data de Início" value={paciente.dataInicio} />
                {paciente.dataFim && <InfoItem label="Data de Fim" value={paciente.dataFim} />}
              </div>
            </div>
          )}
        </div>

      {/* ── Plano ────────────────────────────────── */}
      <CardPlano
        planoInicial={plano}
        onSalvar={(novoPlano) => {
          salvarPlanoMutation.mutate(novoPlano, {
            onSuccess: () => setPlano(novoPlano),
            onError: (err) => toast.error('Erro ao salvar plano', { description: err.message }),
          })
        }}
        pacienteId={paciente.id}
        pacienteNome={paciente.nome}
        pacienteAtivo={paciente.ativo}
        pacotesDisponiveis={pacotesDisponiveis}
        tiposDisponiveis={tiposDisponiveis}
      />

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
  const id = params.id as string

  const { data: apiPaciente, isLoading, isError } = usePaciente(id)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 gap-2 text-muted-foreground max-w-7xl mx-auto">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Carregando paciente...</span>
      </div>
    )
  }

  if (isError || !apiPaciente) {
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

  return <PacienteDetalheContent pacienteInicial={apiParaCompleto(apiPaciente)} />
}
