'use client'

import { useMemo, useState, useEffect, startTransition } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  CalendarDays,
  Clock,
  User,
  Users,
  Info,
  ExternalLink,
  Loader2,
  Calendar,
  CalendarCheck,
  RefreshCw,
  Plus,
  Pencil,
  Trash2,
  AlertTriangle,
  NotebookPen,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
// relatoriosPendentesIniciais não é mais usado aqui — agenda mostra apenas hoje em diante
import { useGoogleCalendar } from '@/hooks/use-google-calendar'
import type { AgendamentoComSource } from '@/lib/google-calendar'
import { ModalNovoAgendamento } from '@/components/modal-novo-agendamento'
import { ModalPortal } from '@/components/modal-portal'
import { ModalPauta, chavePauta } from '@/components/modal-pauta'
import { useAgendamentos, useCancelarAgendamento } from '@/hooks/use-agenda'
import type { Agendamento } from '@/types'

const LS_EXPORTED_KEY = 'clinitra_gcal_exported_ids'

function loadExportedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(LS_EXPORTED_KEY)
    if (!raw) return new Set()
    return new Set(JSON.parse(raw) as string[])
  } catch {
    return new Set()
  }
}

function saveExportedIds(ids: Set<string>) {
  try {
    localStorage.setItem(LS_EXPORTED_KEY, JSON.stringify(Array.from(ids)))
  } catch {}
}

const HOJE = (() => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
})()
const AMANHA = (() => {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
})()

// Limites da semana atual (segunda a domingo)
function limitesSemana(hojeIso: string): { inicio: string; fim: string } {
  const [y, m, d] = hojeIso.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  const dow = dt.getDay() // 0=dom ... 6=sáb
  const diffToMon = dow === 0 ? -6 : 1 - dow
  const seg = new Date(dt)
  seg.setDate(dt.getDate() + diffToMon)
  const dom = new Date(seg)
  dom.setDate(seg.getDate() + 6)

  function toIso(date: Date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  }
  return { inicio: toIso(seg), fim: toIso(dom) }
}



// Mapeia Agendamento da API para AgendamentoComSource (tipo unificado com Google Calendar)
function agendamentoToComSource(a: Agendamento): AgendamentoComSource {
  return {
    id: a.id,
    paciente: a.paciente_nome ?? a.paciente_id,
    paciente_id: a.paciente_id,
    pacientes: a.pacientes_nomes?.length
      ? a.pacientes_nomes
      : (a.paciente_nome ? [a.paciente_nome] : undefined),
    pacientes_ids: a.pacientes_ids,
    tipo: a.tipo_sessao,
    data: a.data,
    horario: a.horario,
    horarioFim: a.horario_fim,
    status: a.status,
    source: 'clinitra',
  }
}

