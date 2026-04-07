'use client'

import { useState, useEffect, useRef, useMemo, startTransition } from 'react'
import { X, AlertTriangle, Search, Users, Info } from 'lucide-react'
import { cn, proximaHoraCheia } from '@/lib/utils'
import { DatePicker } from '@/components/ui/date-picker'
import { ModalPortal } from '@/components/modal-portal'
import type { AgendamentoComSource } from '@/lib/google-calendar'
import { usePacientes } from '@/hooks/use-pacientes'
import { useCriarAgendamento, useAtualizarAgendamento } from '@/hooks/use-agenda'
import { useTiposSessao } from '@/hooks/use-planos'
import { toast } from 'sonner'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hoje(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// Dada hora de início HH:MM, retorna início + 1h como padrão de fim
function horarioFimPadrao(inicio: string): string {
  if (!inicio) return '09:00'
  const [h, min] = inicio.split(':').map(Number)
  const fimH = (h + 1) % 24
  return `${String(fimH).padStart(2, '0')}:${String(min).padStart(2, '0')}`
}

// Detecta se o tipo está fora da lista conhecida (modo edição com tipo custom)
// lista é opcional: quando vazia, assume que o tipo é válido (dados ainda carregando)
function resolverTipoForm(tipo: string, lista: string[] = []): { tipo: string; tipoCustom: string } {
  if (lista.length === 0 || lista.includes(tipo) || tipo === '') return { tipo, tipoCustom: '' }
  return { tipo: 'Outros', tipoCustom: tipo }
}

// ─── Helper: abreviação de nome (primeiro nome + inicial do segundo) ─────────

function nomeAbreviado(nome: string): string {
  const partes = nome.trim().split(/\s+/)
  if (partes.length <= 1) return nome
  return `${partes[0]} ${partes[1][0]}.`
}

// ─── Helper: detecção de conflitos de horário ────────────────────────────────

function detectarConflitos(
  form: { data: string; horarioInicio: string; horarioFim: string; tipo?: string },
  existentes: AgendamentoComSource[],
  editandoId?: number | string
): AgendamentoComSource[] {
  if (!form.data || !form.horarioInicio || !form.horarioFim) return []

  return existentes.filter(ag => {
    // Não conflitar consigo mesmo em modo edição
    if (editandoId !== undefined && String(ag.id) === String(editandoId)) return false
    if (ag.data !== form.data) return false

    const inicioNovo = form.horarioInicio
    const fimNovo = form.horarioFim
    const inicioExist = ag.horario
    const fimExist = ag.horarioFim ?? horarioFimPadrao(ag.horario)

    // Overlap: inicioA < fimB && inicioB < fimA
    const haOverlap = inicioNovo < fimExist && inicioExist < fimNovo
    if (!haOverlap) return false

    // Grupo + grupo → não é conflito bloqueante
    const novoEhGrupo = form.tipo === 'Sessão em grupo'
    const existenteEhGrupo = ag.tipo === 'Sessão em grupo'
    if (novoEhGrupo && existenteEhGrupo) return false

    return true
  })
}

// ─── Sub-componente: confirmação de descarte ──────────────────────────────────

function ConfirmDescarte({
  onConfirmar,
  onCancelar,
}: {
  onConfirmar: () => void
  onCancelar: () => void
}) {
  return (
    <ModalPortal>
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-white/30 shadow-2xl p-6 space-y-4"
        style={{ backdropFilter: 'blur(20px)', backgroundColor: 'rgba(255,255,255,0.95)' }}
      >
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-amber-100 p-2 shrink-0">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Descartar alterações?</p>
            <p className="text-xs text-muted-foreground mt-1">
              As informações preenchidas serão perdidas e não poderão ser recuperadas.
            </p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onCancelar}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Continuar editando
          </button>
          <button
            onClick={onConfirmar}
            className="rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600 transition-colors"
          >
            Descartar
          </button>
        </div>
      </div>
    </div>
    </ModalPortal>
  )
}

type PacienteOpcao = { id: string; nome: string; ativo: boolean }

// ─── Sub-componente: seletor multi-paciente com tags ──────────────────────────

