'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import {
  X, ChevronDown, CalendarDays, Clock, Sparkles,
  AlertTriangle, Users, User, Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ModalPortal } from '@/components/modal-portal'
import type { AgendamentoComSource } from '@/lib/google-calendar'

// ── Tipos locais ─────────────────────────────────────────────────────────────

type Recorrencia = 'semanal' | 'quinzenal' | 'mensal'

type SlotAgendamento = {
  diaSemana?: number
  diaMes?: number
  horario: string
}

type PlanoAtendimento = {
  pacoteId: string | null
  recorrencia: Recorrencia | null
  vezesPorSemana: number | null
  cobranca: string | null
  agenda: { slots: SlotAgendamento[] } | null
  atendimentoEmGrupo: boolean
}

// ── Constantes ───────────────────────────────────────────────────────────────

const DIAS_SEMANA = [
  { id: 1, label: 'Seg', nome: 'Segunda' },
  { id: 2, label: 'Ter', nome: 'Terça'   },
  { id: 3, label: 'Qua', nome: 'Quarta'  },
  { id: 4, label: 'Qui', nome: 'Quinta'  },
  { id: 5, label: 'Sex', nome: 'Sexta'   },
  { id: 6, label: 'Sáb', nome: 'Sábado'  },
  { id: 0, label: 'Dom', nome: 'Domingo' },
]

const HORAS_CLINICA = Array.from({ length: 15 }, (_, i) => i + 7)
const MINUTOS = ['00', '15', '30', '45']

const DIAS_MES = Array.from({ length: 28 }, (_, i) => i + 1)

// ── Helpers ──────────────────────────────────────────────────────────────────

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// "Lorenzo de Souza Bueno" → "Lorenzo B."
function abreviarNome(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean)
  if (partes.length <= 1) return nome
  return `${partes[0]} ${partes[partes.length - 1][0]}.`
}

function formatDiaSemana(dow: number): string {
  const nomes = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
  return nomes[dow] ?? ''
}

function formatDataCurta(iso: string): string {
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}

// Adiciona N minutos a um horário HH:MM, retornando HH:MM
function addMinutes(horario: string, min: number): string {
  const [hh, mm] = horario.split(':').map(Number)
  const total = hh * 60 + mm + min
  return `${Math.floor(total / 60).toString().padStart(2, '0')}:${(total % 60).toString().padStart(2, '0')}`
}

// Verifica overlap de intervalos fechados; sem horarioFim assume +60min
function overlapHorario(
  a: { horario: string; horarioFim?: string },
  b: { horario: string; horarioFim?: string },
): boolean {
  const fimA = a.horarioFim ?? addMinutes(a.horario, 60)
  const fimB = b.horarioFim ?? addMinutes(b.horario, 60)
  return a.horario < fimB && b.horario < fimA
}

// Gera array de 14 dias a partir de hoje
function gerar14Dias(): { iso: string; dow: number; diaMes: number; label: string; ehHoje: boolean }[] {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const hojeISO = toISO(hoje)
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date(hoje)
    d.setDate(hoje.getDate() + i)
    const iso = toISO(d)
    return {
      iso,
      dow: d.getDay(),
      diaMes: d.getDate(),
      label: `${formatDiaSemana(d.getDay())} ${formatDataCurta(iso)}`,
      ehHoje: iso === hojeISO,
    }
  })
}

// Retorna true se o horário de hoje já passou
function horarioJaPassou(isoData: string, horario: string): boolean {
  const hojeISO = toISO(new Date())
  if (isoData !== hojeISO) return false
  const agora = new Date()
  const [hh, mm] = horario.split(':').map(Number)
  return agora.getHours() > hh || (agora.getHours() === hh && agora.getMinutes() >= mm)
}

// ── StyledSelect local ───────────────────────────────────────────────────────

type SelectOption = { value: string; label: string; disabled?: boolean }

