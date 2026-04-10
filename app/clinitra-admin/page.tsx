'use client'

import { Building2, DollarSign, Users, UserPlus, TrendingUp, TrendingDown } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAdminMetricas } from '@/hooks/use-admin-metricas'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function PlanoBadge({ plano, count }: { plano: string; count: number }) {
  const colors: Record<string, string> = {
    free: 'bg-gray-100 text-gray-700',
    pro: 'bg-cyan-100 text-cyan-700',
    clinica: 'bg-purple-100 text-purple-700',
  }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${colors[plano] ?? 'bg-gray-100 text-gray-700'}`}>
      {plano.charAt(0).toUpperCase() + plano.slice(1)}: {count}
    </span>
  )
}

export default function ClintraAdminDashboard() {
  const { data, isLoading, error } = useAdminMetricas()

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl sm:text-2xl font-bold">Painel Clinitra</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4 sm:p-6">
                <div className="h-4 bg-muted rounded w-24 mb-3" />
                <div className="h-8 bg-muted rounded w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl sm:text-2xl font-bold">Painel Clinitra</h1>
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Erro ao carregar metricas. Verifique se o backend esta rodando.
          </CardContent>
        </Card>
      </div>
    )
  }

  const metricas = [
    {
      title: 'Total Clinicas',
      value: data.clinicas_total,
      icon: Building2,
      detail: `${data.clinicas_ativas} ativas`,
      color: 'text-cyan-600',
    },
    {
      title: 'MRR Estimado',
      value: formatCurrency(data.mrr_estimado),
      icon: DollarSign,
      detail: `${data.novas_clinicas_mes} novas este mes`,
      color: 'text-emerald-600',
    },
    {
      title: 'Total Pacientes',
      value: data.pacientes_total.toLocaleString('pt-BR'),
      icon: Users,
      detail: `em ${data.clinicas_ativas} clinicas`,
      color: 'text-blue-600',
    },
    {
      title: 'Total Usuarios',
      value: data.usuarios_total,
      icon: UserPlus,
      detail: `${data.clinicas_inativas} clinicas inativas`,
      color: 'text-purple-600',
    },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold">Painel Clinitra</h1>

      {/* Cards de metricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricas.map((m) => (
          <Card key={m.title}>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs sm:text-sm text-muted-foreground font-medium">{m.title}</p>
                <m.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${m.color}`} />
              </div>
              <p className="text-xl sm:text-2xl font-bold">{m.value}</p>
              <p className="text-[11px] sm:text-xs text-muted-foreground mt-1">{m.detail}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Distribuicao por plano */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg">Distribuicao por Plano</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 sm:gap-3">
          {Object.entries(data.clinicas_por_plano).map(([plano, count]) => (
            <PlanoBadge key={plano} plano={plano} count={count} />
          ))}
        </CardContent>
      </Card>

      {/* Crescimento mensal */}
      {data.crescimento_mensal.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg">Crescimento Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <div className="flex items-end gap-3 sm:gap-4 min-w-[300px] h-40 sm:h-48">
                {data.crescimento_mensal.map((item, idx) => {
                  const maxNovas = Math.max(...data.crescimento_mensal.map(c => c.novas), 1)
                  const heightPct = (item.novas / maxNovas) * 100
                  const prev = idx > 0 ? data.crescimento_mensal[idx - 1].novas : item.novas
                  const trend = item.novas >= prev ? 'up' : 'down'

                  return (
                    <div key={item.mes} className="flex flex-col items-center gap-1 flex-1">
                      <div className="flex items-center gap-0.5 text-[10px] sm:text-xs font-semibold">
                        {item.novas}
                        {trend === 'up'
                          ? <TrendingUp className="h-3 w-3 text-emerald-500" />
                          : <TrendingDown className="h-3 w-3 text-red-400" />
                        }
                      </div>
                      <div
                        className="w-full rounded-t-md bg-cyan-500/80 transition-all min-h-[4px]"
                        style={{ height: `${Math.max(heightPct, 3)}%` }}
                      />
                      <span className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">
                        {item.mes.slice(5)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
