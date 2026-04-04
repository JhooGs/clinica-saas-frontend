'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { Bell, X, ChevronRight, CalendarRange } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { useVigenciasGratuito } from '@/hooks/use-planos'
import type { VigenciaGratuitoRead } from '@/lib/types/planos'

/* ── Types ─────────────────────────────────────────── */

type Urgencia = 'hoje' | '1semana' | '2semanas'

type Notificacao = {
  id: string
  tipo: string
  pacienteId: string
  pacienteNome: string
  urgencia: Urgencia
  mensagem: string
  lida: boolean
}

/* ── Gerador de notificações ───────────────────────── */

function diasAte(isoFim: string): number {
  const [y, m, d] = isoFim.split('-').map(Number)
  const fim = new Date(y, m - 1, d)
  fim.setHours(0, 0, 0, 0)
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  return Math.round((fim.getTime() - hoje.getTime()) / 86_400_000)
}

function formatarDataBR(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function vigenciasParaNotificacoes(vigencias: VigenciaGratuitoRead[]): Notificacao[] {
  const notifs: Notificacao[] = []

  for (const v of vigencias) {
    const dias = diasAte(v.vigencia_fim)

    // Fora da janela de alerta (mais de 14 dias ou já encerrado há mais de 1 dia)
    if (dias > 14 || dias < -1) continue

    const dataFim = formatarDataBR(v.vigencia_fim)
    let urgencia: Urgencia
    let mensagem: string

    if (dias <= 0) {
      urgencia = 'hoje'
      mensagem = dias === 0
        ? `O plano gratuito encerra hoje (${dataFim}). Defina um novo plano para o paciente.`
        : `O plano gratuito encerrou em ${dataFim}. Atualize o plano do paciente.`
    } else if (dias === 1) {
      urgencia = 'hoje'
      mensagem = `O plano gratuito encerra amanhã (${dataFim}). Prepare a renovação.`
    } else if (dias <= 7) {
      urgencia = '1semana'
      mensagem = `O plano gratuito encerra em ${dias} dias, em ${dataFim}.`
    } else {
      urgencia = '2semanas'
      mensagem = `O plano gratuito encerra em ${dias} dias, em ${dataFim}.`
    }

    notifs.push({
      id: `vigencia-gratuito-${v.paciente_id}`,
      tipo: 'vigencia_gratuito',
      pacienteId: v.paciente_id,
      pacienteNome: v.paciente_nome,
      urgencia,
      mensagem,
      lida: false,
    })
  }

  return notifs.sort((a, b) => {
    const ordem: Urgencia[] = ['hoje', '1semana', '2semanas']
    return ordem.indexOf(a.urgencia) - ordem.indexOf(b.urgencia)
  })
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
    label: 'Urgente',
    cor: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-100',
    icon: 'text-red-500',
    dot: 'bg-red-500',
    ring: 'ring-red-500/20',
  },
  '1semana': {
    label: 'Em breve',
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

/* ── Componente principal ──────────────────────────── */

export function NotificationsBell() {
  const [aberto, setAberto] = useState(false)
  const [lidas, setLidas] = useState<Set<string>>(new Set())
  const [dispensadas, setDispensadas] = useState<Set<string>>(new Set())
  const ref = useRef<HTMLDivElement>(null)

  const { data: vigenciasData } = useVigenciasGratuito()

  const todasNotificacoes = useMemo(
    () => vigenciasParaNotificacoes(vigenciasData?.items ?? []),
    [vigenciasData],
  )

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
                <p className="text-sm font-semibold leading-none">Notificações</p>
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
                <p className="text-sm font-medium text-gray-700">Nenhuma notificação</p>
                <p className="text-xs text-muted-foreground">Você esta em dia!</p>
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
        meta.bg,
        meta.border,
      )}>
        <CalendarRange className={cn('h-4 w-4', meta.icon)} />
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

        <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
          {n.mensagem}
        </p>

        <Link
          href={`/dashboard/pacientes/${n.pacienteId}`}
          onClick={onFecharPainel}
          className={cn(
            'inline-flex items-center gap-1 mt-2 text-[11px] font-semibold transition-colors',
            'text-[#04c2fb] hover:text-[#0094c8]',
          )}
        >
          Ver paciente
          <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  )
}
