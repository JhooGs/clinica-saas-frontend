'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

/**
 * Detecta perda de sessão em tempo real (expiração, falha no refresh do token,
 * internal_function_connection_error do Supabase) e redireciona para o login.
 * Deve ser montado apenas dentro do layout do dashboard.
 */
export function SessionGuard() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        router.replace('/auth/login?motivo=sessao_expirada')
      }
    })
    return () => subscription.unsubscribe()
  }, [router])

  return null
}
