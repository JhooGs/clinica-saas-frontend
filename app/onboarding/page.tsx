'use client'

import { useState, useCallback } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import {
  ArrowRight,
  CheckCircle2,
  Database,
  DollarSign,
  BookOpen,
  Loader2,
  Package,
  UserPlus,
  Users,
  SkipForward,
} from 'lucide-react'
import { toast } from 'sonner'

import { createClient } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import {
  useOnboardingFlow,
  useDecidirImportacaoOnboarding,
  usePularEtapaOnboarding,
} from '@/hooks/use-onboarding'
import type { OnboardingSkipPayload } from '@/lib/types/onboarding'
import { ImportWizard } from '@/components/onboarding/import-wizard'
import { CriarPlanoForm } from '@/components/onboarding/criar-plano-form'
import { AdicionarPacienteForm } from '@/components/onboarding/adicionar-paciente-form'
import { TiposAtendimentoStep, type SelectedTipo } from '@/components/onboarding/tipos-atendimento-step'

// ── Gradiente brand ────────────────────────────────────────────────────────────
const BRAND_GRADIENT = 'linear-gradient(135deg, #0094c8 0%, #04c2fb 60%, #00d5f5 100%)'

// ── Mapeamento etapa → índice do dot ──────────────────────────────────────────
// 0 = decidir, 1..6 = etapas de conteúdo (tipos_atendimento é etapa local — usa índice 4)
const STEP_DOT_INDEX: Record<string, number> = {
  decidir_importacao: 0,
  import_pacientes:   1,
  import_financeiro:  2,
  import_registros:   3,
  tipos_atendimento:  4,
  planos:             5,
  adicionar_paciente: 6,
}
const TOTAL_DOTS = 7

// ── Dots de progresso ─────────────────────────────────────────────────────────

function StepDots({ nextStep }: { nextStep: string | null }) {
  const currentIndex = nextStep !== null ? (STEP_DOT_INDEX[nextStep] ?? 0) : TOTAL_DOTS

  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: TOTAL_DOTS }).map((_, i) => {
        const isPast    = i < currentIndex
        const isCurrent = i === currentIndex
        return (
          <span
            key={i}
            className={isCurrent ? 'onboarding-dot-pulse' : undefined}
            style={{
              display: 'inline-block',
              width:  isCurrent ? 10 : 8,
              height: isCurrent ? 10 : 8,
              borderRadius: '50%',
              transition: 'background 0.4s, opacity 0.4s, width 0.3s, height 0.3s',
              background: isPast || isCurrent ? 'white' : 'rgba(255,255,255,0.3)',
            }}
          />
        )
      })}
    </div>
  )
}

// ── Wrapper de etapa ──────────────────────────────────────────────────────────

function StepWrapper({
  opacity,
  children,
}: {
  opacity: number
  children: React.ReactNode
}) {
  return (
    <div
      style={{
        transition: 'opacity 0.22s ease, transform 0.22s ease',
        opacity,
        transform: opacity === 0 ? 'translateY(-8px)' : 'translateY(0)',
      }}
    >
      {children}
    </div>
  )
}

// ── Cabeçalho persistente das etapas ─────────────────────────────────────────

function StepHeader({ nextStep }: { nextStep: string | null }) {
  return (
    <div className="fixed top-0 left-0 right-0 z-10">
      {/* Grid 3 colunas: logo | dots | espaço espelho */}
      <div className="grid grid-cols-3 items-center px-6 py-4">
        <div>
          <Image src="/logo_semfundo.png" alt="Clinitra" width={60} height={60} />
        </div>
        <div className="flex justify-center">
          <StepDots nextStep={nextStep} />
        </div>
        <div />
      </div>
    </div>
  )
}

// ── Card de etapa ─────────────────────────────────────────────────────────────

interface StepCardProps {
  icon: React.ReactNode
  iconColor?: string
  title: string
  subtitle: string
  children: React.ReactNode
  className?: string
}

