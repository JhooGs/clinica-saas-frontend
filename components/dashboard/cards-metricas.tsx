'use client'

import { CalendarDays, DollarSign, TrendingUp, TrendingDown, Minus, UserCheck, Heart } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDashboardMetricas } from '@/hooks/use-dashboard-metricas'

// ---------------------------------------------------------------------------
// Delta
// ---------------------------------------------------------------------------

interface DeltaProps {
  valor: number | null
  label: string
  formato: 'inteiro' | 'real' | 'percent'
  neutro?: boolean
  labelNeutro?: string
}

function Delta({ valor, label, formato, neutro, labelNeutro }: DeltaProps) {
  if (neutro) {
    return <p className="text-[11px] text-muted-foreground">{labelNeutro}</p>
  }
  if (valor === null) {
    return <p className="text-[11px] text-muted-foreground">Primeiro mês</p>
  }
  if (valor === 0) {
    return (
      <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
        <Minus className="h-3 w-3 shrink-0" />
        Igual a {label}
      </p>
    )
  }

  const abs = Math.abs(valor)
  let absStr: string
  if (formato === 'real') {
    absStr = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(abs)
  } else if (formato === 'percent') {
    absStr = `${abs}%`
  } else {
    absStr = String(abs)
  }

  const positivo = valor > 0
  return (
    <p className={cn(
      'flex items-center gap-1 text-[11px] font-medium leading-tight',
      positivo ? 'text-emerald-600' : 'text-red-500',
    )}>
      {positivo
        ? <TrendingUp className="h-3 w-3 shrink-0" />
        : <TrendingDown className="h-3 w-3 shrink-0" />
      }
      <span>{positivo ? '+' : '-'}{absStr} que {label}</span>
    </p>
  )
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function CardSkeleton() {
  return (
    <div className="rounded-xl border bg-white p-3 sm:p-4 shadow-sm flex flex-col gap-2 sm:gap-3 animate-pulse">
      <div className="flex items-center gap-2">
        <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-muted shrink-0" />
        <div className="h-3 w-28 rounded bg-muted" />
      </div>
      <div className="h-7 w-14 rounded bg-muted" />
      <div className="pt-2 border-t">
        <div className="h-3 w-32 rounded bg-muted" />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Card base
// ---------------------------------------------------------------------------

interface MetricaCardProps {
  icon: React.ElementType
  titulo: string
  valor: string | number
  delta: React.ReactNode
}

function MetricaCard({ icon: Icon, titulo, valor, delta }: MetricaCardProps) {
  return (
    <div className="rounded-xl border bg-white p-3 sm:p-4 shadow-sm flex flex-col gap-2 sm:gap-3 transition-shadow hover:shadow-md">
      <div className="flex items-center gap-2">
        <div
          className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: 'linear-gradient(135deg, #0094c8 0%, #04c2fb 100%)' }}
        >
          <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
        </div>
        <span className="text-[11px] sm:text-xs font-medium text-muted-foreground leading-tight">
          {titulo}
        </span>
      </div>

      <p className="text-2xl font-bold text-gray-900 leading-none tabular-nums tracking-tight">
        {valor}
      </p>

      <div className="pt-2 border-t">
        {delta}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export function CardsMetricasDashboard() {
  const {
    loading,
    atendimentosSemana,
    deltaAtendimentos,
    faturamentoMes,
    deltaFaturamento,
    taxaPresenca,
    deltaPresenca,
    gratuitos,
    nomeMesPassado,
  } = useDashboardMetricas()

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
      </div>
    )
  }

  const faturamentoFormatado = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(faturamentoMes)

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">

      {/* Atendimentos da semana */}
      <MetricaCard
        icon={CalendarDays}
        titulo="Atendimentos na semana"
        valor={atendimentosSemana}
        delta={
          <Delta
            valor={deltaAtendimentos}
            label={`a média de ${nomeMesPassado}`}
            formato="inteiro"
          />
        }
      />

      {/* Faturamento do mês */}
      <MetricaCard
        icon={DollarSign}
        titulo="Faturamento do mês"
        valor={faturamentoFormatado}
        delta={
          <Delta
            valor={deltaFaturamento}
            label={nomeMesPassado}
            formato="real"
          />
        }
      />

      {/* Taxa de presença */}
      <MetricaCard
        icon={UserCheck}
        titulo="Taxa de presença"
        valor={`${taxaPresenca}%`}
        delta={
          <Delta
            valor={deltaPresenca}
            label={nomeMesPassado}
            formato="percent"
          />
        }
      />

      {/* Pacientes em gratuidade */}
      <MetricaCard
        icon={Heart}
        titulo="Pacientes em gratuidade"
        valor={gratuitos}
        delta={
          <Delta
            valor={null}
            label=""
            formato="inteiro"
            neutro
            labelNeutro={gratuitos === 1 ? 'paciente ativo sem cobrança' : 'pacientes ativos sem cobrança'}
          />
        }
      />

    </div>
  )
}
