'use client'

import { useConfiguracoes } from '@/hooks/use-configuracoes'

export type PlanSlug = 'free' | 'solo' | 'clinica' | 'clinica_pro'

const PLAN_ORDER: Record<string, number> = {
  free: 0,
  solo: 1,
  clinica: 2,
  clinica_pro: 3,
}

const PLAN_LABELS: Record<string, string> = {
  free: 'Free',
  solo: 'Solo',
  clinica: 'Clínica',
  clinica_pro: 'Clínica Pro',
}

// Espelha FEATURE_MIN_PLAN do backend (app/core/feature_gates.py)
const FEATURE_MIN_PLAN: Record<string, PlanSlug> = {
  FEATURE_PACKAGES:         'solo',
  FEATURE_PATIENT_PLAN:     'solo',
  FEATURE_FINANCE:          'solo',
  FEATURE_GOOGLE_CALENDAR:  'solo',
  FEATURE_WHATSAPP:         'solo',
  FEATURE_ATTACHMENTS:      'solo',
  FEATURE_FORM_TEMPLATES:   'solo',
  FEATURE_DATA_IMPORT:      'solo',
  FEATURE_MULTI_USER:       'clinica',
  FEATURE_PERMISSIONS:      'clinica',
  FEATURE_UNLIMITED_TYPES:  'clinica',
  FEATURE_AI_FORMS:         'clinica',
  FEATURE_WHATSAPP_AUTO:    'clinica_pro',
}

export function useFeatureGate(featureKey: string): {
  allowed: boolean
  requiredPlan: PlanSlug | null
  requiredPlanLabel: string | null
  currentPlan: string
} {
  const { data: config } = useConfiguracoes()
  const currentPlan = config?.plano ?? 'free'
  const required = FEATURE_MIN_PLAN[featureKey] ?? 'free'

  const currentOrder = PLAN_ORDER[currentPlan] ?? 0
  const requiredOrder = PLAN_ORDER[required] ?? 0
  const allowed = currentOrder >= requiredOrder

  return {
    allowed,
    requiredPlan: allowed ? null : required,
    requiredPlanLabel: allowed ? null : (PLAN_LABELS[required] ?? required),
    currentPlan,
  }
}

/** Verifica se um erro de API é um feature_gate 403 */
export function isFeatureGateError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const e = error as Record<string, unknown>
  // Tenta extrair detail do corpo da resposta
  const detail = e['detail'] as Record<string, unknown> | undefined
  return detail?.['error'] === 'feature_gate'
}

export function getFeatureGateDetail(error: unknown): {
  feature: string
  requiredPlan: string
  currentPlan: string
} | null {
  if (!isFeatureGateError(error)) return null
  const detail = (error as Record<string, Record<string, string>>)['detail']
  return {
    feature: detail['feature'] ?? '',
    requiredPlan: detail['required_plan'] ?? 'solo',
    currentPlan: detail['current_plan'] ?? 'free',
  }
}

export { PLAN_LABELS }
