'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { ArrowRight, Eye, EyeOff, Mail, Lock } from 'lucide-react'
import Image from 'next/image'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [showSenha, setShowSenha] = useState(false)
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setCarregando(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) {
      setErro('E-mail ou senha incorretos.')
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
        style={{ background: 'linear-gradient(135deg, #0a0e1a 0%, #0d1829 50%, #0a1520 100%)' }}
      >
        {/* Glow de fundo */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            background: 'radial-gradient(ellipse at 30% 50%, #04c2fb 0%, transparent 60%)',
          }}
        />
        <div
          className="absolute inset-0 opacity-10"
          style={{
            background: 'radial-gradient(ellipse at 80% 80%, #04c2fb 0%, transparent 50%)',
          }}
        />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ backgroundColor: '#04c2fb20', border: '1px solid #04c2fb40' }}
          >
            <Image
              src="/logo.png"
              alt="Clinitra"
              width={24}
              height={24}
              className="brightness-0 invert"
            />
          </div>
          <span className="text-white font-bold text-lg tracking-widest uppercase">
            Clinitra
          </span>
        </div>

        {/* Conteúdo central */}
        <div className="relative z-10 space-y-8">
          <div className="space-y-4">
            <div
              className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold tracking-wider uppercase"
              style={{ backgroundColor: '#04c2fb15', border: '1px solid #04c2fb30', color: '#04c2fb' }}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
              Plataforma de Gestão Clínica
            </div>

            <h1 className="text-4xl font-bold text-white leading-tight">
              Dados que{' '}
              <span style={{ color: '#04c2fb' }}>impulsionam</span>
              <br />
              sua clínica
            </h1>

            <p className="text-white/50 text-sm leading-relaxed max-w-sm">
              Centralize pacientes, prontuários e financeiro em um único lugar.
              Tome decisões com inteligência e velocidade.
            </p>
          </div>

          {/* Stats cards */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: '500+', label: 'Clínicas' },
              { value: '12k+', label: 'Pacientes' },
              { value: '99.9%', label: 'Uptime' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl p-4"
                style={{ backgroundColor: '#ffffff08', border: '1px solid #ffffff10' }}
              >
                <p className="text-lg font-bold text-white">{stat.value}</p>
                <p className="text-xs text-white/40 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10">
          <p className="text-white/25 text-xs">
            © 2026 Clinitra. Todos os direitos reservados.
          </p>
        </div>
      </div>

      {/* ── Lado direito — Formulário ── */}
      <div className="flex w-full lg:w-1/2 items-center justify-center bg-white dark:bg-[#0d1117] p-8">
        <div className="w-full max-w-sm space-y-8">

          {/* Header */}
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Bem-vindo de volta
            </h2>
            <p className="text-sm text-muted-foreground">
              Entre na sua conta para acessar o painel
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  className="w-full rounded-lg border bg-background pl-10 pr-4 py-2.5 text-sm outline-none transition-all placeholder:text-muted-foreground/50 focus:ring-2 focus:border-transparent"
                  style={{ '--tw-ring-color': '#04c2fb' } as React.CSSProperties}
                />
              </div>
            </div>

            {/* Senha */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">Senha</label>
                <button type="button" className="text-xs font-medium" style={{ color: '#04c2fb' }}>
                  Esqueci minha senha
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type={showSenha ? 'text' : 'password'}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full rounded-lg border bg-background pl-10 pr-10 py-2.5 text-sm outline-none transition-all placeholder:text-muted-foreground/50 focus:ring-2 focus:border-transparent"
                  style={{ '--tw-ring-color': '#04c2fb' } as React.CSSProperties}
                />
                <button
                  type="button"
                  onClick={() => setShowSenha(!showSenha)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Erro */}
            {erro && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/8 px-3 py-2.5">
                <div className="h-1.5 w-1.5 rounded-full bg-destructive shrink-0" />
                <p className="text-xs text-destructive font-medium">{erro}</p>
              </div>
            )}

            {/* Botão */}
            <button
              type="submit"
              disabled={carregando}
              className="w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              style={{ backgroundColor: '#04c2fb' }}
            >
              {carregando ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Entrando...
                </span>
              ) : (
                <>
                  Entrar
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Link cadastro */}
          <p className="text-center text-xs text-muted-foreground">
            Não tem uma conta?{' '}
            <a href="/auth/cadastro" className="font-semibold hover:underline" style={{ color: '#04c2fb' }}>
              Criar conta grátis
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}