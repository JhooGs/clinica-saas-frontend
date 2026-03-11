import { Users, TrendingUp, Clock, FileText } from 'lucide-react'

const cards = [
  { label: 'Total de Pacientes', value: '—', sub: 'pacientes ativos',   icon: Users,      color: 'text-blue-500',    bg: 'bg-blue-500/10'    },
  { label: 'Receita do Mês',     value: '—', sub: 'este mês',           icon: TrendingUp,  color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  { label: 'A Receber',          value: '—', sub: 'em aberto',          icon: Clock,       color: 'text-amber-500',   bg: 'bg-amber-500/10'   },
  { label: 'Prontuários',        value: '—', sub: 'registros criados',  icon: FileText,    color: 'text-violet-500',  bg: 'bg-violet-500/10'  },
]

export default function DashboardPage() {
  return (
    <div className="space-y-8 max-w-6xl mx-auto">

      <div>
        <h1 className="text-xl font-semibold tracking-tight">Visão Geral</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Acompanhe os indicadores da clínica em tempo real
        </p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border bg-card p-5 shadow-sm hover:shadow-md transition-shadow duration-200"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">{card.label}</p>
                <p className="mt-2 text-2xl font-bold tracking-tight">{card.value}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{card.sub}</p>
              </div>
              <div className={`rounded-lg p-2.5 ${card.bg}`}>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Gráficos placeholder */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {['Receita vs Despesa', 'Pacientes por Mês'].map((title) => (
          <div key={title} className="rounded-xl border bg-card p-5 shadow-sm">
            <p className="text-sm font-semibold mb-1">{title}</p>
            <p className="text-xs text-muted-foreground mb-6">Últimos 6 meses</p>
            <div className="flex items-center justify-center h-44 rounded-lg bg-muted/40 border border-dashed">
              <p className="text-xs text-muted-foreground">
                Disponível após conectar o backend
              </p>
            </div>
          </div>
        ))}
      </div>

    </div>
  )
}