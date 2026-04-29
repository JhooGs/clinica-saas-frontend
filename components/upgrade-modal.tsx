'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Sparkles, Lock, ArrowRight } from 'lucide-react'
import { PLAN_LABELS } from '@/hooks/use-feature-gate'

const FEATURE_LABELS: Record<string, string> = {
  FEATURE_PACKAGES:         'Pacotes de atendimento',
  FEATURE_PATIENT_PLAN:     'Plano de atendimento do paciente',
  FEATURE_FINANCE:          'Módulo financeiro',
  FEATURE_GOOGLE_CALENDAR:  'Integração Google Agenda',
  FEATURE_WHATSAPP:         'Integração WhatsApp',
  FEATURE_ATTACHMENTS:      'Anexos de arquivos',
  FEATURE_FORM_TEMPLATES:   'Templates de formulários',
  FEATURE_DATA_IMPORT:      'Importação de dados',
  FEATURE_MULTI_USER:       'Múltiplos usuários',
  FEATURE_PERMISSIONS:      'Permissões granulares',
  FEATURE_UNLIMITED_TYPES:  'Tipos de atendimento ilimitados',
  FEATURE_AI_FORMS:         'IA para formulários',
  FEATURE_WHATSAPP_AUTO:    'WhatsApp automático',
  LIMIT_ACTIVE_PATIENTS:    'Limite de pacientes ativos atingido',
  LIMIT_MAX_USUARIOS:       'Limite de usuários atingido',
}

interface UpgradeModalProps {
  open: boolean
  onClose: () => void
  feature?: string
  requiredPlan?: string
}

export function UpgradeModal({
  open,
  onClose,
  feature,
  requiredPlan,
}: UpgradeModalProps) {
  const featureLabel = feature ? (FEATURE_LABELS[feature] ?? feature) : 'este recurso'
  const requiredLabel = requiredPlan ? (PLAN_LABELS[requiredPlan] ?? requiredPlan) : 'um plano superior'

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-2xl border-0">
        <DialogTitle className="sr-only">Upgrade necessário</DialogTitle>

        {/* Header com gradiente */}
        <div
          className="px-6 pt-8 pb-6 text-white"
          style={{ background: 'linear-gradient(135deg, #0094c8 0%, #04c2fb 60%, #00d5f5 100%)' }}
        >
          <div className="flex items-center justify-center w-12 h-12 bg-white/20 rounded-2xl mb-4 mx-auto">
            <Lock className="h-6 w-6 text-white" />
          </div>
          <h2 className="text-xl font-semibold text-center leading-snug">
            Recurso exclusivo do plano {requiredLabel}
          </h2>
          <p className="text-sm text-white/80 text-center mt-1">
            {featureLabel} não está disponível no seu plano atual.
          </p>
        </div>

        {/* Corpo */}
        <div className="px-6 pb-6 pt-4 bg-white">
          <div className="flex items-start gap-3 bg-[#f0fbff] border border-[#b3e8fb] rounded-xl p-4 mb-5">
            <Sparkles className="h-4 w-4 text-[#04c2fb] mt-0.5 shrink-0" />
            <p className="text-sm text-gray-700 leading-relaxed">
              Faça upgrade para o plano <strong>{requiredLabel}</strong> e desbloqueie {featureLabel.toLowerCase()} e muito mais.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Button
              className="w-full h-11 font-semibold rounded-xl text-white"
              style={{ background: 'linear-gradient(135deg, #0094c8, #04c2fb)' }}
              onClick={() => {
                // Redireciona para página de planos quando estiver implementada
                window.open('https://clinitra.com.br/planos', '_blank')
                onClose()
              }}
            >
              Ver planos
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
            <Button
              variant="ghost"
              className="w-full h-10 text-gray-500 hover:text-gray-700"
              onClick={onClose}
            >
              Agora não
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Componente global: escuta o evento 'feature-gate' despachado por apiFetch
 * e exibe o modal automaticamente. Deve ser renderizado uma única vez no layout.
 */
export function GlobalUpgradeModal() {
  const [state, setState] = useState<{
    open: boolean
    feature?: string
    requiredPlan?: string
  }>({ open: false })

  useEffect(() => {
    function handler(e: Event) {
      const detail = (e as CustomEvent).detail
      setState({ open: true, feature: detail?.feature, requiredPlan: detail?.required_plan })
    }
    window.addEventListener('feature-gate', handler)
    return () => window.removeEventListener('feature-gate', handler)
  }, [])

  return (
    <UpgradeModal
      open={state.open}
      onClose={() => setState(s => ({ ...s, open: false }))}
      feature={state.feature}
      requiredPlan={state.requiredPlan}
    />
  )
}
