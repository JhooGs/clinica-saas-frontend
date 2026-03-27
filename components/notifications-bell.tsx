'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { Bell, X, Gift, ChevronRight, Clock, AlertTriangle, Pause } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { PACIENTES_MOCK, isPausado } from '@/lib/mock-pacientes'

/* ── Types ─────────────────────────────────────────── */

type Urgencia = 'hoje' | '1semana' | '2semanas'

type Notificacao = {
  id: string
  tipo: 'gratuidade_expirando' | 'paciente_pausado'
  pacienteId: number
  pacienteNome: string
  urgencia: Urgencia
  diasRestantes: number
  dataFim: string
  lida: boolean
}

/* ── Mock: pacientes com gratuidade ────────────────── */

const PACIENTES_GRATUIDADE = [
  { id: 2,  nome: 'Angelo Gustavo P. Holub', gratuitoFim: diasAPartirDeHoje(0) },
  { id: 11, nome: 'Laura Mendes Silva',      gratuitoFim: diasAPartirDeHoje(5) },
  { id: 12, nome: 'Theo Oliveira Santos',    gratuitoFim: diasAPartirDeHoje(13) },
]

function diasAPartirDeHoje(dias: number): string {
  const d = new Date()
  d.setDate(d.getDate() + dias)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

function parseDateBR(d: string): Date {
  const [day, month, year] = d.split('/')
  return new Date(+year, +month - 1, +day)
}

function diasAte(dataBR: string): number {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const alvo = parseDateBR(dataBR)
  alvo.setHours(0, 0, 0, 0)
  return Math.ceil((alvo.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
}

function classificarUrgencia(dias: number): Urgencia | null {
  if (dias <= 0) return 'hoje'
  if (dias <= 7) return '1semana'
  if (dias <= 14) return '2semanas'
  return null
}

function gerarNotificacoes(): Notificacao[] {
  const notifs: Notificacao[] = []
  for (const p of PACIENTES_GRATUIDADE) {
    const dias = diasAte(p.gratuitoFim)
    const urgencia = classificarUrgencia(dias)
    if (!urgencia) continue
    notifs.push({
      id: `grat-${p.id}`,
      tipo: 'gratuidade_expirando',
      pacienteId: p.id,
      pacienteNome: p.nome,
      urgencia,
      diasRestantes: Math.max(0, dias),
      dataFim: p.gratuitoFim,
      lida: false,
    })
  }
  // Pacientes pausados (gratuidade expirou + sem valor)
  PACIENTES_MOCK.forEach((p, i) => {
    if (isPausado(p)) {
      notifs.push({
        id: `pausado-${i}`,
        tipo: 'paciente_pausado',
        pacienteId: i + 1,
        pacienteNome: p.nome,
        urgencia: 'hoje',
        diasRestantes: 0,
        dataFim: p.gratuitoFim,
        lida: false,
      })
    }
  })
  return notifs.sort((a, b) => a.diasRestantes - b.diasRestantes)
}

/* ── Metadata por urgência ─────────────────────────── */

const URGENCIA_META: Record<Urgencia, {
  label: string
  cor: string
  bg: string
  border: string
  icon: string
  dot: string
  ring: string
}> = {
  hoje: {
    label: 'Hoje',
    cor: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-100',
    icon: 'text-red-500',
    dot: 'bg-red-500',
    ring: 'ring-red-500/20',
  },
  '1semana': {
    label: 'Esta semana',
    cor: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-100',
    icon: 'text-amber-500',
    dot: 'bg-amber-400',
    ring: 'ring-amber-400/20',
  },
  '2semanas': {
    label: 'Em 2 semanas',
    cor: 'text-sky-600',
    bg: 'bg-sky-50',
    border: 'border-sky-100',
    icon: 'text-sky-500',
    dot: 'bg-sky-400',
    ring: 'ring-sky-400/20',
  },
}

function labelDias(dias: number): string {
  if (dias === 0) return 'Expira hoje'
  if (dias === 1) return 'Expira amanha'
  return `Expira em ${dias} dias`
}

/* ── Componente principal ──────────────────────────── */

export function NotificationsBell() {
  const [aberto, setAberto] = useState(false)
  const [lidas, setLidas] = useState<Set<string>>(new Set())
  const [dispensadas, setDispensadas] = useState<Set<string>>(new Set())
  const ref = useRef<HTMLDivElement>(null)

  const todasNotificacoes = useMemo(() => gerarNotificacoes(), [])

  const notificacoes = useMemo(
    () => todasNotificacoes.filter(n => !dispensadas.has(n.id)),
    [todasNotificacoes, dispensadas],
  )

  const naoLidas = useMemo(
    () => notificacoes.filter(n => !lidas.has(n.id)).length,
    [notificacoes, lidas],
  )

  // Fechar ao clicar fora
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setAberto(false)
      }
    }
    if (aberto) {
      document.addEventListener('mousedown', handleClick)
      return () => document.removeEventListener('mousedown', handleClick)
    }
  }, [aberto])

  // Fechar com Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setAberto(false)
    }
    if (aberto) {
      window.addEventListener('keydown', handleKey)
      return () => window.removeEventListener('keydown', handleKey)
    }
  }, [aberto])

  function marcarTodasLidas() {
    setLidas(new Set(notificacoes.map(n => n.id)))
  }

  function dispensar(id: string) {
    setDispensadas(prev => new Set([...prev, id]))
  }

  function toggleAberto() {
    setAberto(prev => !prev)
  }

  // Agrupar por urgência
  const grupos = useMemo(() => {
    const map = new Map<Urgencia, Notificacao[]>()
    for (const n of notificacoes) {
      const arr = map.get(n.urgencia) || []
      arr.push(n)
      map.set(n.urgencia, arr)
    }
    const ordem: Urgencia[] = ['hoje', '1semana', '2semanas']
    return ordem.filter(u => map.has(u)).map(u => ({ urgencia: u, items: map.get(u)! }))
  }, [notificacoes])

  const temHoje = notificacoes.some(n => n.urgencia === 'hoje')

  return (
    <div ref={ref} className="relative">
      {/* Botao sino */}
      <button
        onClick={toggleAberto}
        className={cn(
          'relative flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200',
          aberto
            ? 'bg-gray-100 text-gray-900 shadow-sm'
            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700',
        )}
        aria-label={`Notificacoes${naoLidas > 0 ? ` (${naoLidas} nao lidas)` : ''}`}
      >
        <Bell className={cn('h-[18px] w-[18px] transition-transform duration-200', aberto && 'scale-95')} />

        {/* Badge */}
        {naoLidas > 0 && (
          <span
            className={cn(
              'absolute -top-0.5 -right-0.5 flex items-center justify-center rounded-full text-[10px] font-bold text-white transition-all',
              naoLidas > 9 ? 'h-[18px] min-w-[18px] px-1' : 'h-[18px] w-[18px]',
              temHoje ? 'bg-red-500 animate-pulse' : 'bg-[#04c2fb]',
            )}
          >
            {naoLidas > 99 ? '99+' : naoLidas}
          </span>
        )}
      </button>

      {/* Painel dropdown */}
      {aberto && (
        <div
          className={cn(
            'absolute right-0 top-full mt-2 z-50',
            'w-[360px] max-w-[calc(100vw-24px)]',
            'rounded-2xl border border-gray-200/80 bg-white shadow-xl shadow-black/8',
            'animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-200',
            'origin-top-right',
            'flex flex-col max-h-[480px]',
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#04c2fb]/10">
                <Bell className="h-4 w-4 text-[#04c2fb]" />
              </div>
              <div>
                <p className="text-sm font-semibold leading-none">Notificacoes</p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {naoLidas > 0 ? `${naoLidas} nao lida${naoLidas > 1 ? 's' : ''}` : 'Tudo em dia'}
                </p>
              </div>
            </div>
            {naoLidas > 0 && (
              <button
                onClick={marcarTodasLidas}
                className="text-[11px] font-medium text-[#04c2fb] hover:text-[#0094c8] transition-colors"
              >
                Marcar como lidas
              </button>
            )}
          </div>

          {/* Lista */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            {notificacoes.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                <div className="h-10 w-10 rounded-full bg-green-50 flex items-center justify-center">
                  <Bell className="h-5 w-5 text-green-500" />
                </div>
                <p className="text-sm font-medium text-gray-700">Nenhuma notificacao</p>
                <p className="text-xs text-muted-foreground">Voce esta em dia!</p>
              </div>
            ) : (
              <div className="py-1">
                {grupos.map(({ urgencia, items }) => {
                  const meta = URGENCIA_META[urgencia]
                  return (
                    <div key={urgencia}>
                      {/* Label do grupo */}
                      <div className="flex items-center gap-2 px-5 pt-3 pb-1.5">
                        <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} />
                        <span className={cn('text-[10px] font-bold uppercase tracking-wider', meta.cor)}>
                          {meta.label}
                        </span>
                        <span className="flex-1 h-px bg-gray-100" />
                        <span className={cn('text-[10px] font-semibold', meta.cor)}>
                          {items.length}
                        </span>
                      </div>

                      {/* Items */}
                      {items.map(n => (
                        <NotificacaoItem
                          key={n.id}
                          notificacao={n}
                          lida={lidas.has(n.id)}
                          onLer={() => setLidas(prev => new Set([...prev, n.id]))}
                          onDispensar={() => dispensar(n.id)}
                          onFecharPainel={() => setAberto(false)}
                        />
                      ))}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {dispensadas.size > 0 && (
            <div className="flex items-center justify-center px-5 py-2.5 border-t bg-gray-50/50 shrink-0">
              <button
                onClick={() => setDispensadas(new Set())}
                className="text-[11px] text-muted-foreground hover:text-gray-700 transition-colors"
              >
                Restaurar {dispensadas.size} dispensada{dispensadas.size > 1 ? 's' : ''}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ── Item de notificacao ───────────────────────────── */

function NotificacaoItem({
  notificacao: n,
  lida,
  onLer,
  onDispensar,
  onFecharPainel,
}: {
  notificacao: Notificacao
  lida: boolean
  onLer: () => void
  onDispensar: () => void
  onFecharPainel: () => void
}) {
  const meta = URGENCIA_META[n.urgencia]
  const isPaused = n.tipo === 'paciente_pausado'
  const IconeUrgencia = isPaused ? Pause : n.urgencia === 'hoje' ? AlertTriangle : Clock

  return (
    <div
      className={cn(
        'group relative flex items-start gap-3 px-5 py-3 transition-colors hover:bg-gray-50/70',
        !lida && 'bg-[#04c2fb]/[0.02]',
      )}
      onMouseEnter={!lida ? onLer : undefined}
    >
      {/* Indicador de nao lida */}
      {!lida && (
        <span className="absolute left-1.5 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-[#04c2fb]" />
      )}

      {/* Icone */}
      <div className={cn(
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border',
        isPaused ? 'bg-amber-50 border-amber-200' : meta.bg,
        !isPaused && meta.border,
      )}>
        {isPaused
          ? <Pause className="h-4 w-4 text-amber-500" />
          : <Gift className={cn('h-4 w-4', meta.icon)} />
        }
      </div>

      {/* Conteudo */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[13px] font-medium text-gray-800 leading-snug">
            {n.pacienteNome}
          </p>
          <button
            onClick={e => { e.stopPropagation(); onDispensar() }}
            className="shrink-0 rounded-md p-0.5 text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-gray-200 hover:text-gray-600 transition-all"
            title="Dispensar"
          >
            <X className="h-3 w-3" />
          </button>
        </div>

        {isPaused ? (
          <>
            <div className="flex items-center gap-1.5 mt-1">
              <AlertTriangle className="h-3 w-3 shrink-0 text-amber-500" />
              <span className="text-[11px] font-semibold text-amber-600">
                Paciente pausado
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
              O periodo gratuito expirou e nenhum valor de sessao foi definido. Este paciente nao pode ser agendado.
            </p>
          </>
        ) : (
          <>
            <div className="flex items-center gap-1.5 mt-1">
              <IconeUrgencia className={cn('h-3 w-3 shrink-0', meta.icon)} />
              <span className={cn('text-[11px] font-semibold', meta.cor)}>
                {labelDias(n.diasRestantes)}
              </span>
              <span className="text-[10px] text-muted-foreground">
                ({n.dataFim})
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
              O periodo gratuito deste paciente esta {n.diasRestantes === 0 ? 'expirando hoje' : 'proximo do fim'}.
              Revise o plano e defina o valor da sessao.
            </p>
          </>
        )}

        <Link
          href={`/dashboard/pacientes/${n.pacienteId}`}
          onClick={onFecharPainel}
          className={cn(
            'inline-flex items-center gap-1 mt-2 text-[11px] font-semibold transition-colors',
            'text-[#04c2fb] hover:text-[#0094c8]',
          )}
        >
          {isPaused ? 'Definir valor' : 'Ver paciente'}
          <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  )
}
