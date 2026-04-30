'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { Search, Building2, ChevronLeft, ChevronRight, ArrowRight, X } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAdminClinicas } from '@/hooks/use-admin-clinicas'
import { cn } from '@/lib/utils'

const PLANO_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  free:        { label: 'Free',        color: 'text-gray-600',   bg: 'bg-gray-50',   border: 'border-gray-200' },
  solo:        { label: 'Solo',        color: 'text-cyan-700',   bg: 'bg-cyan-50',   border: 'border-cyan-200' },
  clinica:     { label: 'Clínica',     color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200' },
  clinica_pro: { label: 'Clínica Pro', color: 'text-violet-700', bg: 'bg-violet-50', border: 'border-violet-200' },
}

function planoLabel(p: string) {
  return PLANO_CONFIG[p]?.label ?? p
}

function ClinicaAvatar({ nome }: { nome: string }) {
  const iniciais = nome.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('')
  return (
    <div
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
      style={{ background: 'linear-gradient(135deg, #0094c8, #04c2fb)' }}
    >
      {iniciais || <Building2 className="h-4 w-4" />}
    </div>
  )
}

function UsageBar({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-xs text-muted-foreground">∞</span>
  const color = pct >= 80 ? 'bg-rose-500' : pct >= 60 ? 'bg-amber-500' : 'bg-emerald-500'
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full', color)} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <span className={cn('text-xs tabular-nums', pct >= 80 ? 'text-rose-600 font-medium' : 'text-muted-foreground')}>
        {pct}%
      </span>
    </div>
  )
}

const PLANOS_FILTRO = ['free', 'solo', 'clinica', 'clinica_pro']

