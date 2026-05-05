'use client'

import { useState } from 'react'
import { Building2, DollarSign, Users, UserPlus, Activity } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAdminMetricas } from '@/hooks/use-admin-metricas'
import { cn } from '@/lib/utils'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  TooltipProps,
} from 'recharts'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

const MESES_ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function mesAbrev(mesStr: string) {
  const num = parseInt(mesStr, 10)
  return MESES_ABREV[(num - 1) % 12] ?? mesStr
}

const PLANO_CONFIG: Record<string, { label: string; color: string; hex: string }> = {
  free:        { label: 'Free',        color: 'text-gray-600',   hex: '#9ca3af' },
  solo:        { label: 'Solo',        color: 'text-cyan-700',   hex: '#04c2fb' },
  clinica:     { label: 'Clínica',     color: 'text-purple-700', hex: '#a855f7' },
  clinica_pro: { label: 'Clínica Pro', color: 'text-violet-700', hex: '#7c3aed' },
}

// ── MetricCard ────────────────────────────────────────────────────────────────

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

// ── PlanDistribution — Donut Chart ────────────────────────────────────────────

function PlanDistribution({ por_plano }: { por_plano: Record<string, number> }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  const total = Object.values(por_plano).reduce((a, b) => a + b, 0)
  if (total === 0) return null

  const order = ['free', 'solo', 'clinica', 'clinica_pro']
  const data = order
    .filter(k => (por_plano[k] ?? 0) > 0)
    .map(k => ({
      name: PLANO_CONFIG[k]?.label ?? k,
      value: por_plano[k],
      pct: Math.round((por_plano[k] / total) * 100),
      hex: PLANO_CONFIG[k]?.hex ?? '#9ca3af',
    }))

  const active = activeIndex !== null ? data[activeIndex] : null

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Distribuição por Plano
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          {/* Donut */}
          <div className="relative w-44 h-44 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={70}
                  paddingAngle={3}
                  dataKey="value"
                  strokeWidth={0}
                  onMouseEnter={(_, index) => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                >
                  {data.map((entry, index) => (
                    <Cell
                      key={entry.name}
                      fill={entry.hex}
                      opacity={activeIndex === null || activeIndex === index ? 1 : 0.35}
                      style={{ cursor: 'pointer', transition: 'opacity 0.15s' }}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            {/* Centro: total ou info do segmento ativo */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none transition-all">
              {active ? (
                <>
                  <span
                    className="text-xl font-bold tabular-nums leading-none transition-colors"
                    style={{ color: active.hex }}
                  >
                    {active.value}
                  </span>
                  <span className="text-[11px] font-medium mt-0.5" style={{ color: active.hex }}>
                    {active.pct}%
                  </span>
                  <span className="text-[10px] text-muted-foreground mt-0.5 max-w-[80px] text-center leading-tight">
                    {active.name}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-2xl font-bold tabular-nums leading-none">{total}</span>
                  <span className="text-[11px] text-muted-foreground mt-0.5">clínicas</span>
                </>
              )}
            </div>
          </div>

          {/* Legenda */}
          <div className="flex flex-col gap-2.5 w-full">
            {data.map((entry, index) => (
              <div
                key={entry.name}
                className="flex items-center justify-between gap-2 min-w-0 transition-opacity"
                style={{ opacity: activeIndex === null || activeIndex === index ? 1 : 0.4 }}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: entry.hex }} />
                  <span className="text-sm font-medium truncate">{entry.name}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${entry.pct}%`, background: entry.hex }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-14 text-right tabular-nums">
                    {entry.value} · {entry.pct}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ── CrescimentoChart — Bar Chart ──────────────────────────────────────────────

function BarTooltipContent({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid #e5e7eb',
      borderRadius: 8,
      padding: '6px 12px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
      fontSize: 12,
      lineHeight: '1.5',
    }}>
      <p style={{ fontWeight: 600, color: '#111827', marginBottom: 2 }}>{label}</p>
      <p style={{ color: '#6b7280' }}>
        <span style={{ fontWeight: 500, color: '#111827' }}>{payload[0].value}</span>{' '}
        nova{(payload[0].value as number) !== 1 ? 's' : ''} clínica{(payload[0].value as number) !== 1 ? 's' : ''}
      </p>
    </div>
  )
}

function CrescimentoChart({ crescimento }: { crescimento: { mes: string; novas: number }[] }) {
  if (crescimento.length === 0) return null

  const data = crescimento.map(c => ({
    mes: mesAbrev(c.mes.slice(5)),
    mesCompleto: c.mes,
    novas: c.novas,
  }))

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Novas Clínicas por Mês
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={176}>
          <BarChart data={data} margin={{ top: 4, right: 4, left: -28, bottom: 0 }} barCategoryGap="35%">
            <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
            <XAxis
              dataKey="mes"
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<BarTooltipContent />} cursor={{ fill: 'rgba(0,0,0,0.05)', radius: 6 }} />
            <Bar dataKey="novas" radius={[6, 6, 0, 0]}>
              {data.map((_, idx) => (
                <Cell
                  key={idx}
                  fill={`url(#barGrad-${idx})`}
                />
              ))}
              <defs>
                {data.map((_, idx) => (
                  <linearGradient key={idx} id={`barGrad-${idx}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#04c2fb" stopOpacity={1} />
                    <stop offset="100%" stopColor="#0094c8" stopOpacity={0.8} />
                  </linearGradient>
                ))}
              </defs>
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[...Array(2)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-5 h-52 bg-muted/20" />
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

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PlanDistribution por_plano={data.clinicas_por_plano} />
        <CrescimentoChart crescimento={data.crescimento_mensal} />
      </div>
    </div>
  )
}
