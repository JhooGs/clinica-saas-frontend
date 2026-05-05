'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Building2, ChevronLeft, ChevronRight, X, FileText, HardDrive } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAdminClinicas } from '@/hooks/use-admin-clinicas'
import { cn } from '@/lib/utils'

const PLANO_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; dot: string }> = {
  free:        { label: 'Free',        color: 'text-gray-600',   bg: 'bg-gray-50',   border: 'border-gray-200',   dot: 'bg-gray-400' },
  solo:        { label: 'Solo',        color: 'text-cyan-700',   bg: 'bg-cyan-50',   border: 'border-cyan-200',   dot: 'bg-[#04c2fb]' },
  clinica:     { label: 'Clínica',     color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200', dot: 'bg-purple-500' },
  clinica_pro: { label: 'Clínica Pro', color: 'text-violet-700', bg: 'bg-violet-50', border: 'border-violet-200', dot: 'bg-violet-600' },
}

const PLANOS_FILTRO = ['free', 'solo', 'clinica', 'clinica_pro']

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
  if (pct === null) return <span className="text-xs text-emerald-600 font-medium">∞</span>
  const color = pct >= 80 ? 'bg-rose-500' : pct >= 60 ? 'bg-amber-500' : 'bg-emerald-500'
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-14 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <span className={cn('text-xs tabular-nums font-medium', pct >= 80 ? 'text-rose-600' : 'text-muted-foreground')}>
        {pct}%
      </span>
    </div>
  )
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(0)} KB`
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`
}

function StorageCell({
  bytesUsed, bytesLimite, pct, registros, documentos,
}: {
  bytesUsed: number; bytesLimite: number; pct: number | null; registros: number; documentos: number
}) {
  const cor = pct !== null && pct >= 80 ? 'bg-rose-500' : pct !== null && pct >= 60 ? 'bg-amber-400' : 'bg-[#04c2fb]'
  return (
    <div className="space-y-1.5 min-w-[130px]">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <HardDrive className="h-3 w-3 text-muted-foreground shrink-0" />
          <span className="text-xs tabular-nums font-medium text-gray-700">{formatBytes(bytesUsed)}</span>
        </div>
        {bytesLimite > 0
          ? <span className="text-[10px] text-muted-foreground">{formatBytes(bytesLimite)}</span>
          : <span className="text-[10px] text-muted-foreground italic">Sem limite</span>
        }
      </div>
      {bytesLimite > 0 && (
        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all', cor)}
            style={{ width: `${Math.min(pct ?? 0, 100)}%` }}
          />
        </div>
      )}
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-0.5"><FileText className="h-2.5 w-2.5" />{registros} reg.</span>
        <span>·</span>
        <span>{documentos} docs</span>
      </div>
    </div>
  )
}