function StepCard({ icon, iconColor = BRAND_GRADIENT, title, subtitle, children, className }: StepCardProps) {
  return (
    <div className={cn(
      'w-full max-w-xl rounded-2xl border border-slate-100 bg-white shadow-lg shadow-slate-200/60 p-8',
      'onboarding-step-in',
      className,
    )}>
      {/* Ícone */}
      <div
        className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-sm"
        style={{ background: iconColor }}
      >
        {icon}
      </div>

      {/* Texto */}
      <h1 className="text-xl font-bold text-slate-800">{title}</h1>
      <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">{subtitle}</p>

      {/* Conteúdo */}
      <div className="mt-6">{children}</div>
    </div>
  )
}

// ── Tela de boas-vindas ───────────────────────────────────────────────────────

function WelcomeScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-12">
      {/* Orbs decorativos */}
      <div className="onboarding-orb-1 pointer-events-none absolute top-[-80px] left-[-80px] h-[350px] w-[350px] rounded-full bg-white/20 blur-3xl" />
      <div className="onboarding-orb-2 pointer-events-none absolute bottom-[-60px] right-[-60px] h-[280px] w-[280px] rounded-full bg-white/15 blur-3xl" />
      <div className="onboarding-orb-3 pointer-events-none absolute top-[40%] right-[10%] h-[200px] w-[200px] rounded-full bg-white/10 blur-2xl" />

      {/* Conteúdo central */}
      <div className="relative z-10 flex flex-col items-center gap-6 text-center">
        {/* Logo */}
        <div className="onboarding-welcome-logo flex h-24 w-24 items-center justify-center rounded-3xl bg-white/20 backdrop-blur-sm border border-white/30 shadow-xl">
          <Image src="/logo.png" alt="Clinitra" width={52} height={52} className="brightness-0 invert" />
        </div>

        {/* Texto */}
        <div className="space-y-3" style={{ animation: 'onboarding-step-in 0.5s 0.2s cubic-bezier(0.22,1,0.36,1) both' }}>
          <h1 className="text-4xl font-bold text-white tracking-tight">
            Bem-vindo ao Clinitra
          </h1>
          <p className="text-lg text-white/80 max-w-sm">
            Vamos configurar sua clínica em poucos minutos.
          </p>
        </div>

        {/* Destaques */}
        <div
          className="flex flex-wrap justify-center gap-x-6 gap-y-2"
          style={{ animation: 'onboarding-step-in 0.5s 0.35s cubic-bezier(0.22,1,0.36,1) both' }}
        >
          {['Agenda inteligente', 'Registros seguros', 'Gestão financeira'].map((item) => (
            <span key={item} className="flex items-center gap-1.5 text-sm text-white/65">
              <span className="h-1 w-1 rounded-full bg-white/50 shrink-0" />
              {item}
            </span>
          ))}
        </div>

        {/* Botão */}
        <div style={{ animation: 'onboarding-step-in 0.5s 0.5s cubic-bezier(0.22,1,0.36,1) both' }}>
          <button
            onClick={onStart}
            className="group mt-3 flex items-center gap-3 rounded-2xl bg-white px-9 py-4 text-base font-bold shadow-xl shadow-black/20 transition-all hover:shadow-2xl hover:shadow-black/25 hover:scale-[1.02] active:scale-[0.98]"
            style={{
              backgroundClip: 'padding-box',
            }}
          >
            <span
              style={{
                background: BRAND_GRADIENT,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Começar configuração
            </span>
            <span
              className="flex h-7 w-7 items-center justify-center rounded-full text-white transition-transform group-hover:translate-x-0.5"
              style={{ background: BRAND_GRADIENT }}
            >
              <ArrowRight className="h-4 w-4" />
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Tela de decisão ───────────────────────────────────────────────────────────

function DecisaoScreen({
  onDecisao,
  loading,
}: {
  onDecisao: (d: 'importar' | 'sem_importacao') => void
  loading: boolean
}) {
  return (
    <StepCard
      icon={<Database className="h-7 w-7" />}
      title="Como você quer começar?"
      subtitle="Você tem dados em outras plataformas ou planilhas que quer trazer para o Clinitra?"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Importar */}
        <button
          onClick={() => onDecisao('importar')}
          disabled={loading}
          className="group flex flex-col items-start gap-3 rounded-xl border-2 border-slate-200 bg-white p-5 text-left transition-all hover:border-[#04c2fb]/50 hover:shadow-md hover:shadow-[#04c2fb]/10 active:scale-[0.98] disabled:opacity-60"
        >
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-sm"
            style={{ background: BRAND_GRADIENT }}
          >
            <Database className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-slate-800 text-sm">Tenho dados para importar</p>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">Traga pacientes, financeiro e registros de outras plataformas.</p>
          </div>
        </button>

        {/* Do zero */}
        <button
          onClick={() => onDecisao('sem_importacao')}
          disabled={loading}
          className="group flex flex-col items-start gap-3 rounded-xl border-2 border-slate-200 bg-slate-50 p-5 text-left transition-all hover:border-slate-300 hover:bg-white hover:shadow-md active:scale-[0.98] disabled:opacity-60"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-200 text-slate-600">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-slate-700 text-sm">Começar do zero</p>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">Configure sua clínica agora e cadastre os dados diretamente no sistema.</p>
          </div>
        </button>
      </div>

      {loading && (
        <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Salvando...
        </div>
      )}
    </StepCard>
  )
}

// ── Tela de importação ────────────────────────────────────────────────────────

function ImportScreen({
  modulo,
  title,
  subtitle,
  iconColor,
  icon,
  onSuccess,
  onPular,
  pularLoading,
  opcional,
}: {
  modulo: 'pacientes' | 'financeiro' | 'registros'
  title: string
  subtitle: string
  iconColor: string
  icon: React.ReactNode
  onSuccess: () => void
  onPular: () => void
  pularLoading: boolean
  opcional: boolean
}) {
  return (
    <StepCard
      icon={icon}
      iconColor={iconColor}
      title={title}
      subtitle={subtitle}
      className="max-w-2xl"
    >
      <ImportWizard key={modulo} modulo={modulo} onSuccess={onSuccess} />
      <div className="mt-4 flex items-center justify-center">
        <button
          onClick={onPular}
          disabled={pularLoading}
          className="flex items-center gap-1.5 text-xs font-medium text-slate-400 transition-colors hover:text-slate-600 disabled:opacity-40"
        >
          {pularLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <SkipForward className="h-3.5 w-3.5" />
          )}
          {opcional ? 'Pular esta etapa' : 'Pular importação e continuar'}
        </button>
      </div>
    </StepCard>
  )
}

