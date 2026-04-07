'use client'

import { useState } from 'react'
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react'
import Image from 'next/image'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

export default function RecuperarSenhaPage() {
  const [email, setEmail] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [enviado, setEnviado] = useState(false)

  async function handleEnviar(e: React.FormEvent) {
    e.preventDefault()
    setCarregando(true)
    try {
      await fetch(`${API_URL}/api/v1/auth/recuperar-senha`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
    } catch {
      // Ignorar erros de rede — sempre mostrar sucesso por segurança
    }
    setEnviado(true)
    setCarregando(false)
  }

  return (
    <div className="flex min-h-screen">

      {/* Branding */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0099cc 0%, #04c2fb 55%, #00d8f5 100%)' }}
      >
        <div className="relative z-10 flex flex-col items-start gap-3">
          <Image
            src="/logo.png"
            alt="Clinitra"
            width={96}
            height={96}
            className="brightness-0 invert drop-shadow-lg"
          />
          <span className="text-white font-bold text-2xl tracking-widest uppercase drop-shadow">
            Clinitra
          </span>
        </div>

        <div className="relative z-10 space-y-4">
          <h1 className="text-4xl font-bold text-white leading-tight drop-shadow">
            Recupere o acesso à sua conta
          </h1>
          <p className="text-white/80 text-sm leading-relaxed max-w-sm">
            Enviaremos um link seguro para o seu e-mail. Clique nele para criar uma nova senha.
          </p>
        </div>

        <div className="relative z-10">
          <p className="text-white/50 text-xs">© 2026 Clinitra. Todos os direitos reservados.</p>
        </div>
      </div>

      {/* Formulário */}
      <div className="flex w-full lg:w-1/2 flex-col justify-center px-6 py-12 sm:px-12 lg:px-20 xl:px-24 bg-white">
        <div className="mx-auto w-full max-w-sm">

          <a
            href="/auth/login"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-8"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar ao login
          </a>

          {enviado ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-8 w-8 shrink-0" style={{ color: '#04c2fb' }} />
                <h2 className="text-2xl font-bold tracking-tight text-gray-900">Link enviado</h2>
              </div>
              <p className="text-sm text-gray-500 leading-relaxed">
                Se o e-mail <strong>{email}</strong> estiver cadastrado, você receberá um link de recuperação em instantes.
              </p>
              <p className="text-sm text-gray-400">
                Verifique também a pasta de spam.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <h2 className="text-2xl font-bold tracking-tight text-gray-900">Esqueceu a senha?</h2>
                <p className="mt-2 text-sm text-gray-500">
                  Digite seu e-mail e enviaremos um link para criar uma nova senha.
                </p>
              </div>

              <form onSubmit={handleEnviar} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-900">E-mail</label>
                  <div className="relative mt-2">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu@email.com"
                      required
                      autoComplete="email"
                      className="block w-full rounded-md border border-gray-300 bg-white pl-9 pr-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-colors focus:border-[#04c2fb] focus:ring-1 focus:ring-[#04c2fb]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={carregando}
                  className="w-full flex items-center justify-center gap-2 rounded-md py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{ background: 'linear-gradient(135deg, #0094c8 0%, #04c2fb 60%, #00d5f5 100%)' }}
                >
                  {carregando ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Enviando...
                    </>
                  ) : (
                    'Enviar link de recuperação'
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
