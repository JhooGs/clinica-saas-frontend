'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Lock, Eye, EyeOff, AlertTriangle } from 'lucide-react'
import Image from 'next/image'
import { toast } from 'sonner'

export default function NovaSenhaPage() {
  const router = useRouter()
  const [pronto, setPronto] = useState(false)
  const [linkInvalido, setLinkInvalido] = useState(false)
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [showNova, setShowNova] = useState(false)
  const [showConfirmar, setShowConfirmar] = useState(false)
  const [carregando, setCarregando] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    // Fluxo PKCE: Supabase redireciona para cá com ?code=XXX
    // O code precisa ser trocado por sessão no cliente antes de qualquer coisa
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')

    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ data: { session }, error }) => {
        if (session && !error) {
          setPronto(true)
        } else {
          setLinkInvalido(true)
        }
      })
      return
    }

    // Fluxo implícito (fallback): hash com access_token na URL
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setPronto(true)
        return
      }

      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'PASSWORD_RECOVERY') {
          setPronto(true)
        }
      })

      // Timeout: se em 4s não houver sessão nem evento, link expirou
      const timeout = setTimeout(() => setLinkInvalido(true), 4000)

      return () => {
        subscription.unsubscribe()
        clearTimeout(timeout)
      }
    })
  }, [])

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault()

    if (novaSenha.length < 8) {
      toast.error('Senha muito curta', { description: 'A senha deve ter pelo menos 8 caracteres.' })
      return
    }
    if (novaSenha !== confirmar) {
      toast.error('Senhas diferentes', { description: 'Os campos de senha não coincidem.' })
      return
    }

    setCarregando(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: novaSenha })

    if (error) {
      toast.error('Erro ao atualizar senha', { description: 'Tente novamente ou solicite um novo link.' })
      setCarregando(false)
      return
    }

    await supabase.auth.signOut()
    toast.success('Senha atualizada', { description: 'Faça login com sua nova senha.' })
    setTimeout(() => router.push('/auth/login'), 1500)
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
            Crie uma nova senha segura
          </h1>
          <p className="text-white/80 text-sm leading-relaxed max-w-sm">
            Escolha uma senha forte com pelo menos 8 caracteres.
          </p>
        </div>

        <div className="relative z-10">
          <p className="text-white/50 text-xs">© 2026 Clinitra. Todos os direitos reservados.</p>
        </div>
      </div>

      {/* Formulário */}
      <div className="flex w-full lg:w-1/2 flex-col justify-center px-6 py-12 sm:px-12 lg:px-20 xl:px-24 bg-white">
        <div className="mx-auto w-full max-w-sm">

          {linkInvalido ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-8 w-8 shrink-0 text-amber-500" />
                <h2 className="text-2xl font-bold tracking-tight text-gray-900">Link inválido</h2>
              </div>
              <p className="text-sm text-gray-500 leading-relaxed">
                Este link de recuperação expirou ou já foi utilizado.
              </p>
              <a
                href="/auth/recuperar-senha"
                className="inline-block mt-2 text-sm font-medium transition-opacity hover:opacity-80"
                style={{ color: '#04c2fb' }}
              >
                Solicitar novo link
              </a>
            </div>
          ) : !pronto ? (
            <div className="flex items-center gap-3 text-gray-500">
              <svg className="animate-spin h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-sm">Verificando link...</span>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <h2 className="text-2xl font-bold tracking-tight text-gray-900">Nova senha</h2>
                <p className="mt-2 text-sm text-gray-500">Digite e confirme sua nova senha.</p>
              </div>

              <form onSubmit={handleSalvar} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-900">Nova senha</label>
                  <div className="relative mt-2">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type={showNova ? 'text' : 'password'}
                      value={novaSenha}
                      onChange={(e) => setNovaSenha(e.target.value)}
                      placeholder="Mínimo 8 caracteres"
                      required
                      autoComplete="new-password"
                      className="block w-full rounded-md border border-gray-300 bg-white pl-9 pr-10 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-colors focus:border-[#04c2fb] focus:ring-1 focus:ring-[#04c2fb]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNova(!showNova)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showNova ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900">Confirmar senha</label>
                  <div className="relative mt-2">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type={showConfirmar ? 'text' : 'password'}
                      value={confirmar}
                      onChange={(e) => setConfirmar(e.target.value)}
                      placeholder="Repita a senha"
                      required
                      autoComplete="new-password"
                      className="block w-full rounded-md border border-gray-300 bg-white pl-9 pr-10 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-colors focus:border-[#04c2fb] focus:ring-1 focus:ring-[#04c2fb]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmar(!showConfirmar)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showConfirmar ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
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
                      Salvando...
                    </>
                  ) : (
                    'Salvar nova senha'
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
