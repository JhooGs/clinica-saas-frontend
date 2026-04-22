'use client'

import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'
import { useAgendamentosHoje } from '@/hooks/use-agenda'
import { nowSP } from '@/lib/timezone'

export function ProximaSessaoPill() {
  const { data } = useAgendamentosHoje()
  const [now, setNow] = useState(() => nowSP())

  useEffect(() => {
    const id = setInterval(() => setNow(nowSP()), 30_000)
    return () => clearInterval(id)
  }, [])

  const proximo = (data?.items ?? [])
    .filter(a => a.status !== 'falta')
    .filter(a => {
      const [h, m] = a.horario.split(':').map(Number)
      const t = new Date(now)
      t.setHours(h, m, 0, 0)
      return t.getTime() > now.getTime()
    })
    .sort((a, b) => a.horario.localeCompare(b.horario))[0]

  if (!proximo) return null

  const nomeCompleto = proximo.pacientes_nomes?.[0] ?? proximo.paciente_nome ?? 'Paciente'
  const primeiro = nomeCompleto.split(/\s+/)[0]

  return (
    <div
      className="hidden lg:inline-flex items-center gap-1.5 rounded-full border border-[#04c2fb]/25 bg-[#04c2fb]/8 px-3 py-1 text-xs font-medium text-[#04c2fb] mr-1"
      title={`Próximo atendimento: ${proximo.horario} — ${nomeCompleto} (${proximo.tipo_atendimento})`}
    >
      <Clock className="h-3 w-3 shrink-0" />
      <span className="tabular-nums font-semibold">{proximo.horario}</span>
      <span className="text-[#04c2fb]/50">·</span>
      <span className="truncate max-w-[120px]">{primeiro}</span>
    </div>
  )
}
