'use client'

import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { Clock, User, AlertTriangle, FileText, X, CheckCircle2, NotebookPen, Check } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { relatoriosPendentesIniciais } from '@/lib/mock-registros'

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

type AtendStatus = 'falta' | 'passado' | 'agora' | 'futuro'

type Atendimento = {
  id: number
  nome: string
  horario: string
  tipo: string
  falta?: boolean
}

type RelatorioPendente = {
  id: number
  paciente: string
  tipo: string
  data: string
  horario: string
}

// ---------------------------------------------------------------------------
// Stub — substituir por API quando backend estiver pronto
// ---------------------------------------------------------------------------

const atendimentosHoje: Atendimento[] = [
  { id: 1, nome: 'Angelo Gustavo P. Holub',  horario: '08:30', tipo: 'Sessão'          },
  { id: 2, nome: 'Lorenzo de Souza Bueno',   horario: '09:15', tipo: 'Sessão'          },
  { id: 3, nome: 'Isadora Furman',           horario: '10:00', tipo: 'Sessão família'  },
  { id: 4, nome: 'Pietro Bizinelli Amorim',  horario: '11:00', tipo: 'Sessão', falta: true },
  { id: 5, nome: 'Vinícius Augusto Padilha', horario: '14:00', tipo: 'Sessão'          },
  { id: 111, nome: 'Moysés Costa de Almeida',  horario: '15:00', tipo: 'Sessão'          },
  { id: 112, nome: 'Rafaela de Souza Bueno',   horario: '16:00', tipo: 'Sessão'          },
]

// relatoriosPendentesIniciais importado de @/lib/mock-registros

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getAtendStatus(horario: string, falta?: boolean): AtendStatus {
  if (falta) return 'falta'
  const now = new Date()
  const [h, m] = horario.split(':').map(Number)
  const t = new Date()
  t.setHours(h, m, 0, 0)
  const diff = t.getTime() - now.getTime()
  if (diff < -30 * 60 * 1000) return 'passado'
  if (diff < 15 * 60 * 1000)  return 'agora'
  return 'futuro'
}

/** Retorna quantos dias se passaram desde a data ISO */
function diasDesde(dataISO: string): number {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const alvo = new Date(dataISO + 'T00:00:00')
  return Math.floor((hoje.getTime() - alvo.getTime()) / (1000 * 60 * 60 * 24))
}

function labelAtraso(dias: number, horario: string): string {
  if (dias === 0) return `hoje às ${horario}`
  if (dias === 1) return 'ontem'
  return `há ${dias} dias`
}