export default function ClinicasPage() {
  const [busca, setBusca] = useState('')
  const [buscaDebounced, setBuscaDebounced] = useState('')
  const [page, setPage] = useState(1)
  const [filtroPlano, setFiltroPlano] = useState<string | undefined>()
  const [filtroAtivo, setFiltroAtivo] = useState<boolean | undefined>()
  const buscaTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { data, isLoading } = useAdminClinicas({
    busca: buscaDebounced || undefined,
    plano: filtroPlano,
    ativo: filtroAtivo,
    page,
    per_page: 20,
  })

  function handleBusca(value: string) {
    setBusca(value)
    setPage(1)
    if (buscaTimerRef.current) clearTimeout(buscaTimerRef.current)
    buscaTimerRef.current = setTimeout(() => setBuscaDebounced(value), 400)
  }

  function limparBusca() {
    setBusca('')
    setBuscaDebounced('')
    setPage(1)
  }

  const totalPages = data ? Math.ceil(data.total / data.per_page) : 0

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ background: 'linear-gradient(135deg, #0094c8 0%, #04c2fb 60%, #00d5f5 100%)' }}
        >
          <Building2 className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold leading-tight">Clínicas</h1>
          <p className="text-sm text-muted-foreground">
            {data ? `${data.total} clínica${data.total !== 1 ? 's' : ''} cadastrada${data.total !== 1 ? 's' : ''}` : 'Carregando...'}
          </p>
        </div>
      </div>

      {/* Barra de busca + filtros */}
      <Card>
        <CardContent className="p-3 sm:p-4 space-y-3">
          {/* Busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou CNPJ..."
              value={busca}
              onChange={(e) => handleBusca(e.target.value)}
              className="pl-9 pr-9"
            />
            {busca && (
              <button onClick={limparBusca} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Filtros de plano */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground font-medium">Plano:</span>
            {PLANOS_FILTRO.map(p => {
              const cfg = PLANO_CONFIG[p]
              const ativo = filtroPlano === p
              return (
                <button
                  key={p}
                  onClick={() => { setFiltroPlano(ativo ? undefined : p); setPage(1) }}
                  className={cn(
                    'px-2.5 py-1 rounded-full text-xs font-medium border transition-all',
                    ativo
                      ? cn(cfg.color, cfg.bg, cfg.border, 'ring-2 ring-offset-1 ring-current/30')
                      : 'border-transparent bg-muted/50 text-muted-foreground hover:bg-muted'
                  )}
                >
                  {cfg.label}
                </button>
              )
            })}

            <div className="w-px h-4 bg-border" />

            <button
              onClick={() => { setFiltroAtivo(filtroAtivo === false ? undefined : false); setPage(1) }}
              className={cn(
                'px-2.5 py-1 rounded-full text-xs font-medium border transition-all',
                filtroAtivo === false
                  ? 'bg-rose-50 text-rose-700 border-rose-200 ring-2 ring-offset-1 ring-rose-300'
                  : 'border-transparent bg-muted/50 text-muted-foreground hover:bg-muted'
              )}
            >
              Inativas
            </button>
            <button
              onClick={() => { setFiltroAtivo(filtroAtivo === true ? undefined : true); setPage(1) }}
              className={cn(
                'px-2.5 py-1 rounded-full text-xs font-medium border transition-all',
                filtroAtivo === true
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-2 ring-offset-1 ring-emerald-300'
                  : 'border-transparent bg-muted/50 text-muted-foreground hover:bg-muted'
              )}
            >
              Ativas
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Clínica</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Plano</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider hidden sm:table-cell">Pacientes</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider hidden md:table-cell">Usuários</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider hidden lg:table-cell">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider hidden lg:table-cell">Criada em</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="border-b animate-pulse">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-muted" />
                          <div className="h-4 bg-muted rounded w-32" />
                        </div>
                      </td>
                      <td className="px-4 py-3"><div className="h-5 bg-muted rounded-full w-16" /></td>
                      <td className="px-4 py-3 hidden sm:table-cell"><div className="h-4 bg-muted rounded w-24" /></td>
                      <td className="px-4 py-3 hidden md:table-cell"><div className="h-4 bg-muted rounded w-10" /></td>
                      <td className="px-4 py-3 hidden lg:table-cell"><div className="h-5 bg-muted rounded-full w-14" /></td>
                      <td className="px-4 py-3 hidden lg:table-cell"><div className="h-4 bg-muted rounded w-20" /></td>
                      <td className="px-4 py-3" />
                    </tr>
                  ))
                ) : data?.items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <Building2 className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
                      <p className="text-muted-foreground text-sm">Nenhuma clínica encontrada.</p>
                    </td>
                  </tr>
                ) : (
                  data?.items.map((c) => {
                    const planoCfg = PLANO_CONFIG[c.plano]
                    return (
                      <tr key={c.id} className="border-b hover:bg-muted/20 transition-colors group">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <ClinicaAvatar nome={c.nome} />
                            <span className="font-medium text-gray-900 truncate max-w-[140px]">{c.nome}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant="outline"
                            className={cn('text-xs font-semibold', planoCfg?.color, planoCfg?.bg, planoCfg?.border)}
                          >
                            {planoCfg?.label ?? c.plano}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <div className="space-y-1">
                            <span className="text-xs tabular-nums text-gray-700">
                              {c.pacientes_count}{c.quota_pacientes ? `/${c.quota_pacientes}` : ''}
                            </span>
                            <UsageBar pct={c.uso_pacientes_pct} />
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className="text-xs tabular-nums text-gray-700">
                            {c.usuarios_count}{c.quota_usuarios ? `/${c.quota_usuarios}` : ''}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <div className="flex items-center gap-1.5">
                            <div className={cn('h-2 w-2 rounded-full', c.ativo ? 'bg-emerald-500' : 'bg-gray-300')} />
                            <span className="text-xs text-muted-foreground">{c.ativo ? 'Ativa' : 'Inativa'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground">
                          {c.criado_em ? new Date(c.criado_em).toLocaleDateString('pt-BR') : '-'}
                        </td>
                        <td className="px-4 py-3">
                          <Link href={`/clinitra-admin/clinicas/${c.id}`}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-xs text-muted-foreground">
                Página {page} de {totalPages} · {data?.total} total
              </p>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