// ── Tela concluída ────────────────────────────────────────────────────────────

function ConcluidoScreen({ onFinalizar, finishing }: { onFinalizar: () => void; finishing: boolean }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12 text-center">
      <div
        className="onboarding-check-pop flex h-24 w-24 items-center justify-center rounded-full shadow-lg shadow-emerald-200/60 mb-6"
        style={{ background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)' }}
      >
        <CheckCircle2 className="h-12 w-12 text-white" />
      </div>
      <div style={{ animation: 'onboarding-step-in 0.4s 0.2s cubic-bezier(0.22,1,0.36,1) both' }}>
        <h1 className="text-3xl font-bold text-white">Sua clínica está pronta!</h1>
        <p className="mt-3 text-base text-white/75 max-w-sm mx-auto">
          Tudo configurado. Agora você pode começar a usar o Clinitra.
        </p>
      </div>
      <div style={{ animation: 'onboarding-step-in 0.4s 0.35s cubic-bezier(0.22,1,0.36,1) both' }}>
        <button
          onClick={onFinalizar}
          disabled={finishing}
          className="mt-8 flex items-center gap-3 rounded-2xl bg-white px-9 py-4 text-base font-bold shadow-xl shadow-black/20 transition-all hover:shadow-2xl hover:shadow-black/25 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
        >
          {finishing ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" style={{ color: '#04c2fb' }} />
              <span style={{ background: BRAND_GRADIENT, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                Entrando...
              </span>
            </>
          ) : (
            <>
              <span style={{ background: BRAND_GRADIENT, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                Começar
              </span>
              <span
                className="flex h-7 w-7 items-center justify-center rounded-full text-white transition-transform group-hover:translate-x-0.5"
                style={{ background: BRAND_GRADIENT }}
              >
                <ArrowRight className="h-4 w-4" />
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const [showWelcome, setShowWelcome] = useState(true)
  const [opacity, setOpacity] = useState(1)
  const [finishing, setFinishing] = useState(false)
  const [tiposSelecionados, setTiposSelecionados] = useState<SelectedTipo[]>([])
  const [tiposEtapaConcluida, setTiposEtapaConcluida] = useState(false)

  const { data: flow, isLoading, isError } = useOnboardingFlow()
  const decidirImportacao = useDecidirImportacaoOnboarding()
  const pularEtapa = usePularEtapaOnboarding()

  // Fade out → execute callback → fade in
  const withFade = useCallback((fn: () => void | Promise<void>) => {
    setOpacity(0)
    setTimeout(async () => {
      await fn()
      setOpacity(1)
    }, 220)
  }, [])

  function handleComecou() {
    withFade(() => setShowWelcome(false))
  }

  async function handleDecisao(decisao: 'importar' | 'sem_importacao') {
    setOpacity(0)
    try {
      await decidirImportacao.mutateAsync({ decisao })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Não foi possível salvar a decisão.'
      toast.error('Erro', { description: msg })
    }
    setOpacity(1)
  }

  async function handlePularEtapa(etapa: OnboardingSkipPayload['etapa']) {
    setOpacity(0)
    try {
      await pularEtapa.mutateAsync({ etapa })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Não foi possível pular a etapa.'
      toast.error('Erro', { description: msg })
    }
    setOpacity(1)
  }

  function handleImportSuccess() {
    withFade(() => {
      queryClient.invalidateQueries({ queryKey: ['onboarding', 'fluxo'] })
    })
  }

  function handleTiposSuccess(tipos: SelectedTipo[]) {
    withFade(() => {
      setTiposSelecionados(tipos)
      setTiposEtapaConcluida(true)
    })
  }

  function handlePlanosSuccess() {
    withFade(() => {
      queryClient.invalidateQueries({ queryKey: ['onboarding', 'fluxo'] })
    })
  }

  function handlePacienteSuccess() {
    withFade(() => {
      queryClient.invalidateQueries({ queryKey: ['onboarding', 'fluxo'] })
    })
  }

  async function handleFinalizar() {
    if (finishing) return
    setFinishing(true)
    try {
      const supabase = createClient()
      await supabase.auth.refreshSession()
    } catch { /* noop */ }
    router.push('/dashboard')
    router.refresh()
  }

  // ── Tela de boas-vindas ─────────────────────────────────────────────────────
  if (showWelcome) {
    return (
      <StepWrapper opacity={opacity}>
        <WelcomeScreen onStart={handleComecou} />
      </StepWrapper>
    )
  }

  // ── Carregando ──────────────────────────────────────────────────────────────
  if (isLoading || !flow) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
            <Loader2 className="h-6 w-6 animate-spin text-white" />
          </div>
          <p className="text-sm text-white/70">Carregando...</p>
        </div>
      </div>
    )
  }

  // ── Erro ─────────────────────────────────────────────────────────────────────
  if (isError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-sm font-medium text-white/90">Não foi possível carregar o onboarding.</p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-xl border border-white/30 bg-white/15 px-4 py-2 text-sm font-medium text-white hover:bg-white/25"
        >
          Tentar novamente
        </button>
      </div>
    )
  }

  // ── Concluído ───────────────────────────────────────────────────────────────
  if (flow.concluido) {
    return (
      <StepWrapper opacity={opacity}>
        <StepHeader nextStep={null} />
        <ConcluidoScreen onFinalizar={handleFinalizar} finishing={finishing} />
      </StepWrapper>
    )
  }

  // ── Etapas ──────────────────────────────────────────────────────────────────
  function renderStep() {
    if (!flow) return null

    // Decisão de importação
    if (flow.next_step === 'decidir_importacao') {
      return (
        <DecisaoScreen
          onDecisao={handleDecisao}
          loading={decidirImportacao.isPending}
        />
      )
    }

    // Importar pacientes
    if (flow.next_step === 'import_pacientes') {
      return (
        <ImportScreen
          modulo="pacientes"
          title="Importe sua base de pacientes"
          subtitle="Traga o cadastro completo dos seus pacientes existentes."
          iconColor={BRAND_GRADIENT}
          icon={<Users className="h-7 w-7" />}
          onSuccess={handleImportSuccess}
          onPular={() => handlePularEtapa('import_pacientes')}
          pularLoading={pularEtapa.isPending}
          opcional={false}
        />
      )
    }

    // Importar financeiro
    if (flow.next_step === 'import_financeiro') {
      return (
        <ImportScreen
          modulo="financeiro"
          title="Importe seu histórico financeiro"
          subtitle="Traga suas receitas e despesas históricas para o Clinitra."
          iconColor="linear-gradient(135deg, #059669 0%, #10b981 100%)"
          icon={<DollarSign className="h-7 w-7" />}
          onSuccess={handleImportSuccess}
          onPular={() => handlePularEtapa('import_financeiro')}
          pularLoading={pularEtapa.isPending}
          opcional
        />
      )
    }

    // Importar registros
    if (flow.next_step === 'import_registros') {
      return (
        <ImportScreen
          modulo="registros"
          title="Importe registros de atendimento"
          subtitle="Traga anotações e histórico de atendimentos anteriores."
          iconColor="linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)"
          icon={<BookOpen className="h-7 w-7" />}
          onSuccess={handleImportSuccess}
          onPular={() => handlePularEtapa('import_registros')}
          pularLoading={pularEtapa.isPending}
          opcional
        />
      )
    }

    // Tipos de atendimento (etapa local — antes de criar o plano)
    if (flow.next_step === 'planos' && !tiposEtapaConcluida) {
      return (
        <StepCard
          icon={<Package className="h-7 w-7" />}
          title="Que tipos de atendimento você oferece?"
          subtitle="Selecione ou adicione os tipos de atendimento da sua clínica. Você pode alterar isso depois na aba Planos."
        >
          <TiposAtendimentoStep onSuccess={handleTiposSuccess} />
        </StepCard>
      )
    }

    // Criar plano
    if (flow.next_step === 'planos' && tiposEtapaConcluida) {
      return (
        <StepCard
          icon={<Package className="h-7 w-7" />}
          title="Crie seu primeiro pacote"
          subtitle="Configure como você cobra pelos atendimentos na sua clínica."
        >
          <CriarPlanoForm onSuccess={handlePlanosSuccess} tiposSelecionados={tiposSelecionados} />
        </StepCard>
      )
    }

    // Adicionar paciente
    if (flow.next_step === 'adicionar_paciente') {
      return (
        <StepCard
          icon={<UserPlus className="h-7 w-7" />}
          title="Adicione seu primeiro paciente"
          subtitle="Cadastre um paciente para começar a usar o Clinitra."
        >
          <AdicionarPacienteForm onSuccess={handlePacienteSuccess} />
        </StepCard>
      )
    }

    return null
  }

  // Etapa exibida nos dots — quando next_step='planos' e tipos ainda não concluídos, mostra dot 'tipos_atendimento'
  const dotStep =
    flow.next_step === 'planos' && !tiposEtapaConcluida
      ? 'tipos_atendimento'
      : flow.next_step

  return (
    <StepWrapper opacity={opacity}>
      <StepHeader nextStep={dotStep} />
      {/* Padding-top para compensar o header fixo */}
      <div className="flex min-h-screen flex-col items-center justify-center px-4 pt-24 pb-12">
        {renderStep()}
      </div>
    </StepWrapper>
  )
}
