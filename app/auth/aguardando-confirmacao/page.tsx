'use client'

import Image from 'next/image'
import { MailCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function AguardandoConfirmacaoPage() {
  const router = useRouter()

  async function handleSair() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-6"
      style={{ background: 'linear-gradient(135deg, #0099cc 0%, #04c2fb 55%, #00d8f5 100%)' }}
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-10 text-center shadow-2xl space-y-5">
        <div className="flex justify-center">
          <Image src="/logo.png" alt="Clinitra" width={48} height={48} />
        </div>

        <div className="flex justify-center">
          <MailCheck className="h-12 w-12" style={{ color: '#04c2fb' }} />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold text-gray-900">Confirme seu e-mail</h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            Sua conta ainda não foi ativada. Verifique sua caixa de entrada e clique no link de confirmação que enviamos.
          </p>
        </div>

        <button
          onClick={handleSair}
          className="inline-block text-sm font-semibold transition-opacity hover:opacity-80"
          style={{ color: '#04c2fb' }}
        >
          Sair e voltar para o login
        </button>
      </div>
    </div>
  )
}