function formatDataBR(iso: string) {
  if (!iso) return '-'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function labelData(iso: string): string {
  if (iso === HOJE) return 'Hoje'
  if (iso === AMANHA) return 'Amanhã'
  const [y, m, d] = iso.split('-')
  const nomes = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
  const semana = nomes[new Date(Number(y), Number(m) - 1, Number(d)).getDay()]
  return `${semana}, ${d}/${m}`
}

function nomeAbreviado(nome: string): string {
  const partes = nome.trim().split(/\s+/)
  if (partes.length <= 1) return nome
  return `${partes[0]} ${partes[1][0]}.`
}

function badgeTipo(tipo: string, source?: string) {
  if (source === 'google') return 'bg-blue-50 text-blue-700 border-blue-200'
  if (tipo === 'Sessão em grupo') return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  if (tipo.includes('família')) return 'bg-purple-50 text-purple-700 border-purple-200'
  if (tipo.includes('avaliação')) return 'bg-amber-50 text-amber-700 border-amber-200'
  return 'bg-[#04c2fb]/8 text-[#04c2fb] border-[#04c2fb]/20'
}

/** Retorna true se a sessão já passou (data anterior a hoje, ou mesma data com horário+30min expirado) */
function isPast(data: string, horario: string): boolean {
  if (data < HOJE) return true
  if (data > HOJE) return false
  const now = new Date()
  const [h, m] = horario.split(':').map(Number)
  const cutoff = new Date()
  cutoff.setHours(h, m + 30, 0, 0)
  return now > cutoff
}

export default function AgendaPage() {
  const {
    connected,
    events: googleEvents,
    loading: gcalLoading,
    refreshing,
    lastSynced,
    exportEvent,
    deleteEventFromGoogle,
    refresh,
  } = useGoogleCalendar()

  const [semanaOffset, setSemanaOffset] = useState(0)

  const semana = useMemo(() => {
    const [y, m, d] = HOJE.split('-').map(Number)
    const base = new Date(y, m - 1, d)
    base.setDate(base.getDate() + semanaOffset * 7)
    const iso = `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}-${String(base.getDate()).padStart(2, '0')}`
    return limitesSemana(iso)
  }, [semanaOffset])

  const { data: apiData } = useAgendamentos({ data_inicio: semana.inicio, data_fim: semana.fim })
  const cancelarAgendamento = useCancelarAgendamento()

  const [exportedIds, setExportedIds] = useState<Set<string>>(() => loadExportedIds())
  const [agendamentosRecorrentes] = useState<AgendamentoComSource[]>(() => {
    try {
      const raw = localStorage.getItem('clinitra_agenda_recorrentes')
      return raw ? JSON.parse(raw) as AgendamentoComSource[] : []
    } catch { return [] }
  })
  const [modalOpen, setModalOpen] = useState(false)
  const [agendamentoEditando, setAgendamentoEditando] = useState<AgendamentoComSource | undefined>()
  const [confirmarDeletar, setConfirmarDeletar] = useState<AgendamentoComSource | null>(null)
  const [pautaAberta, setPautaAberta] = useState<AgendamentoComSource | null>(null)
  const [comPauta, setComPauta] = useState<Set<string>>(new Set())

  // Todos os agendamentos: API (clinitra) + recorrentes locais + Google Calendar
  const todosAgendamentos = useMemo<AgendamentoComSource[]>(() => {
    const clinitaItems = (apiData?.items ?? []).map(agendamentoToComSource)
    const clinitaKey = new Set(clinitaItems.map(a => `${a.data}_${a.horario}_${a.paciente}`))
    // Recorrentes locais: apenas os que ainda não existem no banco
    const recorrentesFiltrados = agendamentosRecorrentes.filter(
      a => !clinitaKey.has(`${a.data}_${a.horario}_${a.paciente}`)
    )
    const todos = [...clinitaItems, ...recorrentesFiltrados, ...googleEvents]
    return todos.filter(a => a.data >= semana.inicio && a.data <= semana.fim)
  }, [apiData, googleEvents, agendamentosRecorrentes, semana])

  // Carrega quais agendamentos já têm pauta salva
  useEffect(() => {
    const ids = todosAgendamentos
      .filter(ag => {
        const v = localStorage.getItem(chavePauta(ag.id))
        return v && v.trim().length > 0
      })
      .map(ag => String(ag.id))
    startTransition(() => setComPauta(new Set(ids)))
  }, [todosAgendamentos])

  function handlePautaSalva(atendId: number | string, texto: string) {
    const key = String(atendId)
    setComPauta(prev => {
      const next = new Set(prev)
      if (texto.trim()) next.add(key)
      else next.delete(key)
      return next
    })
  }

  // Marca como exportado no estado + localStorage
  function marcarExportado(id: string | number) {
    const key = String(id)
    setExportedIds(prev => {
      const next = new Set(prev)
      next.add(key)
      saveExportedIds(next)
      return next
    })
  }

  // Auto-exporta para Google Calendar (fire-and-forget)
  function autoExportParaGoogle(ag: AgendamentoComSource) {
    if (!connected) return
    // Marca como exportado imediatamente (ícone verde)
    marcarExportado(ag.id)
    // Exporta em background — se falhar, mostra aviso mas mantém ícone
    exportEvent(ag).catch(() => {
      toast.warning('Não foi possível sincronizar com Google Calendar', {
        description: 'O agendamento foi salvo localmente.',
      })
    })
  }

  function handleSave(ag: AgendamentoComSource) {
    // Modal já fez a chamada API e invalidou o cache — apenas fecha e exporta
    autoExportParaGoogle(ag)
    setModalOpen(false)
    setAgendamentoEditando(undefined)
  }

  function abrirEdicao(ag: AgendamentoComSource) {
    setAgendamentoEditando(ag)
    setModalOpen(true)
  }

  function fecharModal() {
    setModalOpen(false)
    setAgendamentoEditando(undefined)
  }

  // ── Deletar agendamento ─────────────────────────────────────────────────
  function handleDelete(ag: AgendamentoComSource) {
    const key = String(ag.id)

    // Se é evento Google, deleta direto do Google Calendar
    if (ag.source === 'google' && ag.googleEventId) {
      deleteEventFromGoogle(ag.googleEventId).catch(() => {})
      setConfirmarDeletar(null)
      toast.success('Agendamento removido', { description: `${ag.paciente} — ${ag.horario}` })
      return
    }

    // Evento Clinitra: chama API (soft delete)
    cancelarAgendamento.mutate(key, {
      onSuccess: () => {
        // Remove também do Google Calendar se estava exportado
        if (connected && exportedIds.has(key)) {
          setExportedIds(prev => {
            const next = new Set(prev)
            next.delete(key)
            saveExportedIds(next)
            return next
          })
          if (ag.googleEventId) {
            deleteEventFromGoogle(ag.googleEventId).catch(() => {})
          }
        }
        setConfirmarDeletar(null)
        toast.success('Agendamento removido', { description: `${ag.paciente} — ${ag.horario}` })
      },
      onError: () => {
        toast.error('Erro ao remover', { description: 'Não foi possível remover o agendamento.' })
      },
    })
  }

  const grupos = useMemo(() => {
    const map = new Map<string, AgendamentoComSource[]>()
    const ordenados = [...todosAgendamentos].sort((a, b) => {
      const dataCmp = a.data.localeCompare(b.data)
      if (dataCmp !== 0) return dataCmp
      return a.horario.localeCompare(b.horario)
    })
    for (const ag of ordenados) {
      if (!map.has(ag.data)) map.set(ag.data, [])
      map.get(ag.data)!.push(ag)
    }
    return Array.from(map.entries())
  }, [todosAgendamentos])

  const total = todosAgendamentos.length
  const hoje = todosAgendamentos.filter(a => a.data === HOJE).length
  const googleCount = googleEvents.length

  // Tempo relativo desde a última sincronização (atualiza a cada 30s)
  const [sinceLabel, setSinceLabel] = useState<string | null>(null)

  useEffect(() => {
    function calcLabel() {
      if (!lastSynced) { setSinceLabel(null); return }
      const diff = Math.floor((Date.now() - lastSynced.getTime()) / 1000)
      if (diff < 10) setSinceLabel('agora')
      else if (diff < 60) setSinceLabel(`há ${diff}s`)
      else if (diff < 3600) setSinceLabel(`há ${Math.floor(diff / 60)}min`)
      else setSinceLabel(`há ${Math.floor(diff / 3600)}h`)
    }
    calcLabel()
    const id = setInterval(calcLabel, 30_000)
    return () => clearInterval(id)
  }, [lastSynced])

  return (
    <div className="space-y-6 max-w-3xl mx-auto">

      <ModalNovoAgendamento
        open={modalOpen}
        onClose={fecharModal}
        onSave={handleSave}
        agendamento={agendamentoEditando}
        agendamentosExistentes={todosAgendamentos}
      />

      {/* Confirmação de exclusão */}
      {confirmarDeletar && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          >
            <div
              className="w-full max-w-sm rounded-2xl border border-white/30 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
              style={{ backdropFilter: 'blur(24px)', backgroundColor: 'rgba(255,255,255,0.95)' }}
            >
              {/* Ícone */}
              <div className="flex justify-center pt-7 pb-2">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 ring-8 ring-red-50/50">
                  <AlertTriangle className="h-7 w-7 text-red-500" />
                </div>
              </div>

              {/* Texto */}
              <div className="px-6 pb-2 text-center">
                <h3 className="text-base font-semibold tracking-tight text-gray-900">
                  Excluir agendamento?
                </h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  O agendamento de <span className="font-medium text-gray-700">{confirmarDeletar.paciente}</span> às{' '}
                  <span className="font-medium text-gray-700">{confirmarDeletar.horario}</span> será removido
                  {connected && exportedIds.has(String(confirmarDeletar.id))
                    ? ' da plataforma e do Google Calendar.'
                    : '.'}
                </p>
              </div>

              {/* Botões */}
              <div className="flex gap-3 px-6 pt-4 pb-6">
                <button
                  onClick={() => setConfirmarDeletar(null)}
                  className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 hover:border-gray-300"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleDelete(confirmarDeletar)}
                  className="flex-1 rounded-xl px-4 py-2.5 text-sm font-medium text-white transition-all hover:brightness-110"
                  style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' }}
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Agenda</h1>
          <div className="flex items-center gap-1.5 mt-1">
            <button
              onClick={() => setSemanaOffset(o => o - 1)}
              className="rounded-md p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              title="Semana anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm text-muted-foreground tabular-nums">
              {formatDataBR(semana.inicio)} – {formatDataBR(semana.fim)}
            </span>
            <button
              onClick={() => setSemanaOffset(o => o + 1)}
              className="rounded-md p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              title="Próxima semana"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            {semanaOffset !== 0 && (
              <button
                onClick={() => setSemanaOffset(0)}
                className="ml-1 rounded-md border border-[#04c2fb]/30 bg-[#04c2fb]/8 px-2 py-0.5 text-xs font-medium text-[#04c2fb] hover:bg-[#04c2fb]/15 transition-colors"
              >
                Hoje
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Botão novo agendamento */}
          <button
            onClick={() => setModalOpen(true)}
            className="group flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-white shadow-sm hover:brightness-110 active:scale-95 transition-all"
            style={{ background: 'linear-gradient(135deg, #0094c8 0%, #04c2fb 60%, #00d5f5 100%)' }}
          >
            <Plus className="h-3.5 w-3.5 transition-transform duration-300 group-hover:rotate-90" />
            <span className="hidden sm:inline">Agendamento</span>
          </button>

          {/* Botão atualizar Google Calendar */}
          {connected && (
          <button
            onClick={refresh}
            disabled={refreshing || gcalLoading}
            title="Sincronizar com Google Calendar"
            className={cn(
              'group flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition-all duration-200',
              refreshing || gcalLoading
                ? 'border-blue-200 bg-blue-50 text-blue-400 cursor-wait'
                : 'border-slate-200 bg-white text-slate-500 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 shadow-sm hover:shadow'
            )}
          >
            {/* Ícone com rotação ao atualizar */}
            <RefreshCw
              className={cn(
                'h-3.5 w-3.5 transition-transform duration-500',
                refreshing ? 'animate-spin' : 'group-hover:rotate-180'
              )}
            />
            <span className="hidden sm:inline">
              {refreshing
                ? 'Atualizando…'
                : sinceLabel
                  ? `Atualizado ${sinceLabel}`
                  : 'Atualizar'}
            </span>
          </button>
          )}
        </div>
      </div>

      {/* Banner Google Calendar desconectado */}
      {!connected && !gcalLoading && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
          <div className="flex items-center gap-2 flex-1">
            <Info className="h-4 w-4 text-blue-500 shrink-0" />
            <p className="text-sm text-blue-700">
              Conecte seu Google Calendar para ver todos os eventos na agenda.
            </p>
          </div>
          <Link
            href="/dashboard/configuracoes/conexoes"
            className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 shrink-0"
          >
            Conectar
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      )}

      {/* Banner carregando eventos Google */}
      {gcalLoading && (
        <div className="flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
          <Loader2 className="h-4 w-4 animate-spin text-blue-500 shrink-0" />
          <p className="text-sm text-blue-700">Sincronizando com Google Calendar…</p>
        </div>
      )}

      {/* Cards resumo */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {semanaOffset === 0 && (
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <p className="text-xs font-medium text-muted-foreground">Hoje</p>
            <p className="mt-1.5 text-2xl font-bold tracking-tight">{hoje}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">sessões agendadas</p>
          </div>
        )}
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground">Total</p>
          <p className="mt-1.5 text-2xl font-bold tracking-tight">{total}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">na semana</p>
        </div>
        {connected && (
          <div className="rounded-xl border bg-blue-50 border-blue-100 p-4 shadow-sm">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-blue-600" />
              <p className="text-xs font-medium text-blue-700">Google Cal</p>
            </div>
            <p className="mt-1.5 text-2xl font-bold tracking-tight text-blue-700">{googleCount}</p>
            <p className="mt-0.5 text-[11px] text-blue-600/70">eventos importados</p>
          </div>
        )}
      </div>

      {/* Lista agrupada por dia */}
      <div className="space-y-6">
        {grupos.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-card py-14 text-center">
            <CalendarDays className="h-8 w-8 text-muted-foreground/40" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Nenhum agendamento nesta semana</p>
              {semanaOffset === 0 && (
                <p className="mt-0.5 text-xs text-muted-foreground/70">
                  Clique em <span className="font-medium">+ Agendamento</span> para adicionar ou navegue para ver semanas futuras.
                </p>
              )}
            </div>
          </div>
        )}
        {grupos.map(([data, agendamentos]) => (
          <div key={data}>
            {/* Header do dia */}
            <div className="flex items-center gap-3 mb-3">
              <div className={cn(
                'flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold',
                data === HOJE
                  ? 'bg-[#04c2fb] text-white'
                  : data < HOJE
                    ? 'bg-gray-200/70 text-gray-400'
                    : 'bg-muted text-muted-foreground'
              )}>
                <CalendarDays className="h-3.5 w-3.5" />
                {labelData(data)}
              </div>
              <span className={cn(
                'text-[11px]',
                data < HOJE ? 'text-gray-400' : 'text-muted-foreground'
              )}>{formatDataBR(data)}</span>
              <div className="flex-1 h-px bg-border" />
              <span className={cn(
                'text-[11px]',
                data < HOJE ? 'text-gray-400' : 'text-muted-foreground'
              )}>
                {agendamentos.length} {agendamentos.length !== 1 ? 'sessões' : 'sessão'}
              </span>
            </div>

            {/* Agendamentos do dia */}
            <div className="space-y-2">
              {agendamentos.map(ag => {
                const passado = isPast(ag.data, ag.horario)
                return (
                  <div
                    key={ag.id}
                    className={cn(
                      'rounded-xl border p-3 sm:p-4 flex items-center gap-3 sm:gap-4 transition-colors',
                      passado
                        ? 'bg-gray-50/70 border-gray-200/80 shadow-none'
                        : 'bg-card shadow-sm hover:bg-muted/20',
                      !passado && ag.source === 'google' && 'border-blue-100 bg-blue-50/30',
                    )}
                  >
                    {/* Horário */}
                    <div className="flex items-center gap-1.5 shrink-0 w-14 sm:w-16">
                      <Clock className={cn(
                        'h-3.5 w-3.5 shrink-0',
                        passado
                          ? 'text-gray-400'
                          : ag.source === 'google' ? 'text-blue-500' : 'text-[#04c2fb]'
                      )} />
                      <span className={cn(
                        'text-sm font-semibold',
                        passado ? 'text-gray-400' : 'text-gray-800'
                      )}>{ag.horario}</span>
                    </div>

                    <div className={cn('w-px h-8 shrink-0', passado ? 'bg-gray-200' : 'bg-border')} />

                    {/* Paciente + tipo */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {ag.tipo === 'Sessão em grupo' ? (
                          <>
                            <Users className={cn('h-3.5 w-3.5 shrink-0', passado ? 'text-gray-400' : 'text-emerald-600')} />
                            <span className={cn('text-sm font-medium', passado ? 'text-gray-400' : 'text-gray-800')}>
                              {ag.pacientes && ag.pacientes.length > 0
                                ? ag.pacientes.map(n => nomeAbreviado(n)).join(', ')
                                : ag.paciente}
                            </span>
                          </>
                        ) : ag.source === 'google' ? (
                          <>
                            <Calendar className={cn('h-3.5 w-3.5 shrink-0', passado ? 'text-gray-400' : 'text-blue-500')} />
                            <span className={cn('text-sm font-medium truncate', passado ? 'text-gray-400' : 'text-gray-800')}>{ag.paciente}</span>
                          </>
                        ) : (
                          <>
                            <User className={cn('h-3.5 w-3.5 shrink-0', passado ? 'text-gray-300' : 'text-muted-foreground')} />
                            <span className={cn('text-sm font-medium truncate', passado ? 'text-gray-400' : 'text-gray-800')}>{ag.paciente}</span>
                          </>
                        )}
                      </div>
                      <span className={cn(
                        'mt-1 inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium',
                        passado
                          ? 'bg-gray-100 text-gray-400 border-gray-200'
                          : badgeTipo(ag.tipo, ag.source)
                      )}>
                        {ag.tipo}
                      </span>
                      {ag.status === 'reagendamento' && !passado && (
                        <span className="mt-1 inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                          Reagendado
                        </span>
                      )}
                    </div>

                    {/* Ações — apenas para sessões futuras/em andamento */}
                    {passado ? (
                      <div className="shrink-0">
                        <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-100/80 px-2.5 py-1 text-[10px] font-medium text-gray-400">
                          <Clock className="h-3 w-3" />
                          Passado
                        </span>
                      </div>
                    ) : (
                      <div className="shrink-0 flex items-center gap-1.5">
                        {/* Pauta — só para agendamentos Clinitra */}
                        {ag.source !== 'google' && (
                          <button
                            onClick={() => setPautaAberta(ag)}
                            title={comPauta.has(String(ag.id)) ? 'Ver/editar pauta' : 'Adicionar pauta'}
                            className={cn(
                              'relative flex items-center gap-1 rounded-lg border bg-white p-1.5 transition-all duration-200',
                              comPauta.has(String(ag.id))
                                ? 'border-[#04c2fb]/30 bg-[#04c2fb]/5 text-[#04c2fb] hover:bg-[#04c2fb]/10'
                                : 'border-gray-200 text-muted-foreground hover:border-[#04c2fb]/40 hover:bg-[#04c2fb]/5 hover:text-[#04c2fb]',
                            )}
                          >
                            <NotebookPen className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline text-[11px] font-medium">Pauta</span>
                            {comPauta.has(String(ag.id)) && (
                              <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-[#04c2fb] ring-2 ring-white" />
                            )}
                          </button>
                        )}

                        {/* Editar */}
                        <button
                          onClick={() => abrirEdicao(ag)}
                          title="Editar agendamento"
                          className="group/edit flex items-center rounded-lg border border-gray-200 bg-white p-1.5 text-muted-foreground hover:border-[#04c2fb]/40 hover:bg-[#04c2fb]/5 hover:text-[#04c2fb] transition-all duration-200"
                        >
                          <Pencil className="h-3.5 w-3.5 transition-transform duration-200 group-hover/edit:-rotate-12 group-hover/edit:scale-110" />
                        </button>

                        {/* Deletar */}
                        <button
                          onClick={() => setConfirmarDeletar(ag)}
                          title="Excluir agendamento"
                          className="group/del flex items-center rounded-lg border border-gray-200 bg-white p-1.5 text-muted-foreground hover:border-red-300 hover:bg-red-50 hover:text-red-500 transition-all duration-200"
                        >
                          <Trash2 className="h-3.5 w-3.5 transition-transform duration-200 group-hover/del:scale-110" />
                        </button>

                        {/* Badge exportado (verde) — aparece para Clinitra se conectado */}
                        {ag.source !== 'google' && connected && exportedIds.has(String(ag.id)) && (
                          <div
                            title="Exportado para Google Calendar"
                            className="flex items-center gap-1.5 rounded-lg border border-green-200 bg-green-50 px-2 py-1.5 text-green-600"
                          >
                            <CalendarCheck className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline text-[11px] font-medium">Exportado</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Modal Pauta */}
      {pautaAberta && (
        <ModalPauta
          atendimento={{
            id: pautaAberta.id,
            nome: pautaAberta.paciente,
            horario: pautaAberta.horario,
            tipo: pautaAberta.tipo,
          }}
          onFechar={() => setPautaAberta(null)}
          onPautaSalva={handlePautaSalva}
        />
      )}

    </div>
  )
}
