'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { ArrowRight, Eye, EyeOff, Mail, Lock } from 'lucide-react'
import Image from 'next/image'
import { toast } from 'sonner'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [showSenha, setShowSenha] = useState(false)
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  const emailInvalido = email.length > 0 && !email.includes('@')
  const camposComErro = !!erro

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setCarregando(true)

    // 1. Verificar bloqueio antes de tentar login
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/bloqueado?email=${encodeURIComponent(email)}`)
      if (res.ok) {
        const status = await res.json()
        if (status.bloqueado) {
          const msg = `Conta bloqueada por excesso de tentativas. Tente novamente em ${status.minutos_restantes} minuto(s).`
          setErro(msg)
          toast.error('Acesso bloqueado', { description: msg })
          setCarregando(false)
          return
        }
      }
    } catch {
      // Se o backend estiver fora, continuar normalmente
    }

    // 2. Tentar login no Supabase
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })

    if (error) {
      // E-mail ainda não confirmado — não contabilizar como tentativa errada
      if (error.message?.toLowerCase().includes('email not confirmed')) {
        const msg = 'Você ainda não confirmou seu e-mail. Verifique sua caixa de entrada e clique no link de confirmação.'
        setErro(msg)
        toast.error('E-mail não confirmado', { description: msg })
        setCarregando(false)
        return
      }

      // 3. Registrar falha e obter contagem atualizada
      let mensagem = 'E-mail ou senha incorretos.'
      try {
        const res = await fetch(`${API_URL}/api/v1/auth/tentativa-login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        })
        if (res.ok) {
          const dados = await res.json()
          if (dados.bloqueado) {
            const mins = Math.ceil(dados.segundos_restantes / 60)
            mensagem = `Conta bloqueada por excesso de tentativas. Tente novamente em ${mins} minuto(s).`
          } else if (dados.tentativas_restantes > 0) {
            mensagem = `E-mail ou senha incorretos. ${dados.tentativas_restantes} tentativa(s) restante(s).`
          }
        }
      } catch {
        // Backend indisponível — mostrar erro genérico
      }

      setErro(mensagem)
      toast.error('Erro ao entrar', { description: mensagem })
      setCarregando(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
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
              Menos burocracia, mais tempo para{' '}
              <span className="text-white underline decoration-white/40">cuidar</span>
              <br />
              da sua clínica
            </h1>
            <p className="text-white/80 text-sm leading-relaxed max-w-sm">
              Centralize pacientes, relatórios e financeiro em um único lugar.
              Analise e organize tudo com inteligência.
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

          <div>
            <h2 className="text-2xl font-bold tracking-tight text-gray-900">
              Entre na sua conta
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              Acesse o painel de gestão da sua clínica
            </p>
          </div>

          <form onSubmit={handleLogin} className="mt-10 space-y-6">

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-900">E-mail</label>
              <div className="relative mt-2">
                <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors ${emailInvalido || camposComErro ? 'text-violet-500' : 'text-gray-400'}`} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setErro('') }}
                  placeholder="seu@email.com"
                  required
                  autoComplete="email"
                  className={`block w-full rounded-md border bg-white pl-9 pr-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-colors ${
                    emailInvalido || camposComErro
                      ? 'border-violet-500 ring-1 ring-violet-500 focus:border-violet-500 focus:ring-violet-500'
                      : 'border-gray-300 focus:border-[#04c2fb] focus:ring-1 focus:ring-[#04c2fb]'
                  }`}
                />
              </div>
            </div>

            {/* Senha */}
            <div>
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-900">Senha</label>
                <a
                  href="/auth/recuperar-senha"
                  className="text-sm font-medium transition-opacity hover:opacity-80"
                  style={{ color: '#04c2fb' }}
                >
                  Esqueci minha senha
                </a>
              </div>
              <div className="relative mt-2">
                <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors ${camposComErro ? 'text-violet-500' : 'text-gray-400'}`} />
                <input
                  type={showSenha ? 'text' : 'password'}
                  value={senha}
                  onChange={(e) => { setSenha(e.target.value); setErro('') }}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className={`block w-full rounded-md border bg-white pl-9 pr-10 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-colors ${
                    camposComErro
                      ? 'border-violet-500 ring-1 ring-violet-500 focus:border-violet-500 focus:ring-violet-500'
                      : 'border-gray-300 focus:border-[#04c2fb] focus:ring-1 focus:ring-[#04c2fb]'
                  }`}
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

            {/* Erro */}
            {erro && (
              <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3">
                <p className="text-sm text-red-600 font-medium">{erro}</p>
              </div>
            )}

            {/* Botão */}
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
                  Entrando...
                </>
              ) : (
                <>
                  Entrar
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <p className="mt-10 text-center text-sm text-gray-500">
            Não tem uma conta?{' '}
            <a
              href="/auth/cadastro"
              className="font-semibold transition-opacity hover:opacity-80"
              style={{ color: '#04c2fb' }}
            >
              Criar conta grátis
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
