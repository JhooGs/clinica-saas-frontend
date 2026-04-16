'use client'

import { useState, useMemo, useEffect, startTransition } from 'react'
import { Clock, User, AlertTriangle, FileText, X, CheckCircle2, NotebookPen } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { ModalPauta, chavePauta } from '@/components/modal-pauta'
import { useAgendamentosHoje, useAgendamentos } from '@/hooks/use-agenda'
import type { Agendamento } from '@/types'
import { PageLoader } from '@/components/ui/page-loader'

// ---------------------------------------------------------------------------
// Tipos locais
// ---------------------------------------------------------------------------

type AtendStatus = 'falta' | 'passado' | 'agora' | 'futuro'

type AtendimentoUI = {
  id: string
  nome: string
  horario: string
  tipo: string
  falta?: boolean
}

type RelatorioPendente = {
  id: string
  paciente: string
  tipo: string
  data: string
  horario: string
}

// ---------------------------------------------------------------------------
// Adapters API → tipos locais
// ---------------------------------------------------------------------------

function toAtendimentoUI(a: Agendamento): AtendimentoUI {
  return {
    id: a.id,
    nome: a.paciente_nome ?? 'Paciente',
    horario: a.horario,
    tipo: a.tipo_sessao,
    falta: a.status === 'falta',
  }
}