function PacienteMultiSelect({
  selecionados,
  onChange,
  hasError,
  isGrupo,
  pacientesDisponiveis,
}: {
  selecionados: PacienteOpcao[]
  onChange: (pacientes: PacienteOpcao[]) => void
  hasError: boolean
  isGrupo: boolean
  pacientesDisponiveis: PacienteOpcao[]
}) {
  const [busca, setBusca] = useState('')
  const [aberto, setAberto] = useState(false)
  const [indiceAtivo, setIndiceAtivo] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selecionadosIds = new Set(selecionados.map(p => p.id))

  const resultados = useMemo(() => {
    const termo = busca.toLowerCase().trim()
    return pacientesDisponiveis
      .filter(p => p.ativo)
      .filter(p => !selecionadosIds.has(p.id))
      .filter(p => !termo || p.nome.toLowerCase().includes(termo))
      .slice(0, 8)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca, selecionados, pacientesDisponiveis])

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    function handleClickFora(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAberto(false)
      }
    }
    document.addEventListener('mousedown', handleClickFora)
    return () => document.removeEventListener('mousedown', handleClickFora)
  }, [])

  // Reset índice ativo quando resultados mudam
  useEffect(() => {
    startTransition(() => setIndiceAtivo(0))
  }, [resultados.length])

  function adicionarPaciente(pac: PacienteOpcao) {
    if (!pac.ativo) return
    onChange([...selecionados, pac])
    setBusca('')
    setAberto(false)
    inputRef.current?.focus()
  }

  function removerPaciente(id: string) {
    onChange(selecionados.filter(p => p.id !== id))
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      setAberto(false)
      return
    }
    if (e.key === 'Backspace' && busca === '' && selecionados.length > 0) {
      removerPaciente(selecionados[selecionados.length - 1].id)
      return
    }
    if (!aberto || resultados.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setIndiceAtivo(i => (i + 1) % resultados.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setIndiceAtivo(i => (i - 1 + resultados.length) % resultados.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const pac = resultados[indiceAtivo]
      if (pac && pac.ativo) adicionarPaciente(pac)
    }
  }

  const mostraHintGrupo = isGrupo && selecionados.length < 2

  return (
    <div className="space-y-1" ref={containerRef}>
      {/* Container principal (parece um input) */}
      <div
        className={cn(
          'relative rounded-lg border bg-white/80 transition-all',
          'focus-within:ring-2',
          hasError
            ? 'border-red-300 bg-red-50/50 focus-within:ring-red-400/40'
            : 'border-gray-200 focus-within:ring-[#04c2fb]/40'
        )}
        onClick={() => inputRef.current?.focus()}
      >
        <div className="flex flex-wrap items-center gap-1.5 p-2 min-h-[38px]">
          {/* Tags dos pacientes selecionados */}
          {selecionados.map(pac => (
            <span
              key={pac.id}
              className="inline-flex items-center gap-1 rounded-full border border-[#04c2fb]/25 bg-[#04c2fb]/10 px-2.5 py-1 text-xs font-medium text-[#04c2fb] animate-in fade-in zoom-in-95 duration-150"
            >
              <span className="max-w-[140px] sm:max-w-[200px] truncate">{pac.nome}</span>
              <button
                type="button"
                onClick={e => { e.stopPropagation(); removerPaciente(pac.id) }}
                className="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-red-100 hover:text-red-500"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}

          {/* Input de busca inline */}
          <div className="relative flex-1 min-w-[120px]">
            <div className="flex items-center gap-1.5">
              <Search className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={busca}
                onChange={e => { setBusca(e.target.value); setAberto(true) }}
                onFocus={() => setAberto(true)}
                onKeyDown={handleKeyDown}
                placeholder={selecionados.length === 0 ? 'Buscar paciente...' : 'Adicionar mais...'}
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
              />
            </div>
          </div>
        </div>

        {/* Dropdown de resultados */}
        {aberto && (
          <div
            className="absolute left-0 right-0 top-full z-10 mt-1 rounded-lg border border-gray-200 shadow-lg overflow-hidden"
            style={{ backdropFilter: 'blur(12px)', backgroundColor: 'rgba(255,255,255,0.97)' }}
          >
            {resultados.length > 0 ? (
              <div className="max-h-48 overflow-y-auto py-1">
                {resultados.map((pac, i) => {
                  const inativo = !pac.ativo
                  return (
                    <button
                      key={pac.nome}
                      type="button"
                      disabled={inativo}
                      onMouseDown={e => { e.preventDefault(); if (!inativo) adicionarPaciente(pac) }}
                      onMouseEnter={() => !inativo && setIndiceAtivo(i)}
                      className={cn(
                        'w-full px-3 py-2 text-left text-sm transition-colors flex items-center justify-between gap-2',
                        inativo
                          ? 'text-gray-400 cursor-not-allowed'
                          : i === indiceAtivo
                            ? 'bg-[#04c2fb]/8 text-[#04c2fb] font-medium'
                            : 'text-gray-700 hover:bg-gray-50'
                      )}
                    >
                      <span className="truncate">{pac.nome}</span>
                      {inativo && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 border border-gray-200 px-2 py-0.5 text-[10px] font-medium text-gray-500 shrink-0">
                          Inativo
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="px-3 py-3 text-center">
                <p className="text-xs italic text-muted-foreground">Nenhum paciente encontrado</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Hint para sessão em grupo */}
      {mostraHintGrupo && (
        <div className="flex items-center gap-1.5" style={{ animation: 'slideDown 0.15s ease-out' }}>
          <Users className="h-3 w-3 text-amber-500" />
          <p className="text-xs text-amber-600">
            Sessão em grupo requer ao menos 2 pacientes
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Types ────────────────────────────────────────────────────────────────────

type FormAgendamento = {
  pacientes: PacienteOpcao[]
  tipo: string
  tipoCustom: string
  data: string
  horarioInicio: string
  horarioFim: string
  observacoes: string
}

type Props = {
  open: boolean
  onClose: () => void
  onSave: (ag: AgendamentoComSource) => void
  /** Quando presente, o modal opera em modo edição */
  agendamento?: AgendamentoComSource
  /** Agendamentos existentes para verificação de conflito de horário */
  agendamentosExistentes?: AgendamentoComSource[]
}

function formDe(ag?: AgendamentoComSource): FormAgendamento {
  if (!ag) {
    return {
      pacientes: [],
      tipo: '',
      tipoCustom: '',
      data: hoje(),
      horarioInicio: proximaHoraCheia(),
      horarioFim: horarioFimPadrao(proximaHoraCheia()),
      observacoes: '',
    }
  }
  const { tipo, tipoCustom } = resolverTipoForm(ag.tipo)
  // Em modo edição, reconstruir objetos a partir dos dados disponíveis no AgendamentoComSource
  const pacientes: PacienteOpcao[] = ag.paciente_id
    ? [{ id: ag.paciente_id, nome: ag.paciente, ativo: true }]
    : []
  return {
    pacientes,
    tipo,
    tipoCustom,
    data: ag.data,
    horarioInicio: ag.horario,
    horarioFim: ag.horarioFim ?? horarioFimPadrao(ag.horario),
    observacoes: '',
  }
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function ModalNovoAgendamento({ open, onClose, onSave, agendamento, agendamentosExistentes = [] }: Props) {
  const modoEdicao = !!agendamento
  const [form, setForm] = useState<FormAgendamento>(() => formDe(agendamento))
  const criarAgendamento = useCriarAgendamento()
  const atualizarAgendamento = useAtualizarAgendamento()
  const { data: tiposSessaoData } = useTiposSessao()
  const tiposSessao = tiposSessaoData?.items?.map(t => t.nome) ?? []
  const { data: pacientesData } = usePacientes({ ativo: true, page_size: 500 })
  const pacientesDisponiveis: PacienteOpcao[] = (pacientesData?.items ?? []).map(p => ({
    id: p.id,
    nome: p.nome,
    ativo: p.ativo,
  }))
  const [tentouSalvar, setTentouSalvar] = useState(false)
  const [confirmarSair, setConfirmarSair] = useState(false)
  const [horarioInicial, setHorarioInicial] = useState(form.horarioInicio)

  // Sincroniza o form quando o agendamento muda (ex: abrir edição de outro item)
  useEffect(() => {
    if (open) {
      const novo = formDe(agendamento)
      startTransition(() => {
        setForm(novo)
        setHorarioInicial(novo.horarioInicio)
        setTentouSalvar(false)
        setConfirmarSair(false)
      })
    }
  }, [open, agendamento])

  // Detecção de conflitos de horário (reativo a data/horário)
  // MUST be before the early return to respect Rules of Hooks
  const conflitos = useMemo(
    () => detectarConflitos(form, agendamentosExistentes, agendamento?.id),
    [form, agendamentosExistentes, agendamento?.id]
  )

  if (!open) return null

  const isGrupo = form.tipo === 'Sessão em grupo'

  function f(field: keyof FormAgendamento, value: string) {
    setForm(prev => {
      const next = { ...prev, [field]: value }
      // Ao mudar horário início, ajusta fim automaticamente se fim estava no padrão anterior
      if (field === 'horarioInicio') {
        const fimAtualEhPadrao = prev.horarioFim === horarioFimPadrao(prev.horarioInicio)
        if (fimAtualEhPadrao) next.horarioFim = horarioFimPadrao(value)
      }
      return next
    })
  }

  function setPacientes(pacientes: PacienteOpcao[]) {
    setForm(prev => ({ ...prev, pacientes }))
  }

  // Verifica se o formulário tem algum dado preenchido (para aviso ao sair)
  const temDados = modoEdicao || (
    form.pacientes.length > 0 ||
    form.tipo !== '' ||
    form.data !== hoje() ||
    form.horarioInicio !== horarioInicial ||
    form.observacoes !== ''
  )

  const minPacientes = isGrupo ? 2 : 1
  const erroPacientes = tentouSalvar && form.pacientes.length < minPacientes

  function erroVisivel(campo: 'tipo' | 'tipoCustom' | 'data' | 'horarioInicio' | 'horarioFim'): boolean {
    if (!tentouSalvar) return false
    if (campo === 'tipoCustom') return form.tipo === 'Outros' && form.tipoCustom.trim() === ''
    return (form[campo] as string).trim() === ''
  }

  const camposFaltando: string[] = tentouSalvar
    ? [
        form.pacientes.length < minPacientes
          ? (isGrupo ? 'Pacientes (mínimo 2 para grupo)' : 'Paciente')
          : null,
        form.tipo.trim() === '' ? 'Tipo de sessão' : null,
        form.tipo === 'Outros' && form.tipoCustom.trim() === '' ? 'Tipo personalizado' : null,
        form.data.trim() === '' ? 'Data' : null,
        form.horarioInicio.trim() === '' ? 'Horário de início' : null,
        form.horarioFim.trim() === '' ? 'Horário de fim' : null,
        conflitos.length > 0 ? 'Conflito de horário' : null,
      ].filter(Boolean) as string[]
    : []

  const formularioValido =
    form.pacientes.length >= minPacientes &&
    form.tipo.trim() !== '' &&
    (form.tipo !== 'Outros' || form.tipoCustom.trim() !== '') &&
    form.data.trim() !== '' &&
    form.horarioInicio.trim() !== '' &&
    form.horarioFim.trim() !== '' &&
    conflitos.length === 0

  function tentarSalvar() {
    setTentouSalvar(true)
    if (!formularioValido) return

    const tipoFinal = form.tipo === 'Outros' ? form.tipoCustom.trim() : form.tipo
    const pacienteIdPrincipal = form.pacientes[0]?.id
    if (!pacienteIdPrincipal) return

    const pacientesIds = form.pacientes.length > 1
      ? form.pacientes.map(p => p.id)
      : undefined

    if (modoEdicao && agendamento?.id) {
      // Edição: PATCH na API
      atualizarAgendamento.mutate(
        {
          id: String(agendamento.id),
          payload: {
            tipo_sessao: tipoFinal,
            data: form.data,
            horario: form.horarioInicio,
            horario_fim: form.horarioFim,
            observacao: form.observacoes || undefined,
          },
        },
        {
          onSuccess: (updated) => {
            toast.success('Agendamento atualizado', { description: `${updated.paciente_nome ?? ''} — ${updated.horario}` })
            const ag: AgendamentoComSource = {
              id: updated.id,
              paciente: updated.paciente_nome ?? pacienteIdPrincipal,
              paciente_id: updated.paciente_id,
              pacientes: form.pacientes.map(p => p.nome),
              tipo: updated.tipo_sessao,
              data: updated.data,
              horario: updated.horario,
              horarioFim: updated.horario_fim,
              source: 'clinitra',
              googleEventId: agendamento.googleEventId,
            }
            onSave(ag)
          },
          onError: (err) => {
            const msg = err.message.includes('409') ? 'Conflito de horário: já existe agendamento neste horário.' : 'Não foi possível salvar.'
            toast.error('Erro ao atualizar', { description: msg })
          },
        }
      )
    } else {
      // Criação: POST na API
      criarAgendamento.mutate(
        {
          paciente_id: pacienteIdPrincipal,
          tipo_sessao: tipoFinal,
          data: form.data,
          horario: form.horarioInicio,
          horario_fim: form.horarioFim,
          observacao: form.observacoes || undefined,
          pacientes_ids: pacientesIds,
        },
        {
          onSuccess: (created) => {
            toast.success('Agendamento criado', { description: `${created.paciente_nome ?? ''} — ${created.horario}` })
            const ag: AgendamentoComSource = {
              id: created.id,
              paciente: created.paciente_nome ?? pacienteIdPrincipal,
              paciente_id: created.paciente_id,
              pacientes: form.pacientes.map(p => p.nome),
              tipo: created.tipo_sessao,
              data: created.data,
              horario: created.horario,
              horarioFim: created.horario_fim,
              source: 'clinitra',
            }
            onSave(ag)
          },
          onError: (err) => {
            const msg = err.message.includes('409') ? 'Conflito de horário: já existe agendamento neste horário.' : 'Não foi possível salvar.'
            toast.error('Erro ao criar', { description: msg })
          },
        }
      )
    }
  }

  function tentarFechar() {
    if (temDados) setConfirmarSair(true)
    else onClose()
  }

  const inputBase = 'w-full rounded-lg border px-3 py-2 text-sm transition-all focus:outline-none focus:ring-2'
  const inputOk = 'border-gray-200 bg-white/80 focus:ring-[#04c2fb]/40'
  const inputErro = 'border-red-300 bg-red-50/50 focus:ring-red-400/40'
  const selectBase = cn(inputBase, 'appearance-none cursor-pointer')

  return (
    <ModalPortal>
      {confirmarSair && (
        <ConfirmDescarte
          onConfirmar={onClose}
          onCancelar={() => setConfirmarSair(false)}
        />
      )}

      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
        // Clique fora → nunca fecha diretamente, sempre pede confirmação
        onClick={e => { if (e.target === e.currentTarget) tentarFechar() }}
      >
        <div
          className="w-full max-w-lg rounded-2xl border border-white/30 shadow-2xl"
          style={{ backdropFilter: 'blur(20px)', backgroundColor: 'rgba(255,255,255,0.92)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold tracking-tight">
              {modoEdicao ? 'Editar Agendamento' : 'Novo Agendamento'}
            </h2>
            <button
              onClick={tentarFechar}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-gray-100 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">

            {/* Aviso alteração pontual (sessão recorrente) */}
            {agendamento?.source === 'recorrente' && (
              <div className="relative overflow-hidden rounded-xl border border-[#04c2fb]/30 bg-gradient-to-r from-[#04c2fb]/8 to-[#04c2fb]/4 px-4 py-3">
                {/* Barra lateral colorida */}
                <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl bg-[#04c2fb]" />
                <div className="flex items-start gap-3 pl-1">
                  <div className="shrink-0 mt-0.5 rounded-full bg-[#04c2fb]/15 p-1">
                    <Info className="h-3.5 w-3.5 text-[#04c2fb]" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#0094c8]">Alteracao pontual</p>
                    <p className="text-xs text-[#0094c8]/80 mt-0.5 leading-relaxed">
                      Esta alteracao afeta apenas este agendamento. Os proximos agendamentos desta recorrencia permanecem inalterados.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Card de erros */}
            {camposFaltando.length > 0 && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
                <p className="text-xs font-medium text-red-600">Preencha os campos obrigatórios:</p>
                <p className="text-xs text-red-500 mt-0.5">{camposFaltando.join(', ')}</p>
              </div>
            )}

            {/* Card de conflito de horário */}
            {conflitos.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-amber-700">Conflito de horário</p>
                    <div className="mt-1 space-y-0.5">
                      {conflitos.map(c => (
                        <p key={c.id} className="text-xs text-amber-600">
                          <span className="font-medium text-amber-700">{c.pacientes && c.pacientes.length > 1 ? c.pacientes.map(n => nomeAbreviado(n)).join(', ') : nomeAbreviado(c.paciente)}</span>
                          {' '}
                          <span className="inline-flex items-center gap-1 rounded bg-amber-100/80 px-1.5 py-0.5 text-[11px] font-semibold text-amber-700 tabular-nums">
                            {c.horario} às {c.horarioFim ?? horarioFimPadrao(c.horario)}
                          </span>
                          {' '}
                          <span className="text-amber-500">({c.tipo})</span>
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

              {/* Paciente(s) — coluna completa */}
              <div className="space-y-1 sm:col-span-2">
                <label className={cn('text-xs font-medium', erroPacientes ? 'text-red-500' : 'text-muted-foreground')}>
                  {isGrupo ? 'Pacientes' : 'Paciente'} <span className="text-red-400">*</span>
                  {isGrupo && (
                    <span className="ml-1.5 inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                      <Users className="h-2.5 w-2.5" />
                      Grupo
                    </span>
                  )}
                </label>
                <PacienteMultiSelect
                  selecionados={form.pacientes}
                  onChange={setPacientes}
                  hasError={erroPacientes}
                  isGrupo={isGrupo}
                  pacientesDisponiveis={pacientesDisponiveis}
                />
              </div>

              {/* Tipo de sessão — coluna completa */}
              <div className="space-y-1 sm:col-span-2">
                <label className={cn('text-xs font-medium', erroVisivel('tipo') ? 'text-red-500' : 'text-muted-foreground')}>
                  Tipo de sessão <span className="text-red-400">*</span>
                </label>
                <select
                  value={form.tipo}
                  onChange={e => f('tipo', e.target.value)}
                  className={cn(selectBase, erroVisivel('tipo') ? inputErro : inputOk)}
                >
                  <option value="">Selecionar tipo</option>
                  {tiposSessao.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* Tipo personalizado (apenas quando "Outros") */}
              {form.tipo === 'Outros' && (
                <div
                  className="space-y-1 sm:col-span-2 overflow-hidden"
                  style={{ animation: 'slideDown 0.15s ease-out' }}
                >
                  <label className={cn('text-xs font-medium', erroVisivel('tipoCustom') ? 'text-red-500' : 'text-muted-foreground')}>
                    Descreva o tipo <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.tipoCustom}
                    onChange={e => f('tipoCustom', e.target.value)}
                    placeholder="Ex: Orientação parental"
                    className={cn(inputBase, erroVisivel('tipoCustom') ? inputErro : inputOk)}
                  />
                </div>
              )}

              {/* Data — coluna completa */}
              <div className="space-y-1 sm:col-span-2">
                <label className={cn('text-xs font-medium', erroVisivel('data') ? 'text-red-500' : 'text-muted-foreground')}>
                  Data <span className="text-red-400">*</span>
                </label>
                <DatePicker
                  value={form.data}
                  onChange={v => f('data', v)}
                  variant="default"
                  hasError={erroVisivel('data')}
                />
              </div>

              {/* Horário início */}
              <div className="space-y-1">
                <label className={cn('text-xs font-medium', erroVisivel('horarioInicio') ? 'text-red-500' : 'text-muted-foreground')}>
                  Início <span className="text-red-400">*</span>
                </label>
                <input
                  type="time"
                  step={300}
                  value={form.horarioInicio}
                  onChange={e => f('horarioInicio', e.target.value)}
                  className={cn(inputBase, erroVisivel('horarioInicio') ? inputErro : inputOk)}
                />
              </div>

              {/* Horário fim */}
              <div className="space-y-1">
                <label className={cn('text-xs font-medium', erroVisivel('horarioFim') ? 'text-red-500' : 'text-muted-foreground')}>
                  Fim <span className="text-red-400">*</span>
                </label>
                <input
                  type="time"
                  step={300}
                  value={form.horarioFim}
                  onChange={e => f('horarioFim', e.target.value)}
                  className={cn(inputBase, erroVisivel('horarioFim') ? inputErro : inputOk)}
                />
              </div>

              {/* Observações — coluna completa */}
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Observações
                </label>
                <textarea
                  value={form.observacoes}
                  onChange={e => f('observacoes', e.target.value)}
                  placeholder="Informações adicionais (opcional)"
                  rows={3}
                  className={cn(inputBase, inputOk, 'resize-none')}
                />
              </div>

            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100">
            <button
              onClick={tentarFechar}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={tentarSalvar}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm hover:brightness-110 active:scale-95 transition-all"
              style={{ background: 'linear-gradient(135deg, #0094c8 0%, #04c2fb 60%, #00d5f5 100%)' }}
            >
              {modoEdicao ? 'Salvar alterações' : 'Criar agendamento'}
            </button>
          </div>
        </div>

        <style>{`
          @keyframes slideDown {
            from { opacity: 0; max-height: 0; }
            to   { opacity: 1; max-height: 120px; }
          }
        `}</style>
      </div>
    </ModalPortal>
  )
}
