'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'

export type MFAFactor = {
  id: string
  friendly_name?: string
  factor_type: 'totp'
  status: 'verified' | 'unverified'
}

export type AALLevel = 'aal1' | 'aal2' | null

export type EnrollData = {
  id: string
  qrCode: string   // SVG como string
  secret: string   // código manual
}

export function useMFA() {
  const supabase = createClient()

  const [fatores, setFatores] = useState<MFAFactor[]>([])
  const [aal, setAAL] = useState<AALLevel>(null)
  const [carregando, setCarregando] = useState(true)

  const carregarStatus = useCallback(async () => {
    setCarregando(true)
    try {
      const [fatoresRes, aalRes] = await Promise.all([
        supabase.auth.mfa.listFactors(),
        supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
      ])
      setFatores((fatoresRes.data?.totp as MFAFactor[]) ?? [])
      setAAL((aalRes.data?.currentLevel as AALLevel) ?? 'aal1')
    } finally {
      setCarregando(false)
    }
  }, [supabase])

  useEffect(() => { carregarStatus() }, [carregarStatus])

  async function iniciarCadastro(): Promise<EnrollData> {
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'Clinitra',
    })
    if (error) throw error
    return {
      id: data.id,
      qrCode: data.totp.qr_code,
      secret: data.totp.secret,
    }
  }

  async function verificarCodigo(factorId: string, code: string): Promise<void> {
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code })
    if (error) throw error
    await carregarStatus()
  }

  async function elevarSessao(factorId: string, code: string): Promise<void> {
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code })
    if (error) throw error
    await carregarStatus()
  }

  async function removerFator(factorId: string): Promise<void> {
    const { error } = await supabase.auth.mfa.unenroll({ factorId })
    if (error) throw error
    await carregarStatus()
  }

  const fatorAtivo = fatores.find(f => f.status === 'verified') ?? null
  const mfaAtivo = fatorAtivo !== null
  const sessaoElevada = aal === 'aal2'

  return {
    fatores,
    fatorAtivo,
    aal,
    mfaAtivo,
    sessaoElevada,
    carregando,
    carregarStatus,
    iniciarCadastro,
    verificarCodigo,
    elevarSessao,
    removerFator,
  }
}
