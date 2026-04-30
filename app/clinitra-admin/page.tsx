'use client'

import { Building2, DollarSign, Users, UserPlus, TrendingUp, TrendingDown, Activity } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAdminMetricas } from '@/hooks/use-admin-metricas'
import { cn } from '@/lib/utils'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

const PLANO_CONFIG: Record<string, { label: string; color: string; bg: string; bar: string }> = {
  free:        { label: 'Free',        color: 'text-gray-600',   bg: 'bg-gray-100',   bar: 'bg-gray-400' },
  solo:        { label: 'Solo',        color: 'text-cyan-700',   bg: 'bg-cyan-100',   bar: 'bg-[#04c2fb]' },
  clinica:     { label: 'Clínica',     color: 'text-purple-700', bg: 'bg-purple-100', bar: 'bg-purple-500' },
  clinica_pro: { label: 'Clínica Pro', color: 'text-violet-700', bg: 'bg-violet-100', bar: 'bg-violet-600' },
}

// ── Componentes ───────────────────────────────────────────────────────────────

function MetricCard({
  title,
  value,
  sub,
  icon: Icon,
  iconBg,
}: {
  title: string
  value: string | number
  sub: string
  icon: React.ElementType
  iconBg: string
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm text-muted-foreground font-medium truncate">{title}</p>
            <p className="text-2xl sm:text-3xl font-bold mt-1 tabular-nums leading-none">{value}</p>
            <p className="text-xs text-muted-foreground mt-1.5">{sub}</p>
          </div>
          <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', iconBg)}>
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function PlanDistribution({ por_plano }: { por_plano: Record<string, number> }) {
  const total = Object.values(por_plano).reduce((a, b) => a + b, 0)
  if (total === 0) return null

  const order = ['free', 'solo', 'clinica', 'clinica_pro']
  const entries = order
    .filter(k => por_plano[k] > 0)
    .map(k => ({ key: k, count: por_plano[k], pct: Math.round((por_plano[k] / total) * 100) }))

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Distribuição por Plano
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Barra empilhada */}
        <div className="flex h-3 w-full overflow-hidden rounded-full gap-0.5">
          {entries.map(e => {
            const cfg = PLANO_CONFIG[e.key]
            return (
              <div
                key={e.key}
                className={cn('h-full transition-all', cfg?.bar ?? 'bg-gray-300')}
                style={{ width: `${e.pct}%` }}
                title={`${cfg?.label ?? e.key}: ${e.count}`}
              />
            )
          })}
        </div>

        {/* Legenda */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {entries.map(e => {
            const cfg = PLANO_CONFIG[e.key]
            return (
              <div key={e.key} className="flex items-center gap-2">
                <div className={cn('h-2.5 w-2.5 rounded-full shrink-0', cfg?.bar ?? 'bg-gray-300')} />
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{cfg?.label ?? e.key}</p>
                  <p className="text-xs text-muted-foreground">{e.count} · {e.pct}%</p>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

function CrescimentoChart({ crescimento }: { crescimento: { mes: string; novas: number }[] }) {
  if (crescimento.length === 0) return null
  const max = Math.max(...crescimento.map(c => c.novas), 1)

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Novas Clínicas por Mês
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-2 h-36">
          {crescimento.map((item, idx) => {
            const heightPct = (item.novas / max) * 100
            const prev = idx > 0 ? crescimento[idx - 1].novas : item.novas
            const up = item.novas >= prev

            return (
              <div key={item.mes} className="flex flex-col items-center gap-1 flex-1 min-w-0">
                <div className="flex items-center gap-0.5 text-[11px] font-semibold">
                  <span>{item.novas}</span>
                  {up
                    ? <TrendingUp className="h-3 w-3 text-emerald-500" />
                    : <TrendingDown className="h-3 w-3 text-rose-400" />
                  }
                </div>
                <div className="relative w-full flex-1 flex items-end">
                  <div
                    className="w-full rounded-t-md transition-all min-h-[4px]"
                    style={{
                      height: `${Math.max(heightPct, 4)}%`,
                      background: 'linear-gradient(180deg, #04c2fb 0%, #0094c8 100%)',
                    }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">{item.mes.slice(5)}</span>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// ── Skeleton de loading ───────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 bg-muted rounded w-48 animate-pulse" />
      <div
        className="rounded-2xl p-6 animate-pulse"
        style={{ background: 'linear-gradient(135deg, #0094c8 0%, #04c2fb 60%, #00d5f5 100%)' }}
      >
        <div className="h-4 bg-white/20 rounded w-32 mb-3" />
        <div className="h-10 bg-white/20 rounded w-40" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-5 h-24 bg-muted/20" />
          </Card>
        ))}
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function ClintraAdminDashboard() {
  const { data, isLoading, error } = useAdminMetricas()

  if (isLoading) return <Skeleton />

  if (error || !data) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl sm:text-2xl font-bold">Painel Clinitra</h1>
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Erro ao carregar métricas. Verifique se o backend está rodando.
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ background: 'linear-gradient(135deg, #0094c8 0%, #04c2fb 60%, #00d5f5 100%)' }}
        >
          <Activity className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold leading-tight">Visão Geral</h1>
          <p className="text-sm text-muted-foreground">Métricas da plataforma Clinitra</p>
        </div>
      </div>

      {/* MRR — card hero */}
      <div
        className="relative overflow-hidden rounded-2xl p-5 sm:p-6"
        style={{ background: 'linear-gradient(135deg, #0094c8 0%, #04c2fb 60%, #00d5f5 100%)' }}
      >
        {/* Círculo decorativo */}
        <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10" />
        <div className="absolute -right-2 top-8 h-24 w-24 rounded-full bg-white/10" />

        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="h-4 w-4 text-white/70" />
            <p className="text-sm font-medium text-white/80 uppercase tracking-wider">MRR Estimado</p>
          </div>
          <p className="text-3xl sm:text-4xl font-bold text-white tabular-nums">
            {formatCurrency(data.mrr_estimado)}
          </p>
          <p className="text-sm text-white/70 mt-2">
            {data.novas_clinicas_mes} novas clínicas este mês · {data.clinicas_ativas} ativas
          </p>
        </div>
      </div>

      {/* Cards de métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          title="Total de Clínicas"
          value={data.clinicas_total}
          sub={`${data.clinicas_inativas} inativas`}
          icon={Building2}
          iconBg="bg-[#0094c8]"
        />
        <MetricCard
          title="Total de Pacientes"
          value={data.pacientes_total.toLocaleString('pt-BR')}
          sub={`em ${data.clinicas_ativas} clínicas`}
          icon={Users}
          iconBg="bg-purple-500"
        />
        <MetricCard
          title="Total de Usuários"
          value={data.usuarios_total}
          sub="profissionais ativos"
          icon={UserPlus}
          iconBg="bg-emerald-500"
        />
      </div>

      {/* Distribuição por plano + gráfico */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PlanDistribution por_plano={data.clinicas_por_plano} />
        <CrescimentoChart crescimento={data.crescimento_mensal} />
      </div>
    </div>
  )
}
