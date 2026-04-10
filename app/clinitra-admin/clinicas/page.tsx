'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { Search, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAdminClinicas } from '@/hooks/use-admin-clinicas'
import { cn } from '@/lib/utils'

const PLANO_COLORS: Record<string, string> = {
  free: 'bg-gray-100 text-gray-700 border-gray-200',
  pro: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  clinica: 'bg-purple-50 text-purple-700 border-purple-200',
}

function UsageBar({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-xs text-muted-foreground">Ilimitado</span>
  const color = pct >= 80 ? 'bg-red-500' : pct >= 60 ? 'bg-amber-500' : 'bg-emerald-500'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden min-w-[60px]">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <span className={cn('text-xs font-medium tabular-nums', pct >= 80 ? 'text-red-600' : 'text-muted-foreground')}>
        {pct}%
      </span>
    </div>
  )
}

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

  // Debounce da busca
  const handleBusca = (value: string) => {
    setBusca(value)
    setPage(1)
    if (buscaTimerRef.current) clearTimeout(buscaTimerRef.current)
    buscaTimerRef.current = setTimeout(() => setBuscaDebounced(value), 400)
  }

  const totalPages = data ? Math.ceil(data.total / data.per_page) : 0

  return (
    <div className="space-y-4 sm:space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold">Clinicas</h1>

      {/* Filtros */}
      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou CNPJ..."
                value={busca}
                onChange={(e) => handleBusca(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {['free', 'pro', 'clinica'].map((p) => (
                <Button
                  key={p}
                  variant={filtroPlano === p ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => { setFiltroPlano(filtroPlano === p ? undefined : p); setPage(1) }}
                  className="text-xs capitalize"
                >
                  {p}
                </Button>
              ))}
              <Button
                variant={filtroAtivo === false ? 'destructive' : 'outline'}
                size="sm"
                onClick={() => { setFiltroAtivo(filtroAtivo === false ? undefined : false); setPage(1) }}
                className="text-xs"
              >
                Inativas
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center justify-between">
            <span>Todas as clinicas</span>
            {data && <span className="text-sm font-normal text-muted-foreground">{data.total} total</span>}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium">Nome</th>
                  <th className="text-left px-4 py-3 font-medium">Plano</th>
                  <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Pacientes</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Usuarios</th>
                  <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Status</th>
                  <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Criada em</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="border-b animate-pulse">
                      <td className="px-4 py-3"><div className="h-4 bg-muted rounded w-32" /></td>
                      <td className="px-4 py-3"><div className="h-4 bg-muted rounded w-16" /></td>
                      <td className="px-4 py-3 hidden sm:table-cell"><div className="h-4 bg-muted rounded w-20" /></td>
                      <td className="px-4 py-3 hidden md:table-cell"><div className="h-4 bg-muted rounded w-12" /></td>
                      <td className="px-4 py-3 hidden lg:table-cell"><div className="h-4 bg-muted rounded w-16" /></td>
                      <td className="px-4 py-3 hidden lg:table-cell"><div className="h-4 bg-muted rounded w-20" /></td>
                      <td className="px-4 py-3" />
                    </tr>
                  ))
                ) : data?.items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      Nenhuma clinica encontrada.
                    </td>
                  </tr>
                ) : (
                  data?.items.map((c) => (
                    <tr key={c.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium">{c.nome}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={cn('text-xs capitalize', PLANO_COLORS[c.plano])}>
                          {c.plano}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <div className="flex items-center gap-2">
                          <span className="text-xs tabular-nums">{c.pacientes_count}{c.quota_pacientes ? `/${c.quota_pacientes}` : ''}</span>
                          <UsageBar pct={c.uso_pacientes_pct} />
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-xs tabular-nums">{c.usuarios_count}{c.quota_usuarios ? `/${c.quota_usuarios}` : ''}</span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <Badge variant={c.ativo ? 'default' : 'destructive'} className="text-xs">
                          {c.ativo ? 'Ativa' : 'Inativa'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground">
                        {c.criado_em ? new Date(c.criado_em).toLocaleDateString('pt-BR') : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/clinitra-admin/clinicas/${c.id}`}>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Paginacao */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-xs text-muted-foreground">
                Pagina {page} de {totalPages}
              </p>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
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
