import { BarChart3, Clock, Sparkles } from 'lucide-react'

export default function RelatoriosPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      {/* Ícone animado */}
      <div className="relative mb-6">
        <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#04c2fb]/20 to-[#04c2fb]/5 flex items-center justify-center border border-[#04c2fb]/20">
          <BarChart3 className="w-11 h-11 text-[#04c2fb]" strokeWidth={1.5} />
        </div>
        <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center">
          <Clock className="w-3.5 h-3.5 text-amber-500" />
        </span>
      </div>

      {/* Título */}
      <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-2">
        Relatórios
      </h1>

      {/* Badge */}
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold uppercase tracking-wide mb-4">
        <Sparkles className="w-3 h-3" />
        Em construção
      </span>

      {/* Descrição */}
      <p className="text-slate-500 text-sm sm:text-base max-w-sm leading-relaxed mb-8">
        Estamos preparando relatórios completos de atendimentos, financeiro e evolução
        dos pacientes. Em breve disponível.
      </p>

      {/* Cards do que vem por aí */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-lg">
        {[
          { label: 'Atendimentos', desc: 'Frequência e ausências por período' },
          { label: 'Financeiro', desc: 'Receitas, inadimplência e projeções' },
          { label: 'Pacientes', desc: 'Evolução, engajamento e retenção' },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 text-left opacity-60"
          >
            <p className="text-xs font-semibold text-slate-700 mb-0.5">{item.label}</p>
            <p className="text-xs text-slate-400 leading-snug">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
