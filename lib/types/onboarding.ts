export type OnboardingStepStatus = 'pending' | 'completed' | 'skipped' | 'unavailable'

export type OnboardingStep =
  | 'import_pacientes'
  | 'import_financeiro'
  | 'import_registros'
  | 'planos'
  | 'adicionar_paciente'

export type OnboardingDecision = 'importar' | 'sem_importacao' | null

export interface OnboardingFlowResponse {
  clinica_id: string
  super_admin_user_id: string
  decisao: OnboardingDecision
  concluido: boolean
  concluido_em?: string | null
  next_step: OnboardingStep | 'decidir_importacao' | null
  steps: Record<OnboardingStep, OnboardingStepStatus>
}

export interface OnboardingDecisionPayload {
  decisao: Exclude<OnboardingDecision, null>
}

export interface OnboardingSkipPayload {
  etapa: 'import_pacientes' | 'import_financeiro' | 'import_registros'
}
