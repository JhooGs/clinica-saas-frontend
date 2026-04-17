'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { apiFetch } from '@/lib/api'
import type {
  OnboardingDecisionPayload,
  OnboardingFlowResponse,
  OnboardingSkipPayload,
} from '@/lib/types/onboarding'

export function useOnboardingFlow() {
  return useQuery<OnboardingFlowResponse>({
    queryKey: ['onboarding', 'fluxo'],
    queryFn: () => apiFetch<OnboardingFlowResponse>('/api/v1/onboarding/fluxo'),
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  })
}

export function useDecidirImportacaoOnboarding() {
  const queryClient = useQueryClient()
  return useMutation<OnboardingFlowResponse, Error, OnboardingDecisionPayload>({
    mutationFn: (payload) =>
      apiFetch<OnboardingFlowResponse>('/api/v1/onboarding/decidir-importacao', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: (flow) => {
      queryClient.setQueryData(['onboarding', 'fluxo'], flow)
      queryClient.invalidateQueries({ queryKey: ['onboarding', 'fluxo'] })
    },
  })
}

export function usePularEtapaOnboarding() {
  const queryClient = useQueryClient()
  return useMutation<OnboardingFlowResponse, Error, OnboardingSkipPayload>({
    mutationFn: (payload) =>
      apiFetch<OnboardingFlowResponse>('/api/v1/onboarding/pular-etapa', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: (flow) => {
      queryClient.setQueryData(['onboarding', 'fluxo'], flow)
      queryClient.invalidateQueries({ queryKey: ['onboarding', 'fluxo'] })
    },
  })
}