function toRelatorioPendente(a: Agendamento): RelatorioPendente {
  return {
    id: a.id,
    paciente: a.paciente_nome ?? 'Paciente',
    tipo: a.tipo_sessao,
    data: typeof a.data === 'string' ? a.data : String(a.data),
    horario: a.horario,
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getAtendStatus(horario: string, falta?: boolean, now?: Date): AtendStatus {
  if (falta) return 'falta'
  const ref = now ?? new Date()
  const [h, m] = horario.split(':').map(Number)
  const t = new Date(ref)
  t.setHours(h, m, 0, 0)
  const diff = t.getTime() - ref.getTime()
  if (diff < -30 * 60 * 1000) return 'passado'
  if (diff < 15 * 60 * 1000)  return 'agora'
  return 'futuro'
}

/** Retorna quantos dias se passaram desde a data ISO */
function diasDesde(dataISO: string): number {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const [ay, am, ad] = dataISO.split('-').map(Number)
  const alvo = new Date(ay, am - 1, ad)
  return Math.floor((hoje.getTime() - alvo.getTime()) / (1000 * 60 * 60 * 24))
}

function labelAtraso(dias: number, horario: string): string {
  if (dias === 0) return `hoje às ${horario}`
  if (dias === 1) return 'ontem'
  return `há ${dias} dias`
}

function dataOntem(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}

function data90DiasAtras(): string {
  const d = new Date()
  d.setDate(d.getDate() - 90)
  return d.toISOString().slice(0, 10)
}

// ---------------------------------------------------------------------------
// Estilos
// ---------------------------------------------------------------------------

const statusStyle: Record<AtendStatus, { border: string; badge: string; badgeText: string; label: string }> = {
  falta:   { border: 'border-l-red-400',   badge: 'bg-red-50 text-red-600',    badgeText: 'Falta',         label: 'text-red-400'   },
  passado: { border: 'border-l-gray-300',  badge: 'bg-gray-100 text-gray-500', badgeText: 'Realizado',     label: 'text-gray-400'  },
  agora:   { border: 'border-l-amber-400', badge: 'bg-amber-50 text-amber-600',badgeText: 'Em andamento',  label: 'text-amber-600' },
  futuro:  { border: 'border-l-green-500', badge: 'bg-green-50 text-green-600',badgeText: 'Agendado',      label: 'text-green-600' },
}

function urgenciaCor(dias: number) {
  if (dias === 0) return { dot: 'bg-amber-400', text: 'text-amber-600', pill: 'bg-amber-50 text-amber-700 border-amber-200' }
  if (dias === 1) return { dot: 'bg-orange-400', text: 'text-orange-600', pill: 'bg-orange-50 text-orange-700 border-orange-200' }
  return { dot: 'bg-red-500', text: 'text-red-600', pill: 'bg-red-50 text-red-700 border-red-200' }
}

// ---------------------------------------------------------------------------
// Componentes
// ---------------------------------------------------------------------------

function AtendimentoCard({
  at,
  temPauta,
  onAbrirPauta,
}: {
  at: AtendimentoUI
  temPauta: boolean
  onAbrirPauta: (at: AtendimentoUI) => void
}) {
  const status = getAtendStatus(at.horario, at.falta)
  const style = statusStyle[status]
  return (
    <div className={cn(
      'flex items-center gap-3 rounded-lg border border-l-4 bg-white p-3 transition-shadow hover:shadow-sm',
      style.border
    )}>
      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
        <User className="h-4 w-4 text-muted-foreground" />
      </div>

      <div className="flex-1 min-w-0">
        <p className={cn(
          'text-xs font-semibold truncate',
          status === 'passado' || status === 'falta' ? 'text-gray-400' : 'text-gray-800'
        )}>
          {at.nome}
        </p>
        <span className="inline-flex items-center rounded-full bg-[#04c2fb]/8 border border-[#04c2fb]/20 px-2 py-0.5 text-[10px] font-medium text-[#04c2fb] truncate max-w-full mt-0.5">
          {at.tipo}
        </span>
      </div>

      <div className="flex flex-col items-end gap-1 shrink-0">
        <span className={cn('text-xs font-bold', style.label)}>{at.horario}</span>
        <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full', style.badge)}>
          {style.badgeText}
        </span>
      </div>

      {/* Botão Pauta — só disponível antes da sessão começar */}
      {status === 'futuro' && (
        <button
          onClick={() => onAbrirPauta(at)}
          title="Abrir pauta desta sessão"
          className={cn(
            'shrink-0 flex flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 transition-all border',
            temPauta
              ? 'border-[#04c2fb]/30 bg-[#04c2fb]/5 text-[#04c2fb] hover:bg-[#04c2fb]/10'
              : 'border-transparent text-muted-foreground hover:border-gray-200 hover:bg-muted hover:text-foreground',
          )}
        >
          <NotebookPen className="h-3.5 w-3.5" />
          <span className="text-[9px] font-semibold leading-none">Pauta</span>
          {temPauta && (
            <span className="h-1 w-1 rounded-full bg-[#04c2fb] inline-block" />
          )}
        </button>
      )}
    </div>
  )
}

function AtendimentoSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-l-4 border-l-gray-200 bg-white p-3">
      <div className="h-8 w-8 rounded-full bg-muted shrink-0 animate-pulse" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 w-36 rounded bg-muted animate-pulse" />
        <div className="h-3 w-20 rounded-full bg-muted animate-pulse" />
      </div>
      <div className="flex flex-col items-end gap-1">
        <div className="h-3 w-10 rounded bg-muted animate-pulse" />
        <div className="h-4 w-16 rounded-full bg-muted animate-pulse" />
      </div>
    </div>
  )
}

function EmptyAtendimentos() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
        <Clock className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground">Nenhum atendimento agendado</p>
    </div>
  )
}