function StyledSelect({
  value, onChange, options, placeholder,
}: {
  value: string
  onChange: (v: string) => void
  options: SelectOption[]
  placeholder?: string
}) {
  const [aberto, setAberto] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const sel = options.find(o => o.value === value)

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setAberto(p => !p)}
        className={cn(
          'flex items-center justify-between gap-1.5 rounded-lg border bg-background px-2.5 py-1.5 text-sm font-medium transition-all focus:outline-none min-w-[4.5rem]',
          aberto ? 'border-[#04c2fb]/60 ring-2 ring-[#04c2fb]/20' : 'border-gray-200 hover:border-gray-300',
        )}
      >
        <span className="text-gray-800 truncate">{sel?.label ?? placeholder ?? value}</span>
        <ChevronDown className={cn(
          'h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform duration-200',
          aberto && 'rotate-180',
        )} />
      </button>
      {aberto && (
        <div
          className="absolute left-0 top-full z-30 mt-1 rounded-lg border border-gray-200 shadow-lg overflow-hidden min-w-full"
          style={{ backdropFilter: 'blur(12px)', backgroundColor: 'rgba(255,255,255,0.97)' }}
        >
          <div className="py-1 max-h-52 overflow-y-auto">
            {options.map(opt => {
              const ativo = opt.value === value
              return (
                <button
                  key={opt.value}
                  type="button"
                  disabled={opt.disabled}
                  onMouseDown={e => {
                    e.preventDefault()
                    if (!opt.disabled) { onChange(opt.value); setAberto(false) }
                  }}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors',
                    opt.disabled
                      ? 'text-gray-300 cursor-not-allowed'
                      : ativo
                        ? 'bg-[#04c2fb]/8 text-[#04c2fb] font-semibold'
                        : 'text-gray-700 hover:bg-gray-50',
                  )}
                >
                  <span className={cn(
                    'h-1.5 w-1.5 rounded-full shrink-0',
                    opt.disabled ? 'bg-gray-200' : ativo ? 'bg-[#04c2fb] scale-125' : 'bg-transparent',
                  )} />
                  <span className="flex-1">{opt.label}</span>
                  {opt.disabled && <span className="text-[10px] text-gray-300 font-normal">ocupado</span>}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Props do modal ───────────────────────────────────────────────────────────

interface ModalHorarioRecorrenteProps {
  open: boolean
  onClose: () => void
  onConfirmar: (slots: SlotAgendamento[], atendimentoEmGrupo: boolean) => void
  pacienteId?: string  // UUID
  pacienteNome: string
  planoAtual: PlanoAtendimento
  agendamentosBase: AgendamentoComSource[]
}

// ── Componente principal ─────────────────────────────────────────────────────

export function ModalHorarioRecorrente({
  open, onClose, onConfirmar,
  pacienteId,
  pacienteNome,
  planoAtual, agendamentosBase,
}: ModalHorarioRecorrenteProps) {
  const recorrencia = planoAtual.recorrencia
  const vezesPorSemana = planoAtual.vezesPorSemana ?? 1

  // Inicializa slots a partir do plano atual, ou cria defaults
  function initSlots(): SlotAgendamento[] {
    const existing = planoAtual.agenda?.slots ?? []
    if (recorrencia === 'mensal') {
      return [existing[0] ?? { diaMes: 10, horario: '08:00' }]
    }
    const numSlots = recorrencia === 'semanal' ? vezesPorSemana : 1
    return Array.from({ length: numSlots }, (_, i) =>
      existing[i] ?? { diaSemana: (i + 1) % 7 || 1, horario: '08:00' }
    )
  }

  const [slots, setSlots] = useState<SlotAgendamento[]>(initSlots)
  const [atendimentoEmGrupo, setAtendimentoEmGrupo] = useState(planoAtual.atendimentoEmGrupo)
  const [gruposExpandidos, setGruposExpandidos] = useState<Set<string>>(new Set())

  // Reinicia quando o modal abre + limpa cache legado de localStorage
  useEffect(() => {
    if (open) {
      setSlots(initSlots())
      setAtendimentoEmGrupo(planoAtual.atendimentoEmGrupo)
      // Limpa o cache antigo de atendimentos recorrentes (substituído pela API)
      try { localStorage.removeItem('clinitra_agenda_recorrentes') } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const dias14 = useMemo(() => gerar14Dias(), [])

  // Todos os agendamentos existentes (API real passados como prop pelo parent)
  const agendamentosExistentes = useMemo(() => {
    const todos: {
      data: string
      horario: string
      horarioFim?: string
      paciente: string
      paciente_id?: string  // UUID do paciente (para detectar conflito com o próprio paciente)
      pacientes: string[]   // lista de nomes (>1 quando for grupo)
      ehGrupo: boolean
    }[] = []

    // Agendamentos da API real (passados como prop pelo parent)
    for (const ag of agendamentosBase) {
      if (ag.status === 'cancelado') continue
      const ehGrupo = ag.tipo === 'Atendimento em grupo'
      todos.push({
        data: ag.data,
        horario: ag.horario,
        horarioFim: ag.horarioFim,
        paciente: ag.paciente,
        paciente_id: ag.paciente_id,
        // Copia o array para não mutar dados externos ao adicionar pacientes de grupo
        pacientes: ag.pacientes && ag.pacientes.length > 0
          ? [...ag.pacientes]
          : [ag.paciente],
        ehGrupo,
      })
    }

    return todos
  }, [agendamentosBase])

  // Mapa data → lista de slots ocupados
  const ocupadosPorData = useMemo(() => {
    const mapa = new Map<string, {
      horario: string
      horarioFim?: string
      ehGrupo: boolean
      paciente: string
      paciente_id?: string
      pacientes: string[]
    }[]>()
    for (const ag of agendamentosExistentes) {
      if (!mapa.has(ag.data)) mapa.set(ag.data, [])
      mapa.get(ag.data)!.push({
        horario: ag.horario,
        horarioFim: ag.horarioFim,
        ehGrupo: ag.ehGrupo,
        paciente: ag.paciente,
        paciente_id: ag.paciente_id,
        pacientes: ag.pacientes,
      })
    }
    return mapa
  }, [agendamentosExistentes])

  // Gera as sessões candidatas baseadas nos slots e recorrência
  const sessoesCandidatas = useMemo(() => {
    const candidatas: { data: string; horario: string }[] = []
    if (!recorrencia) return candidatas
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
    for (let d = 0; d < 14; d++) {
      const data = new Date(hoje); data.setDate(hoje.getDate() + d)
      const dow = data.getDay()
      const diaMes = data.getDate()
      const dataISO = toISO(data)
      const semanaIdx = Math.floor(d / 7)

      for (const slot of slots) {
        if (!slot.horario) continue
        let incluir = false
        if (recorrencia === 'semanal' && slot.diaSemana === dow) incluir = true
        else if (recorrencia === 'quinzenal' && slot.diaSemana === dow && semanaIdx % 2 === 0) incluir = true
        else if (recorrencia === 'mensal' && slot.diaMes === diaMes) incluir = true
        if (incluir) candidatas.push({ data: dataISO, horario: slot.horario })
      }
    }
    return candidatas
  }, [recorrencia, slots])

  // Conflitos detectados: para cada candidata, verificar se há ocupação
  type ConflitoCandidato = {
    data: string; horario: string
    tipo: 'bloqueante' | 'aviso' | 'mesmo-paciente'
    // aviso = grupo+grupo; mesmo-paciente = é o próprio horário antigo do paciente
    pacienteConflito: string  // nome(s) do paciente que já ocupa o horário
  }

  const conflitos = useMemo((): ConflitoCandidato[] => {
    return sessoesCandidatas.flatMap<ConflitoCandidato>(cand => {
      const ocupados = ocupadosPorData.get(cand.data) ?? []
      const colisao = ocupados.find(o => overlapHorario(
        { horario: cand.horario },
        { horario: o.horario, horarioFim: o.horarioFim },
      ))
      if (!colisao) return []
      const nomesColisao = colisao.pacientes && colisao.pacientes.length > 1
        ? colisao.pacientes.join(', ')
        : colisao.paciente
      // Colisão com o próprio agendamento do paciente que está sendo reconfigurado
      if (pacienteId && colisao.paciente_id === pacienteId) {
        return [{ data: cand.data, horario: cand.horario, tipo: 'mesmo-paciente' as const, pacienteConflito: nomesColisao }]
      }
      const tipo: ConflitoCandidato['tipo'] = atendimentoEmGrupo && colisao.ehGrupo ? 'aviso' : 'bloqueante'
      return [{ data: cand.data, horario: cand.horario, tipo, pacienteConflito: nomesColisao }]
    })
  }, [sessoesCandidatas, ocupadosPorData, atendimentoEmGrupo, pacienteId])

  const temBloqueante = conflitos.some(c => c.tipo === 'bloqueante')
  // Desabilita quando toda a agenda configurada já é o horário atual do paciente
  // E o tipo de sessão (grupo vs individual) também não mudou
  const semAlteracao = sessoesCandidatas.length > 0
    && conflitos.length === sessoesCandidatas.length
    && conflitos.every(c => c.tipo === 'mesmo-paciente')
    && atendimentoEmGrupo === planoAtual.atendimentoEmGrupo

  // Mapa de horários bloqueados por dia da semana (para desabilitar no StyledSelect)
  // Não bloqueia o próprio horário do paciente que está sendo reconfigurado
  const horariosBloqueadosPorDia = useMemo(() => {
    const mapa = new Map<number, Set<string>>()
    for (const ag of agendamentosExistentes) {
      if (pacienteId && ag.paciente_id === pacienteId) continue
      const [y, m, d] = ag.data.split('-').map(Number)
      const dow = new Date(y, m - 1, d).getDay()
      if (!mapa.has(dow)) mapa.set(dow, new Set())
      // Só bloqueia se o conflito seria bloqueante (solo ou meu tipo é solo)
      if (!atendimentoEmGrupo || !ag.ehGrupo) {
        mapa.get(dow)!.add(ag.horario)
      }
    }
    return mapa
  }, [agendamentosExistentes, atendimentoEmGrupo, pacienteId])

  const horariosBloqueadosPorDiaMes = useMemo(() => {
    const mapa = new Map<number, Set<string>>()
    for (const ag of agendamentosExistentes) {
      if (pacienteId && ag.paciente_id === pacienteId) continue
      const dm = parseInt(ag.data.split('-')[2])
      if (!mapa.has(dm)) mapa.set(dm, new Set())
      if (!atendimentoEmGrupo || !ag.ehGrupo) {
        mapa.get(dm)!.add(ag.horario)
      }
    }
    return mapa
  }, [agendamentosExistentes, atendimentoEmGrupo, pacienteId])

  function getBloqueados(slot: SlotAgendamento): Set<string> {
    if (recorrencia === 'mensal' && slot.diaMes !== undefined) {
      return horariosBloqueadosPorDiaMes.get(slot.diaMes) ?? new Set()
    }
    if (slot.diaSemana !== undefined) {
      return horariosBloqueadosPorDia.get(slot.diaSemana) ?? new Set()
    }
    return new Set()
  }

  function updateSlot(i: number, patch: Partial<SlotAgendamento>) {
    setSlots(prev => prev.map((s, si) => si === i ? { ...s, ...patch } : s))
  }

  if (!open) return null

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
        style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        onClick={e => { if (e.target === e.currentTarget) onClose() }}
      >
        <div
          className="w-full max-w-3xl rounded-2xl border border-white/30 shadow-2xl overflow-hidden flex flex-col"
          style={{
            backdropFilter: 'blur(20px)',
            backgroundColor: 'rgba(255,255,255,0.98)',
            maxHeight: '90vh',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="rounded-lg p-2 bg-[#04c2fb]/10 shrink-0">
                <CalendarDays className="h-4 w-4 text-[#04c2fb]" />
              </div>
              <div>
                <p className="text-sm font-semibold">Configurar horário recorrente</p>
                <p className="text-xs text-muted-foreground">{pacienteNome}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-gray-100 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <div className="flex flex-col md:flex-row overflow-auto flex-1 min-h-0">

            {/* ── Painel esquerdo: mini agenda 14 dias ── */}
            <div className="md:w-64 shrink-0 border-b md:border-b-0 md:border-r bg-gray-50/40 p-4 overflow-y-auto">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                Agenda · próximas 2 semanas
              </p>
              <div className="space-y-4">
                {dias14.map(dia => {
                  const agendamentos = (ocupadosPorData.get(dia.iso) ?? [])
                    .slice()
                    .sort((a, b) => a.horario.localeCompare(b.horario))

                  if (agendamentos.length === 0) return null

                  return (
                    <div key={dia.iso}>
                      {/* Cabeçalho do dia */}
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <p className={cn(
                          'text-[10px] font-bold uppercase tracking-widest',
                          dia.ehHoje ? 'text-[#04c2fb]' : 'text-muted-foreground',
                        )}>
                          {dia.label}
                        </p>
                        {dia.ehHoje && (
                          <span className="text-[9px] font-bold bg-[#04c2fb]/10 text-[#04c2fb] rounded-full px-1.5 py-0.5 leading-none uppercase tracking-wide">
                            Hoje
                          </span>
                        )}
                      </div>

                      <div className="space-y-1">
                        {agendamentos.map((ag, idx) => {
                          const chaveExpand = `${dia.iso}_${ag.horario}_${idx}`
                          const expandido = gruposExpandidos.has(chaveExpand)
                          const LIMITE = 2
                          const passado = horarioJaPassou(dia.iso, ag.horario)

                          if (ag.ehGrupo) {
                            const visiveis = expandido ? ag.pacientes : ag.pacientes.slice(0, LIMITE)
                            const resto = ag.pacientes.length - LIMITE

                            return (
                              <div key={idx} className={cn(
                                'rounded-lg border overflow-hidden transition-opacity',
                                passado
                                  ? 'border-emerald-100 bg-emerald-50/40 opacity-50'
                                  : 'border-emerald-200 bg-emerald-50',
                              )}>
                                {/* Cabeçalho do grupo */}
                                <div className="flex items-center gap-2 px-2.5 py-1.5">
                                  <Users className={cn('h-3 w-3 shrink-0', passado ? 'text-emerald-400' : 'text-emerald-600')} />
                                  <span className={cn('text-[11px] font-bold tabular-nums', passado ? 'text-emerald-500' : 'text-emerald-700')}>
                                    {ag.horario}
                                  </span>
                                  <span className={cn(
                                    'ml-auto text-[10px] font-semibold rounded-full px-1.5 py-0.5 leading-none whitespace-nowrap',
                                    passado ? 'text-emerald-500 bg-emerald-100/60' : 'text-emerald-600 bg-emerald-100',
                                  )}>
                                    {ag.pacientes.length} pac.
                                  </span>
                                </div>

                                {/* Lista de participantes */}
                                <div className="border-t border-emerald-100 px-2.5 py-1.5 space-y-0.5">
                                  {visiveis.map((nome, ni) => (
                                    <div key={ni} className="flex items-center gap-1.5">
                                      <span className={cn('h-1 w-1 rounded-full shrink-0', passado ? 'bg-emerald-300' : 'bg-emerald-400')} />
                                      <span className={cn('text-[11px] font-medium leading-snug', passado ? 'text-emerald-600' : 'text-emerald-800')}>
                                        {abreviarNome(nome)}
                                      </span>
                                    </div>
                                  ))}

                                  {ag.pacientes.length > LIMITE && (
                                    <button
                                      type="button"
                                      onClick={() => setGruposExpandidos(prev => {
                                        const novo = new Set(prev)
                                        if (expandido) novo.delete(chaveExpand)
                                        else novo.add(chaveExpand)
                                        return novo
                                      })}
                                      className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 hover:text-emerald-800 transition-colors mt-0.5"
                                    >
                                      <ChevronDown className={cn(
                                        'h-3 w-3 transition-transform duration-200',
                                        expandido && 'rotate-180',
                                      )} />
                                      {expandido ? 'Mostrar menos' : `+${resto} participante${resto > 1 ? 's' : ''}`}
                                    </button>
                                  )}
                                </div>
                              </div>
                            )
                          }

                          // Sessão individual
                          return (
                            <div key={idx} className={cn(
                              'flex items-center gap-2 rounded-lg px-2.5 py-1.5 border transition-opacity',
                              passado
                                ? 'bg-gray-50 border-gray-100 opacity-50'
                                : 'bg-white border-gray-100',
                            )}>
                              <User className={cn('h-3 w-3 shrink-0', passado ? 'text-gray-300' : 'text-slate-400')} />
                              <span className={cn('text-[11px] font-bold tabular-nums shrink-0', passado ? 'text-gray-400' : 'text-gray-500')}>
                                {ag.horario}
                              </span>
                              <span className={cn('text-[11px] truncate', passado ? 'text-gray-400' : 'text-gray-700')}>
                                {abreviarNome(ag.paciente)}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}

                {dias14.every(dia => (ocupadosPorData.get(dia.iso) ?? []).length === 0) && (
                  <p className="text-xs text-muted-foreground/60 text-center py-6">
                    Nenhum agendamento nos próximos 14 dias
                  </p>
                )}
              </div>
            </div>

            {/* ── Painel direito: formulário ── */}
            <div className="flex-1 p-4 sm:p-5 overflow-y-auto">
              <div className="space-y-5">

                {/* Info recorrência */}
                <div className="rounded-xl border border-[#04c2fb]/20 bg-[#04c2fb]/5 px-4 py-3">
                  <p className="text-xs font-medium text-gray-600">
                    Configurando horários para recorrência{' '}
                    <span className="font-semibold text-[#04c2fb]">
                      {recorrencia === 'semanal'
                        ? `semanal (${vezesPorSemana}× por semana)`
                        : recorrencia === 'quinzenal'
                          ? 'quinzenal'
                          : 'mensal'}
                    </span>
                  </p>
                </div>

                {/* Slots de horário */}
                <div className="space-y-3">
                  {slots.map((slot, i) => {
                    const bloqueados = getBloqueados(slot)
                    // Só bloqueia horários de outros slots que têm o mesmo dia (semana ou mês).
                    // Slots em dias diferentes podem reutilizar o mesmo horário sem conflito.
                    const emOutroSlot = new Set(
                      slots
                        .filter((s, si) => {
                          if (si === i) return false
                          if (recorrencia === 'mensal') return s.diaMes === slot.diaMes
                          return s.diaSemana === slot.diaSemana
                        })
                        .map(s => s.horario)
                    )
                    const horarioAtual = slot.horario ?? '08:00'
                    const hora = horarioAtual.split(':')[0] ?? '08'
                    const min = horarioAtual.split(':')[1] ?? '00'

                    const isHoraBloqueada = (h: string) =>
                      MINUTOS.every(m => bloqueados.has(`${h}:${m}`) || emOutroSlot.has(`${h}:${m}`))
                    const isMinBloqueado = (m: string) =>
                      bloqueados.has(`${hora}:${m}`) || emOutroSlot.has(`${hora}:${m}`)
                    const semHorario = HORAS_CLINICA.every(h => isHoraBloqueada(String(h).padStart(2, '0')))

                    // Verificar conflito desta sessão nas candidatas
                    const conflitoDeste = conflitos.find(c =>
                      sessoesCandidatas.some(cand =>
                        cand.data === c.data && cand.horario === c.horario && cand.horario === slot.horario
                      )
                    )

                    return (
                      <div
                        key={i}
                        className={cn(
                          'rounded-xl border px-3 py-3 space-y-2.5',
                          conflitoDeste?.tipo === 'bloqueante'
                            ? 'border-red-200 bg-red-50/50'
                            : conflitoDeste?.tipo === 'aviso'
                              ? 'border-amber-200 bg-amber-50/50'
                              : conflitoDeste?.tipo === 'mesmo-paciente'
                                ? 'border-blue-200 bg-blue-50/50'
                                : 'border-slate-200 bg-slate-50/50',
                        )}
                      >
                        {slots.length > 1 && (
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Atendimento {i + 1}
                          </p>
                        )}

                        {/* Dia da semana (semanal / quinzenal) */}
                        {recorrencia !== 'mensal' && (
                          <div className="flex flex-wrap gap-1.5">
                            {DIAS_SEMANA.map(dia => {
                              const ativo = slot.diaSemana === dia.id
                              return (
                                <button
                                  key={dia.id}
                                  type="button"
                                  onClick={() => {
                                    const bl = horariosBloqueadosPorDia.get(dia.id) ?? new Set<string>()
                                    let h = slot.horario ?? '08:00'
                                    if (bl.has(h)) {
                                      const livre = HORAS_CLINICA
                                        .flatMap(hh => MINUTOS.map(mm => `${String(hh).padStart(2, '0')}:${mm}`))
                                        .find(t => !bl.has(t))
                                      h = livre ?? h
                                    }
                                    updateSlot(i, { diaSemana: dia.id, horario: h })
                                  }}
                                  className={cn(
                                    'rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all border',
                                    ativo
                                      ? 'border-[#04c2fb] bg-[#04c2fb] text-white shadow-sm'
                                      : 'border-gray-200 bg-white text-gray-500 hover:border-[#04c2fb]/40 hover:text-[#04c2fb]',
                                  )}
                                >
                                  {dia.label}
                                </button>
                              )
                            })}
                          </div>
                        )}

                        {/* Dia do mês (mensal) */}
                        {recorrencia === 'mensal' && (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-muted-foreground">Todo dia</span>
                            <StyledSelect
                              value={String(slot.diaMes ?? 10)}
                              onChange={v => updateSlot(i, { diaMes: Number(v) })}
                              options={DIAS_MES.map(d => ({ value: String(d), label: String(d) }))}
                            />
                            <span className="text-xs text-muted-foreground">do mês</span>
                          </div>
                        )}

                        {/* Horário */}
                        {semHorario ? (
                          <p className="text-xs text-amber-600 font-medium flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 shrink-0" />
                            Sem horários disponíveis neste dia
                          </p>
                        ) : (
                          <div className="flex items-center gap-2 flex-wrap">
                            <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="text-xs text-muted-foreground">às</span>
                            <StyledSelect
                              value={hora}
                              onChange={h => {
                                const novoMin = bloqueados.has(`${h}:${min}`) || emOutroSlot.has(`${h}:${min}`)
                                  ? (MINUTOS.find(m => !bloqueados.has(`${h}:${m}`) && !emOutroSlot.has(`${h}:${m}`)) ?? min)
                                  : min
                                updateSlot(i, { horario: `${h}:${novoMin}` })
                              }}
                              options={HORAS_CLINICA.map(h => {
                                const hStr = String(h).padStart(2, '0')
                                return { value: hStr, label: `${hStr}h`, disabled: isHoraBloqueada(hStr) }
                              })}
                            />
                            <span className="text-xs font-bold text-muted-foreground">:</span>
                            <StyledSelect
                              value={min}
                              onChange={m => updateSlot(i, { horario: `${hora}:${m}` })}
                              options={MINUTOS.map(m => ({
                                value: m, label: m, disabled: isMinBloqueado(m),
                              }))}
                            />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Atendimento em grupo */}
                <div className="rounded-xl border border-gray-200 bg-white px-4 py-3.5">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <div className="relative mt-0.5">
                      <input
                        type="checkbox"
                        checked={atendimentoEmGrupo}
                        onChange={e => setAtendimentoEmGrupo(e.target.checked)}
                        className="sr-only"
                      />
                      <div
                        className={cn(
                          'h-4 w-4 rounded border-2 flex items-center justify-center transition-colors',
                          atendimentoEmGrupo
                            ? 'bg-emerald-500 border-emerald-500'
                            : 'bg-white border-gray-300',
                        )}
                      >
                        {atendimentoEmGrupo && <Check className="h-2.5 w-2.5 text-white" />}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-800">Atendimento em grupo</p>
                        <Users className="h-3.5 w-3.5 text-emerald-600" />
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                        Outros pacientes do grupo podem compartilhar o mesmo horário.
                        O terapeuta é responsável por confirmar que a composição do grupo está correta.
                      </p>
                    </div>
                  </label>

                  {atendimentoEmGrupo && (
                    <div className="mt-3 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 flex items-start gap-2">
                      <Sparkles className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <p className="text-[11px] text-emerald-700 leading-relaxed">
                        Com esta opção ativa, o sistema <strong>não bloqueia</strong> agendamentos
                        em cima de outros grupos, mas emite um aviso. Conflitos com atendimentos individuais
                        continuam bloqueados.
                      </p>
                    </div>
                  )}
                </div>

                {/* Alertas de conflito */}
                {conflitos.length > 0 && (
                  <div className="space-y-2">
                    {conflitos.some(c => c.tipo === 'mesmo-paciente') && (
                      <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 flex items-start gap-3">
                        <AlertTriangle className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold text-blue-700">Horário atual do paciente</p>
                          <p className="text-xs text-blue-600 mt-0.5">
                            Este já é o horário recorrente configurado para {pacienteNome}.
                          </p>
                        </div>
                      </div>
                    )}
                    {conflitos.some(c => c.tipo === 'bloqueante') && (
                      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-3">
                        <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-red-700">Conflito de horário</p>
                          {conflitos.filter(c => c.tipo === 'bloqueante').map((c, idx) => (
                            <p key={idx} className="text-xs text-red-600">
                              <span className="font-medium">{c.data.split('-').reverse().join('/')}</span>
                              {' às '}
                              <span className="font-medium">{c.horario}</span>
                              {' — '}
                              <span>{c.pacienteConflito}</span>
                            </p>
                          ))}
                          <p className="text-xs text-red-500 mt-1">Ajuste o dia ou hora antes de confirmar.</p>
                        </div>
                      </div>
                    )}
                    {conflitos.some(c => c.tipo === 'aviso') && (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3">
                        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-amber-700">Sobreposição com grupo</p>
                          {conflitos.filter(c => c.tipo === 'aviso').map((c, idx) => (
                            <p key={idx} className="text-xs text-amber-600">
                              <span className="font-medium">{c.data.split('-').reverse().join('/')}</span>
                              {' às '}
                              <span className="font-medium">{c.horario}</span>
                              {' — '}
                              <span>{c.pacienteConflito}</span>
                            </p>
                          ))}
                          <p className="text-xs text-amber-500 mt-1">O agendamento será salvo. Verifique a composição do grupo.</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-5 py-4 border-t shrink-0 bg-gray-50/80">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors border"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={temBloqueante || semAlteracao}
              onClick={() => onConfirmar(slots, atendimentoEmGrupo)}
              className={cn(
                'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors',
                (temBloqueante || semAlteracao) ? 'opacity-40 cursor-not-allowed' : 'hover:brightness-110',
              )}
              style={{ background: 'linear-gradient(135deg, #0094c8 0%, #04c2fb 60%, #00d5f5 100%)' }}
            >
              <Check className="h-4 w-4" />
              Confirmar horário
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  )
}