export default function ClinicasPage() {
  const router = useRouter()
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

      {/* Busca + filtros */}
      <Card>
        <CardContent className="p-3 sm:p-4 space-y-3">
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
                      : 'border-transparent bg-muted/50 text-muted-foreground hover:bg-muted',
                  )}
                >
                  {cfg.label}
                </button>
              )
            })}
            <div className="w-px h-4 bg-border" />
            {([['Inativas', false, 'bg-rose-50 text-rose-700 border-rose-200 ring-rose-300'], ['Ativas', true, 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-300']] as const).map(([label, val, activeClasses]) => (
              <button
                key={label}
                onClick={() => { setFiltroAtivo(filtroAtivo === val ? undefined : val); setPage(1) }}
                className={cn(
                  'px-2.5 py-1 rounded-full text-xs font-medium border transition-all',
                  filtroAtivo === val
                    ? cn(activeClasses, 'ring-2 ring-offset-1')
                    : 'border-transparent bg-muted/50 text-muted-foreground hover:bg-muted',
                )}
              >
                {label}
              </button>
            ))}
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
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider hidden lg:table-cell">Storage</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider hidden xl:table-cell">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider hidden xl:table-cell">Criada</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  [...Array(6)].map((_, i) => (
                    <tr key={i} className="border-b animate-pulse">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-muted shrink-0" />
                          <div className="h-4 bg-muted rounded w-36" />
                        </div>
                      </td>
                      <td className="px-4 py-3.5"><div className="h-5 bg-muted rounded-full w-16" /></td>
                      <td className="px-4 py-3.5 hidden sm:table-cell"><div className="h-4 bg-muted rounded w-24" /></td>
                      <td className="px-4 py-3.5 hidden md:table-cell"><div className="h-4 bg-muted rounded w-10" /></td>
                      <td className="px-4 py-3.5 hidden lg:table-cell"><div className="h-8 bg-muted rounded w-20" /></td>
                      <td className="px-4 py-3.5 hidden xl:table-cell"><div className="h-5 bg-muted rounded-full w-14" /></td>
                      <td className="px-4 py-3.5 hidden xl:table-cell"><div className="h-4 bg-muted rounded w-20" /></td>
                    </tr>
                  ))
                ) : data?.items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-16 text-center">
                      <Building2 className="h-10 w-10 mx-auto text-muted-foreground/20 mb-3" />
                      <p className="text-muted-foreground text-sm">Nenhuma clínica encontrada.</p>
                    </td>
                  </tr>
                ) : (
                  data?.items.map((c) => {
                    const cfg = PLANO_CONFIG[c.plano]
                    return (
                      <tr
                        key={c.id}
                        onClick={() => router.push(`/clinitra-admin/clinicas/${c.id}`)}
                        className="border-b hover:bg-muted/30 transition-colors cursor-pointer"
                      >
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <ClinicaAvatar nome={c.nome} />
                            <div className="min-w-0">
                              <p className="font-semibold text-gray-900 truncate max-w-[160px]">{c.nome}</p>
                              {!c.ativo && (
                                <p className="text-[10px] text-rose-500 font-medium">Inativa</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <div className={cn('h-2 w-2 rounded-full shrink-0', cfg?.dot ?? 'bg-gray-400')} />
                            <Badge
                              variant="outline"
                              className={cn('text-xs font-semibold whitespace-nowrap', cfg?.color, cfg?.bg, cfg?.border)}
                            >
                              {cfg?.label ?? c.plano}
                            </Badge>
                            {c.trial_expira_em && new Date(c.trial_expira_em) > new Date() && (
                              <Badge className="text-[10px] font-semibold bg-amber-100 text-amber-700 border border-amber-300 whitespace-nowrap px-1.5 py-0">
                                Trial
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 hidden sm:table-cell">
                          <div className="space-y-1.5">
                            <span className="text-xs tabular-nums font-medium text-gray-700">
                              {c.pacientes_count}{c.quota_pacientes ? `/${c.quota_pacientes}` : ''}
                            </span>
                            <UsageBar pct={c.uso_pacientes_pct} />
                          </div>
                        </td>
                        <td className="px-4 py-3.5 hidden md:table-cell">
                          <div className="space-y-1.5">
                            <span className="text-xs tabular-nums font-medium text-gray-700">
                              {c.usuarios_count}{c.quota_usuarios ? `/${c.quota_usuarios}` : ''}
                            </span>
                            <UsageBar pct={c.uso_usuarios_pct} />
                          </div>
                        </td>
                        <td className="px-4 py-3.5 hidden lg:table-cell">
                          <StorageCell
                            bytesUsed={c.storage_bytes_used}
                            bytesLimite={c.storage_bytes_limite}
                            pct={c.storage_uso_pct}
                            registros={c.registros_count}
                            documentos={c.documentos_count}
                          />
                        </td>
                        <td className="px-4 py-3.5 hidden xl:table-cell">
                          <div className="flex items-center gap-1.5">
                            <div className={cn('h-2 w-2 rounded-full', c.ativo ? 'bg-emerald-500' : 'bg-gray-300')} />
                            <span className={cn('text-xs', c.ativo ? 'text-emerald-700 font-medium' : 'text-muted-foreground')}>
                              {c.ativo ? 'Ativa' : 'Inativa'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 hidden xl:table-cell text-xs text-muted-foreground whitespace-nowrap">
                          {c.criado_em ? new Date(c.criado_em).toLocaleDateString('pt-BR') : '-'}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-xs text-muted-foreground">
                Página {page} de {totalPages} · {data?.total} total
              </p>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={(e) => { e.stopPropagation(); setPage(page - 1) }}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={(e) => { e.stopPropagation(); setPage(page + 1) }}>
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