function chavePauta(atendId: number) {
  return `clinitra:pauta:${atendId}`
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
// Modal Pauta
// ---------------------------------------------------------------------------

function ModalPauta({
  atendimento,
  onFechar,
  onPautaSalva,
}: {
  atendimento: Atendimento
  onFechar: () => void
  onPautaSalva: (atendId: number, texto: string) => void
}) {
  const [texto, setTexto] = useState('')
  const [salvo, setSalvo] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Carrega pauta existente ao abrir
  useEffect(() => {
    const raw = localStorage.getItem(chavePauta(atendimento.id))
    if (raw) setTexto(raw)
    // Foca o textarea após abrir
    setTimeout(() => textareaRef.current?.focus(), 50)
  }, [atendimento.id])

  // Auto-resize do textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [texto])

  // Fechar com Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onFechar()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onFechar])

  const salvarComDebounce = useCallback((novoTexto: string) => {
    setSalvo(false)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      localStorage.setItem(chavePauta(atendimento.id), novoTexto)
      onPautaSalva(atendimento.id, novoTexto)
      setSalvo(true)
    }, 1000)
  }, [atendimento.id, onPautaSalva])

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setTexto(e.target.value)
    salvarComDebounce(e.target.value)
  }

  function handleFechar() {
    // Salva imediatamente ao fechar (sem esperar debounce)
    if (timerRef.current) clearTimeout(timerRef.current)
    if (texto.trim()) {
      localStorage.setItem(chavePauta(atendimento.id), texto)
      onPautaSalva(atendimento.id, texto)
    } else {
      localStorage.removeItem(chavePauta(atendimento.id))
      onPautaSalva(atendimento.id, '')
    }
    onFechar()
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={e => { if (e.target === e.currentTarget) handleFechar() }}
    >
      <div
        className="w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl border border-white/30 shadow-2xl flex flex-col max-h-[85vh]"
        style={{ backdropFilter: 'blur(20px)', backgroundColor: 'rgba(255,255,255,0.97)' }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-5 border-b shrink-0">
          <div className="flex items-start gap-3 min-w-0">
            <div className="rounded-lg p-2 bg-[#04c2fb]/10 shrink-0 mt-0.5">
              <NotebookPen className="h-4 w-4 text-[#04c2fb]" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-tight">Pauta da sessão</p>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{atendimento.nome}</p>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <span className="inline-flex items-center rounded-full bg-[#04c2fb]/8 border border-[#04c2fb]/20 px-2 py-0.5 text-[10px] font-medium text-[#04c2fb]">
                  {atendimento.tipo}
                </span>
                <span className="text-[10px] text-muted-foreground">{atendimento.horario}</span>
              </div>
            </div>
          </div>
          <button
            onClick={handleFechar}
            className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 flex-1 overflow-y-auto">
          <textarea
            ref={textareaRef}
            value={texto}
            onChange={handleChange}
            placeholder="Escreva objetivos, ideias de atividades ou materiais para esta sessão..."
            className="w-full resize-none bg-transparent text-sm text-gray-800 placeholder:text-muted-foreground/60 focus:outline-none leading-relaxed min-h-[160px]"
            style={{ overflow: 'hidden' }}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-t bg-muted/20 shrink-0">
          <div className="flex items-center gap-1.5">
            {salvo ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-xs text-emerald-600 font-medium">Salvo</span>
              </>
            ) : (
              <span className="text-xs text-muted-foreground/60">
                {texto.trim() ? 'Salvando...' : 'Nenhuma pauta ainda'}
              </span>
            )}
          </div>
          <button
            onClick={handleFechar}
            className="rounded-lg px-4 py-1.5 text-xs font-medium text-white transition-colors hover:brightness-110"
            style={{ background: 'linear-gradient(135deg, #0094c8 0%, #04c2fb 60%, #00d5f5 100%)' }}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Componentes
// ---------------------------------------------------------------------------

function AtendimentoCard({
  at,
  temPauta,
  onAbrirPauta,
}: {
  at: Atendimento
  temPauta: boolean
  onAbrirPauta: (at: Atendimento) => void
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

      {/* Botão Pauta */}
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

function TarefasPendentes() {
  const [pendentes, setPendentes] = useState<RelatorioPendente[]>(relatoriosPendentesIniciais)
  const [dispensados, setDispensados] = useState<Set<number>>(new Set())

  const visiveis = useMemo(
    () => pendentes.filter(p => !dispensados.has(p.id)),
    [pendentes, dispensados]
  )

  // Ordenar: mais antigo primeiro (maior urgência)
  const ordenados = useMemo(
    () => [...visiveis].sort((a, b) => a.data.localeCompare(b.data) || a.horario.localeCompare(b.horario)),
    [visiveis]
  )

  function dispensar(id: number) {
    setDispensados(prev => new Set([...prev, id]))
  }

  const totalPendentes = pendentes.length

  // Estado vazio — tudo em dia
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
          <p className="text-xs text-muted-foreground">Nenhum relatório pendente.</p>
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
            <p className="text-xs text-muted-foreground mt-0.5">Relatórios de sessão ainda não registrados</p>
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
                href={`/dashboard/registros/${item.id}`}
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
          Clique em <strong>Registrar</strong> para documentar a sessão diretamente na página do paciente.
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
  const [pautaAberta, setPautaAberta] = useState<Atendimento | null>(null)
  // Mapa de atendimentoId → tem pauta salva (não-vazia)
  const [comPauta, setComPauta] = useState<Set<number>>(new Set())

  // Carrega do localStorage quais atendimentos já têm pauta
  useEffect(() => {
    const ids = atendimentosHoje
      .filter(at => {
        const v = localStorage.getItem(chavePauta(at.id))
        return v && v.trim().length > 0
      })
      .map(at => at.id)
    setComPauta(new Set(ids))
  }, [])

  function handlePautaSalva(atendId: number, texto: string) {
    setComPauta(prev => {
      const next = new Set(prev)
      if (texto.trim()) next.add(atendId)
      else next.delete(atendId)
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
              {atendimentosHoje.length} agendado{atendimentosHoje.length !== 1 ? 's' : ''} para hoje
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
          {atendimentosHoje.length === 0
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
      <TarefasPendentes />

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
