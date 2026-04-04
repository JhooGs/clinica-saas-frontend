'use client'

import { useState } from 'react'
import { ArrowRight, Eye, EyeOff, Mail, Lock, Building2, CheckCircle2 } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

export default function CadastroPage() {
  const [nomeClinica, setNomeClinica] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [showSenha, setShowSenha] = useState(false)
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [sucesso, setSucesso] = useState(false)

  async function handleCadastro(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setCarregando(true)

    try {
      const res = await fetch(`${API_URL}/api/v1/onboarding/registrar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome_clinica: nomeClinica, email, senha }),
      })

      if (res.status === 409) {
        setErro('E-mail já cadastrado. Tente fazer login.')
        return
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setErro(data.detail ?? 'Erro ao criar conta. Tente novamente.')
        return
      }

      setSucesso(true)
    } catch {
      setErro('Não foi possível conectar ao servidor. Tente novamente.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="flex min-h-screen">

      {/* ── Lado esquerdo — Branding ── */}
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

        <div className="relative z-10 space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold text-white leading-tight drop-shadow">
              Comece gratuitamente,{' '}
              <span className="text-white underline decoration-white/40">sem cartão</span>
            </h1>
            <p className="text-white/80 text-sm leading-relaxed max-w-sm">
              Configure sua clínica em minutos. Pacientes, agenda e financeiro prontos para usar.
            </p>
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-white/50 text-xs">
            © 2026 Clinitra. Todos os direitos reservados.
          </p>
        </div>
      </div>

      {/* ── Lado direito — Formulário ── */}
      <div className="flex w-full lg:w-1/2 flex-col justify-center px-6 py-12 sm:px-12 lg:px-20 xl:px-24 bg-white">
        <div className="mx-auto w-full max-w-sm">

          {sucesso ? (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <CheckCircle2 className="h-14 w-14" style={{ color: '#04c2fb' }} />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Conta criada!</h2>
              <p className="text-sm text-gray-500 leading-relaxed">
                Enviamos um link de confirmação para{' '}
                <span className="font-semibold text-gray-700">{email}</span>.
                <br />
                Após confirmar, você poderá fazer login normalmente.
              </p>
              <Link
                href="/auth/login"
                className="inline-flex items-center gap-2 mt-4 text-sm font-semibold transition-opacity hover:opacity-80"
                style={{ color: '#04c2fb' }}
              >
                Ir para o login
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <>
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-gray-900">
                  Criar conta grátis
                </h2>
                <p className="mt-2 text-sm text-gray-500">
                  Plano gratuito, sem necessidade de cartão
                </p>
              </div>

              <form onSubmit={handleCadastro} className="mt-10 space-y-6">

                {/* Nome da clínica */}
                <div>
                  <label className="block text-sm font-medium text-gray-900">
                    Nome da clínica
                  </label>
                  <div className="relative mt-2">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={nomeClinica}
                      onChange={(e) => { setNomeClinica(e.target.value); setErro('') }}
                      placeholder="Clínica Exemplo"
                      required
                      minLength={2}
                      className="block w-full rounded-md border border-gray-300 bg-white pl-9 pr-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-colors focus:border-[#04c2fb] focus:ring-1 focus:ring-[#04c2fb]"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-900">
                    E-mail
                  </label>
                  <div className="relative mt-2">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setErro('') }}
                      placeholder="seu@email.com"
                      required
                      autoComplete="email"
                      className="block w-full rounded-md border border-gray-300 bg-white pl-9 pr-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-colors focus:border-[#04c2fb] focus:ring-1 focus:ring-[#04c2fb]"
                    />
                  </div>
                </div>

                {/* Senha */}
                <div>
                  <label className="block text-sm font-medium text-gray-900">
                    Senha
                  </label>
                  <div className="relative mt-2">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type={showSenha ? 'text' : 'password'}
                      value={senha}
                      onChange={(e) => { setSenha(e.target.value); setErro('') }}
                      placeholder="Mínimo 6 caracteres"
                      required
                      minLength={6}
                      autoComplete="new-password"
                      className="block w-full rounded-md border border-gray-300 bg-white pl-9 pr-10 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-colors focus:border-[#04c2fb] focus:ring-1 focus:ring-[#04c2fb]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSenha(!showSenha)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {erro && (
                  <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3">
                    <p className="text-sm text-red-600 font-medium">{erro}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={carregando}
                  className="w-full flex items-center justify-center gap-2 rounded-md py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{ background: 'linear-gradient(135deg, #0094c8 0%, #04c2fb 60%, #00d5f5 100%)' }}
                >
                  {carregando ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      Criando conta...
                    </>
                  ) : (
                    <>
                      Criar conta grátis
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>

              <p className="mt-10 text-center text-sm text-gray-500">
                Já tem uma conta?{' '}
                <Link
                  href="/auth/login"
                  className="font-semibold transition-opacity hover:opacity-80"
                  style={{ color: '#04c2fb' }}
                >
                  Entrar
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