function TarefasPendentes({ pendentes, loading }: { pendentes: RelatorioPendente[]; loading?: boolean }) {
  const [dispensados, setDispensados] = useState<Set<string>>(new Set())

  const visiveis = useMemo(
    () => pendentes.filter(p => !dispensados.has(p.id)),
    [pendentes, dispensados]
  )

  const ordenados = useMemo(
    () => [...visiveis].sort((a, b) => a.data.localeCompare(b.data) || a.horario.localeCompare(b.horario)),
    [visiveis]
  )

  function dispensar(id: string) {
    setDispensados(prev => new Set([...prev, id]))
  }

  const totalPendentes = pendentes.length

  if (loading) {
    return (
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Tarefas pendentes</span>
        </div>
        <PageLoader compact />
      </div>
    )
  }

  if (visiveis.length === 0) {
    return (
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold">Tarefas pendentes</span>
          </div>
          {dispensados.size > 0 && (
            <span className="text-xs text-muted-foreground">{dispensados.size} de {totalPendentes} dispensadas</span>
          )}
        </div>
        <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
          <div className="h-10 w-10 rounded-full bg-green-50 flex items-center justify-center">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          </div>
          <p className="text-sm font-medium text-green-700">Tudo em dia!</p>
          <p className="text-xs text-muted-foreground">Nenhum registro pendente.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b">
        <div className="flex items-center gap-2.5">
          <div className="rounded-lg p-1.5 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-none">Tarefas pendentes</p>
            <p className="text-xs text-muted-foreground mt-0.5">Registros de sessão ainda não documentados</p>
          </div>
        </div>
        <span className="flex items-center justify-center h-6 min-w-6 rounded-full bg-red-500 text-white text-[11px] font-bold px-1.5">
          {visiveis.length}
        </span>
      </div>

      {/* Lista */}
      <div className="divide-y">
        {ordenados.map(item => {
          const dias = diasDesde(item.data)
          const cor = urgenciaCor(dias)
          const label = labelAtraso(dias, item.horario)

          return (
            <div
              key={item.id}
              className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/30 transition-colors group"
            >
              {/* Dot de urgência */}
              <span className={cn('h-2 w-2 rounded-full shrink-0 mt-0.5', cor.dot)} />

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{item.paciente}</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="inline-flex items-center rounded-full bg-[#04c2fb]/8 border border-[#04c2fb]/20 px-2 py-0.5 text-[10px] font-medium text-[#04c2fb]">
                    {item.tipo}
                  </span>
                  <span className={cn('text-[11px] font-medium', cor.text)}>{label}</span>
                </div>
              </div>

              {/* Pill de atraso */}
              <span className={cn(
                'hidden sm:inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold shrink-0',
                cor.pill
              )}>
                {dias === 0 ? 'Hoje' : dias === 1 ? '1 dia' : `${dias} dias`}
              </span>

              {/* Ação */}
              <Link
                href={`/dashboard/registros/${item.id.replace('hoje-', '')}`}
                className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium text-white transition-colors hover:brightness-110 whitespace-nowrap"
                style={{ background: 'linear-gradient(135deg, #0094c8 0%, #04c2fb 60%, #00d5f5 100%)' }}
              >
                Registrar
              </Link>

              {/* Dispensar */}
              <button
                onClick={() => dispensar(item.id)}
                title="Dispensar"
                className="shrink-0 rounded-md p-1 text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-muted hover:text-foreground transition-all"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-5 py-3 border-t bg-muted/20">
        <p className="text-[11px] text-muted-foreground">
          Clique em <strong>Registrar</strong> para documentar a sessão.
        </p>
        {dispensados.size > 0 && (
          <button
            onClick={() => setDispensados(new Set())}
            className="text-[11px] text-[#04c2fb] hover:underline shrink-0 ml-4"
          >
            Restaurar dispensadas
          </button>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const [pautaAberta, setPautaAberta] = useState<AtendimentoUI | null>(null)
  const [comPauta, setComPauta] = useState<Set<string>>(new Set())

  // Relógio que re-avalia a cada 30s quais sessões já começaram
  const [currentTime, setCurrentTime] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setCurrentTime(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])

  // Dados reais: agendamentos de hoje
  const { data: agendaHoje, isLoading: loadingHoje } = useAgendamentosHoje()
  const atendimentosHoje = useMemo<AtendimentoUI[]>(
    () => (agendaHoje?.items ?? []).map(toAtendimentoUI),
    [agendaHoje]
  )

  // Dados reais: agendamentos dos últimos 90 dias sem registro (excluindo hoje)
  const { data: agendaPendente, isLoading: loadingPendente } = useAgendamentos({
    data_inicio: data90DiasAtras(),
    data_fim: dataOntem(),
    sem_registro: true,
  })
  const pendentesPassado = useMemo<RelatorioPendente[]>(
    () => (agendaPendente?.items ?? []).map(toRelatorioPendente),
    [agendaPendente]
  )

  // Pendentes de hoje: sessões sem registro cujo horário já passou
  const hoje = new Date().toISOString().slice(0, 10)
  const { data: agendaPendenteHoje } = useAgendamentos({
    data_inicio: hoje,
    data_fim: hoje,
    sem_registro: true,
  })
  const pendentesHoje = useMemo<RelatorioPendente[]>(() => {
    return (agendaPendenteHoje?.items ?? [])
      .filter(a => {
        const [h, m] = a.horario.split(':').map(Number)
        const horarioAgendamento = new Date(currentTime)
        horarioAgendamento.setHours(h, m, 0, 0)
        return currentTime >= horarioAgendamento
      })
      .map(toRelatorioPendente)
  }, [agendaPendenteHoje, currentTime])

  const allPendentes = useMemo(
    () => [...pendentesPassado, ...pendentesHoje],
    [pendentesPassado, pendentesHoje],
  )

  // Carrega do localStorage quais atendimentos já têm pauta
  useEffect(() => {
    if (!atendimentosHoje.length) return
    const ids = atendimentosHoje
      .filter(at => {
        const v = localStorage.getItem(chavePauta(at.id))
        return v && v.trim().length > 0
      })
      .map(at => at.id)
    startTransition(() => setComPauta(new Set(ids)))
  }, [atendimentosHoje])

  function handlePautaSalva(atendId: number | string, texto: string) {
    const strId = String(atendId)
    setComPauta(prev => {
      const next = new Set(prev)
      if (texto.trim()) next.add(strId)
      else next.delete(strId)
      return next
    })
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      <div>
        <h1 className="text-xl font-semibold tracking-tight">Agenda de hoje</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Agenda do dia — full width */}
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="p-4 sm:p-5 border-b flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Atendimentos</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {loadingHoje
                ? 'Carregando...'
                : `${atendimentosHoje.length} agendado${atendimentosHoje.length !== 1 ? 's' : ''} para hoje`
              }
            </p>
          </div>
          {/* Legenda */}
          <div className="hidden sm:flex items-center gap-4 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-1 rounded-full bg-green-500 inline-block" />
              Agendado
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-1 rounded-full bg-amber-400 inline-block" />
              Em andamento
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-1 rounded-full bg-gray-300 inline-block" />
              Realizado
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-1 rounded-full bg-red-400 inline-block" />
              Falta
            </span>
          </div>
        </div>
        <div className="p-3 sm:p-4 space-y-2 overflow-y-auto max-h-[520px]">
          {loadingHoje
            ? Array.from({ length: 3 }).map((_, i) => <AtendimentoSkeleton key={i} />)
            : atendimentosHoje.length === 0
              ? <EmptyAtendimentos />
              : atendimentosHoje.map(at => (
                  <AtendimentoCard
                    key={at.id}
                    at={at}
                    temPauta={comPauta.has(at.id)}
                    onAbrirPauta={setPautaAberta}
                  />
                ))
          }
        </div>
        {/* Legenda mobile */}
        <div className="sm:hidden flex items-center justify-center gap-5 text-[10px] text-muted-foreground py-3 border-t">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-1 rounded-full bg-green-500 inline-block" />Agendado</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-1 rounded-full bg-amber-400 inline-block" />Em andamento</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-1 rounded-full bg-gray-300 inline-block" />Realizado</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-1 rounded-full bg-red-400 inline-block" />Falta</span>
        </div>
      </div>

      {/* Tarefas pendentes */}
      <TarefasPendentes
        pendentes={allPendentes}
        loading={loadingHoje || loadingPendente}
      />

      {/* Modal Pauta */}
      {pautaAberta && (
        <ModalPauta
          atendimento={pautaAberta}
          onFechar={() => setPautaAberta(null)}
          onPautaSalva={handlePautaSalva}
        />
      )}

    </div>
  )
}
