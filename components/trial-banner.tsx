'use client'

import { Sparkles, X, ArrowRight } from 'lucide-react'
import { useState } from 'react'
import { useConfiguracoes } from '@/hooks/use-configuracoes'

export function TrialBanner() {
  const { data: config } = useConfiguracoes()
  const [dismissed, setDismissed] = useState(false)

  const dias = config?.trial_dias_restantes

  // Não exibe se: não está em trial, já expirou, ou foi dispensado na sessão
  if (dias === null || dias === undefined || dismissed) return null

  const urgente = dias <= 3
  const acabou  = dias === 0

  const texto = acabou
    ? 'Seu período de avaliação acabou. Faça upgrade para continuar usando todos os recursos.'
    : dias === 1
      ? 'Último dia do seu período de avaliação!'
      : `${dias} dias restantes no seu período de avaliação Solo.`

  return (
    <div
      className="relative flex items-center justify-between gap-3 px-4 py-2.5 text-sm font-medium text-white"
      style={{
        background: urgente
          ? 'linear-gradient(135deg, #c0392b 0%, #e74c3c 100%)'
          : 'linear-gradient(135deg, #0094c8 0%, #04c2fb 60%, #00d5f5 100%)',
      }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <Sparkles className="h-4 w-4 shrink-0" />
        <span className="truncate">{texto}</span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => window.open('https://clinitra.com.br/planos', '_blank')}
          className="flex items-center gap-1 rounded-full bg-white/20 hover:bg-white/30 px-3 py-1 text-xs font-semibold transition-colors"
        >
          Ver planos
          <ArrowRight className="h-3 w-3" />
        </button>
        {!acabou && (
          <button
            onClick={() => setDismissed(true)}
            aria-label="Dispensar banner"
            className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-white/20 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}
