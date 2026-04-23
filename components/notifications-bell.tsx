'use client'

import { useMemo, useEffect, useRef, useState } from 'react'
import { Bell, X, ChevronRight, CalendarRange } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import {
  useNotificacoes,
  useMarcarLida,
  useMarcarTodasLidas,
  useDispensarNotificacao,
  type Notificacao,
  type NotificacaoUrgencia,
} from '@/hooks/use-notificacoes'

/* ── Metadata por urgência ─────────────────────────────────────────────────── */

const URGENCIA_META: Record<NotificacaoUrgencia, {
  label: string
  cor: string
  bg: string
  border: string
  icon: string
  dot: string
}> = {
  alta: {
    label: 'Urgente',
    cor: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-100',
    icon: 'text-red-500',
    dot: 'bg-red-500',
  },
  media: {
    label: 'Em breve',
    cor: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-100',
    icon: 'text-amber-500',
    dot: 'bg-amber-400',
  },
  baixa: {
    label: 'Em 2 semanas',
    cor: 'text-sky-600',
    bg: 'bg-sky-50',
    border: 'border-sky-100',
    icon: 'text-sky-500',
    dot: 'bg-sky-400',
  },
}

/* ── Helpers ───────────────────────────────────────────────────────────────── */

function formatarMensagem(n: Notificacao): string {
  const { vigencia_fim, dias_restantes } = n.payload
  if (!vigencia_fim) return 'Verifique o plano do paciente.'
  const [y, m, d] = vigencia_fim.split('-')
  const dataFmt = `${d}/${m}/${y}`
  const dias = dias_restantes ?? 0
  if (dias <= 0) {
    return dias === 0
      ? `O plano gratuito encerra hoje (${dataFmt}). Defina um novo plano para o paciente.`
      : `O plano gratuito encerrou em ${dataFmt}. Atualize o plano do paciente.`
  }
  if (dias === 1) return `O plano gratuito encerra amanhã (${dataFmt}). Prepare a renovação.`
  return `O plano gratuito encerra em ${dias} dias, em ${dataFmt}.`
}

/* ── Componente principal ──────────────────────────────────────────────────── */

export function NotificationsBell() {
  const [aberto, setAberto] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const { data } = useNotificacoes()
  const { mutate: marcarLida } = useMarcarLida()
  const { mutate: marcarTodasLidas } = useMarcarTodasLidas()
  const { mutate: dispensar } = useDispensarNotificacao()

  const notificacoes = useMemo(() => data?.items ?? [], [data])
  const naoLidas = notificacoes.filter((n) => !n.lida_em).length
  const temAlta = notificacoes.some((n) => n.urgencia === 'alta')

  // Fechar ao clicar fora
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false)
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

  // Agrupar por urgência
  const grupos = useMemo(() => {
    const map = new Map<NotificacaoUrgencia, Notificacao[]>()
    for (const n of notificacoes) {
      const arr = map.get(n.urgencia) ?? []
      arr.push(n)
      map.set(n.urgencia, arr)
    }
    const ordem: NotificacaoUrgencia[] = ['alta', 'media', 'baixa']
    return ordem.filter((u) => map.has(u)).map((u) => ({ urgencia: u, items: map.get(u)! }))
  }, [notificacoes])

  return (
    <div ref={ref} className="relative">
      {/* Botão sino */}
      <button
        onClick={() => setAberto((prev) => !prev)}
        className={cn(
          'relative flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200',
          aberto
            ? 'bg-gray-100 text-gray-900 shadow-sm'
            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700',
        )}
        aria-label={`Notificações${naoLidas > 0 ? ` (${naoLidas} não lidas)` : ''}`}
      >
        <Bell className={cn('h-[18px] w-[18px] transition-transform duration-200', aberto && 'scale-95')} />

        {naoLidas > 0 && (
          <span
            className={cn(
              'absolute -top-0.5 -right-0.5 flex items-center justify-center rounded-full text-[10px] font-bold text-white transition-all',
              naoLidas > 9 ? 'h-[18px] min-w-[18px] px-1' : 'h-[18px] w-[18px]',
              temAlta ? 'bg-red-500 animate-pulse' : 'bg-[#04c2fb]',
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
                  {naoLidas > 0 ? `${naoLidas} não lida${naoLidas > 1 ? 's' : ''}` : 'Tudo em dia'}
                </p>
              </div>
            </div>
            {naoLidas > 0 && (
              <button
                onClick={() => marcarTodasLidas()}
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
                <p className="text-xs text-muted-foreground">Você está em dia!</p>
              </div>
            ) : (
              <div className="py-1">
                {grupos.map(({ urgencia, items }) => {
                  const meta = URGENCIA_META[urgencia]
                  return (
                    <div key={urgencia}>
                      <div className="flex items-center gap-2 px-5 pt-3 pb-1.5">
                        <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} />
                        <span className={cn('text-[10px] font-bold uppercase tracking-wider', meta.cor)}>
                          {meta.label}
                        </span>
                        <span className="flex-1 h-px bg-gray-100" />
                        <span className={cn('text-[10px] font-semibold', meta.cor)}>{items.length}</span>
                      </div>

                      {items.map((n) => (
                        <NotificacaoItem
                          key={n.id}
                          notificacao={n}
                          mensagem={formatarMensagem(n)}
                          onLer={() => marcarLida(n.id)}
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
        </div>
      )}
    </div>
  )
}

/* ── Item de notificação ───────────────────────────────────────────────────── */

function NotificacaoItem({
  notificacao: n,
  mensagem,
  onLer,
  onDispensar,
  onFecharPainel,
}: {
  notificacao: Notificacao
  mensagem: string
  onLer: () => void
  onDispensar: () => void
  onFecharPainel: () => void
}) {
  const meta = URGENCIA_META[n.urgencia]
  const lida = !!n.lida_em

  return (
    <div
      className={cn(
        'group relative flex items-start gap-3 px-5 py-3 transition-colors hover:bg-gray-50/70',
        !lida && 'bg-[#04c2fb]/[0.02]',
      )}
      onMouseEnter={!lida ? onLer : undefined}
    >
      {!lida && (
        <span className="absolute left-1.5 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-[#04c2fb]" />
      )}

      <div className={cn(
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border',
        meta.bg,
        meta.border,
      )}>
        <CalendarRange className={cn('h-4 w-4', meta.icon)} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[13px] font-medium text-gray-800 leading-snug">
            {n.payload.paciente_nome ?? 'Paciente'}
          </p>
          <button
            onClick={(e) => { e.stopPropagation(); onDispensar() }}
            className="shrink-0 rounded-md p-0.5 text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-gray-200 hover:text-gray-600 transition-all"
            title="Dispensar"
          >
            <X className="h-3 w-3" />
          </button>
        </div>

        <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{mensagem}</p>

        <Link
          href={`/dashboard/pacientes/${n.referencia_id}`}
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
