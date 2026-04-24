'use client'

import { Suspense, useEffect, useRef, useState, type ElementType } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  AlertCircle,
  Banknote,
  BookOpen,
  Building2,
  Calendar,
  CalendarClock,
  Camera,
  CheckCircle2,
  Database,
  DollarSign,
  Info,
  Lock,
  Loader2,
  MapPin,
  MessageSquare,
  Plug,
  Save,
  SlidersHorizontal,
  Stethoscope,
  Trash2,
  User,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  useConfiguracoes,
  useSalvarConfiguracoes,
  useSalvarWhatsAppTemplate,
  useUploadLogo,
  useRemoverLogo,
} from '@/hooks/use-configuracoes'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useGoogleCalendar } from '@/hooks/use-google-calendar'
import { useTiposAtendimento, useAtualizarContaComoAtendimentoLote } from '@/hooks/use-planos'
import { Switch } from '@/components/ui/switch'
import { ImportWizard } from '@/components/onboarding/import-wizard'
import type { ImportModulo } from '@/components/onboarding/import-wizard'

// ─── Constantes e helpers compartilhados ──────────────────────────────────────

const GRADIENT = 'linear-gradient(135deg, #0094c8 0%, #04c2fb 60%, #00d5f5 100%)'

function maskCEP(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 8)
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d
}

function maskTelefone(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2) return d
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

function Campo({
  label,
  children,
  className,
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label className="text-xs font-medium text-slate-600">{label}</Label>
      {children}
    </div>
  )
}

// ─── Navegação ────────────────────────────────────────────────────────────────

type AbaConfig = 'geral' | 'financeiro' | 'atendimentos' | 'dados' | 'conexoes'

const configNav: { id: AbaConfig; title: string; icon: ElementType }[] = [
  { id: 'geral',          title: 'Geral',          icon: SlidersHorizontal },
  { id: 'financeiro',     title: 'Financeiro',     icon: Banknote },
  { id: 'atendimentos',   title: 'Atendimentos',   icon: Stethoscope },
  { id: 'dados',          title: 'Dados',          icon: Database },
  { id: 'conexoes',       title: 'Conexões',       icon: Plug },
]

// ─── Aba Geral ────────────────────────────────────────────────────────────────

function AbaGeral() {
  const { data: config, isLoading } = useConfiguracoes()
  const { mutateAsync: salvar, isPending: salvando } = useSalvarConfiguracoes()
  const { mutateAsync: uploadLogo, isPending: uploadando } = useUploadLogo()
  const { mutateAsync: removerLogo, isPending: removendo } = useRemoverLogo()

  const [nomeClinica, setNomeClinica] = useState('')
  const [especialidade, setEspecialidade] = useState('')
  const [nomeResponsavel, setNomeResponsavel] = useState('')
  const [telefone, setTelefone] = useState('')
  const [emailContato, setEmailContato] = useState('')
  const [cep, setCep] = useState('')
  const [logradouro, setLogradouro] = useState('')
  const [numero, setNumero] = useState('')
  const [complemento, setComplemento] = useState('')
  const [bairro, setBairro] = useState('')
  const [cidade, setCidade] = useState('')
  const [estado, setEstado] = useState('')
  const [buscandoCEP, setBuscandoCEP] = useState(false)
  const [hoverLogo, setHoverLogo] = useState(false)
  const [salvoComSucesso, setSalvoComSucesso] = useState(false)

  const inputFileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!config) return
    setNomeClinica(config.nome_clinica ?? '')
    setEspecialidade(config.especialidade ?? '')
    setNomeResponsavel(config.nome_responsavel ?? '')
    setTelefone(config.telefone ?? '')
    setEmailContato(config.email_contato ?? '')
    setCep(config.cep ?? '')
    setLogradouro(config.logradouro ?? '')
    setNumero(config.numero ?? '')
    setComplemento(config.complemento ?? '')
    setBairro(config.bairro ?? '')
    setCidade(config.cidade ?? '')
    setEstado(config.estado ?? '')
  }, [config])

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Imagem muito grande', { description: 'O tamanho máximo é 2 MB.' })
      return
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Formato inválido', { description: 'Use JPEG, PNG ou WebP.' })
      return
    }
    try {
      await uploadLogo({ file, logoAtual: config?.logo_url ?? null })
      toast.success('Logo atualizada', { description: 'Imagem salva com sucesso.' })
    } catch {
      toast.error('Erro ao salvar logo', { description: 'Tente novamente.' })
    }
  }

  async function handleRemoverLogo() {
    if (!config?.logo_url) return
    try {
      await removerLogo(config.logo_url)
      toast.success('Logo removida')
    } catch {
      toast.error('Erro ao remover logo', { description: 'Tente novamente.' })
    }
  }

  async function handleCEP(raw: string) {
    const masked = maskCEP(raw)
    setCep(masked)
    const digits = masked.replace(/\D/g, '')
    if (digits.length < 8) return
    setBuscandoCEP(true)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
      const data = await res.json()
      if (data.erro) {
        toast.error('CEP não encontrado', { description: 'Verifique o CEP e tente novamente.' })
      } else {
        setLogradouro(data.logradouro ?? logradouro)
        setBairro(data.bairro ?? bairro)
        setCidade(data.localidade ?? cidade)
        setEstado(data.uf ?? estado)
      }
    } catch {
      toast.error('Erro ao buscar CEP', { description: 'Verifique sua conexão.' })
    } finally {
      setBuscandoCEP(false)
    }
  }

  async function handleSave() {
    if (!nomeClinica.trim()) {
      toast.error('Nome obrigatório', { description: 'Preencha o nome da clínica antes de salvar.' })
      return
    }
    try {
      await salvar({
        nome_clinica: nomeClinica,
        especialidade: especialidade || null,
        nome_responsavel: nomeResponsavel,
        telefone: telefone || null,
        email_contato: emailContato || null,
        cep: cep || null,
        logradouro: logradouro || null,
        numero: numero || null,
        complemento: complemento || null,
        bairro: bairro || null,
        cidade: cidade || null,
        estado: estado || null,
      })
      setSalvoComSucesso(true)
      toast.success('Configurações salvas', { description: 'Perfil da clínica atualizado.' })
    } catch {
      toast.error('Erro ao salvar', { description: 'Tente novamente.' })
    }
  }

  const iniciais = nomeClinica
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('') || 'CL'

  const cepCompleto = cep.replace(/\D/g, '').length === 8
  const enderecoDesabilitado = !cepCompleto || buscandoCEP
  const logoProcessando = uploadando || removendo

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-[#04c2fb]" />
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-6">
      <Card>
        <CardHeader className="pb-3 p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#04c2fb]/10 shrink-0">
              <Building2 className="h-4 w-4 text-[#04c2fb]" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">Identidade da clínica</CardTitle>
              <CardDescription className="text-xs mt-0.5">Logo, nome e área de atuação</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 px-4 sm:px-6 pb-4 sm:pb-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
            <div className="flex flex-col items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => !logoProcessando && inputFileRef.current?.click()}
                onMouseEnter={() => setHoverLogo(true)}
                onMouseLeave={() => setHoverLogo(false)}
                disabled={logoProcessando}
                className="relative h-24 w-24 rounded-full overflow-hidden ring-2 ring-white shadow-md focus-visible:outline-none focus-visible:ring-[#04c2fb] focus-visible:ring-offset-2 transition-transform active:scale-95 disabled:cursor-not-allowed"
              >
                {config?.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={config.logo_url} alt="Logo da clínica" className="h-full w-full object-cover" />
                ) : (
                  <div
                    className="h-full w-full flex items-center justify-center text-white text-2xl font-bold tracking-tight select-none"
                    style={{ background: GRADIENT }}
                  >
                    {iniciais}
                  </div>
                )}
                <div
                  className={cn(
                    'absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity duration-150',
                    (hoverLogo && !logoProcessando) ? 'opacity-100' : 'opacity-0',
                    logoProcessando && 'opacity-100',
                  )}
                >
                  {logoProcessando ? (
                    <Loader2 className="h-6 w-6 text-white animate-spin drop-shadow" />
                  ) : (
                    <Camera className="h-6 w-6 text-white drop-shadow" />
                  )}
                </div>
              </button>
              <span className="text-[11px] text-muted-foreground">Clique para alterar</span>
              {config?.logo_url && (
                <button
                  type="button"
                  onClick={handleRemoverLogo}
                  disabled={logoProcessando}
                  className="flex items-center gap-1 text-[11px] text-rose-500 hover:text-rose-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Trash2 className="h-3 w-3" />
                  Remover
                </button>
              )}
              <input
                ref={inputFileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleLogoChange}
              />
            </div>
            <div className="flex-1 w-full space-y-3">
              <Campo label="Nome da clínica">
                <Input
                  placeholder="Ex: Clínica Bem Estar"
                  value={nomeClinica}
                  onChange={e => { setNomeClinica(e.target.value); setSalvoComSucesso(false) }}
                  className="h-9 text-sm"
                />
              </Campo>
              <Campo label="Especialidade">
                <Input
                  placeholder="Ex: Psicologia Clínica, Fisioterapia..."
                  value={especialidade}
                  onChange={e => { setEspecialidade(e.target.value); setSalvoComSucesso(false) }}
                  className="h-9 text-sm"
                />
              </Campo>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3 p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#04c2fb]/10 shrink-0">
              <User className="h-4 w-4 text-[#04c2fb]" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">Responsável</CardTitle>
              <CardDescription className="text-xs mt-0.5">Dados de contato do responsável pela clínica</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 px-4 sm:px-6 pb-4 sm:pb-6">
          <Campo label="Nome completo">
            <Input
              placeholder="Ex: Dr. Carlos Mendes"
              value={nomeResponsavel}
              onChange={e => { setNomeResponsavel(e.target.value); setSalvoComSucesso(false) }}
              className="h-9 text-sm"
            />
          </Campo>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Campo label="Telefone">
              <Input
                placeholder="(00) 00000-0000"
                value={telefone}
                onChange={e => { setTelefone(maskTelefone(e.target.value)); setSalvoComSucesso(false) }}
                inputMode="numeric"
                className="h-9 text-sm"
              />
            </Campo>
            <Campo label="E-mail de contato">
              <Input
                type="email"
                placeholder="contato@clinica.com.br"
                value={emailContato}
                onChange={e => { setEmailContato(e.target.value); setSalvoComSucesso(false) }}
                className="h-9 text-sm"
              />
            </Campo>
          </div>
          <Campo label="E-mail de acesso">
            <Input
              type="email"
              value={config?.email_responsavel ?? ''}
              disabled
              className="h-9 text-sm opacity-60"
            />
            <p className="text-[11px] text-muted-foreground">
              Para alterar o e-mail de acesso, entre em contato com o suporte.
            </p>
          </Campo>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3 p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#04c2fb]/10 shrink-0">
              <MapPin className="h-4 w-4 text-[#04c2fb]" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">Endereço</CardTitle>
              <CardDescription className="text-xs mt-0.5">Localização física da clínica</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 px-4 sm:px-6 pb-4 sm:pb-6">
          <Campo label="CEP" className="max-w-[180px]">
            <div className="relative">
              <Input
                placeholder="00000-000"
                value={cep}
                onChange={e => { handleCEP(e.target.value); setSalvoComSucesso(false) }}
                inputMode="numeric"
                className={cn('h-9 text-sm', buscandoCEP && 'pr-9')}
                maxLength={9}
              />
              {buscandoCEP && (
                <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#04c2fb] animate-spin" />
              )}
            </div>
          </Campo>
          <Campo label="Logradouro">
            <Input
              placeholder="Rua, Avenida, Alameda..."
              value={logradouro}
              onChange={e => { setLogradouro(e.target.value); setSalvoComSucesso(false) }}
              disabled={enderecoDesabilitado}
              className={cn('h-9 text-sm', enderecoDesabilitado && 'opacity-50')}
            />
          </Campo>
          <div className="grid grid-cols-2 gap-3">
            <Campo label="Número">
              <Input
                placeholder="Ex: 142"
                value={numero}
                onChange={e => { setNumero(e.target.value); setSalvoComSucesso(false) }}
                disabled={enderecoDesabilitado}
                className={cn('h-9 text-sm', enderecoDesabilitado && 'opacity-50')}
              />
            </Campo>
            <Campo label="Complemento">
              <Input
                placeholder="Sala 3, Bloco B..."
                value={complemento}
                onChange={e => { setComplemento(e.target.value); setSalvoComSucesso(false) }}
                disabled={enderecoDesabilitado}
                className={cn('h-9 text-sm', enderecoDesabilitado && 'opacity-50')}
              />
            </Campo>
          </div>
          <Campo label="Bairro">
            <Input
              placeholder="Bairro"
              value={bairro}
              onChange={e => { setBairro(e.target.value); setSalvoComSucesso(false) }}
              disabled={enderecoDesabilitado}
              className={cn('h-9 text-sm', enderecoDesabilitado && 'opacity-50')}
            />
          </Campo>
          <div className="grid grid-cols-3 gap-3">
            <Campo label="Cidade" className="col-span-2">
              <Input
                placeholder="Cidade"
                value={cidade}
                onChange={e => { setCidade(e.target.value); setSalvoComSucesso(false) }}
                disabled={enderecoDesabilitado}
                className={cn('h-9 text-sm', enderecoDesabilitado && 'opacity-50')}
              />
            </Campo>
            <Campo label="Estado">
              <Input
                placeholder="UF"
                value={estado}
                onChange={e => { setEstado(e.target.value.toUpperCase().slice(0, 2)); setSalvoComSucesso(false) }}
                disabled={enderecoDesabilitado}
                className={cn('h-9 text-sm', enderecoDesabilitado && 'opacity-50')}
                maxLength={2}
              />
            </Campo>
          </div>
          {!cepCompleto && (
            <p className="text-[11px] text-muted-foreground">
              Digite o CEP para preencher os campos de endereço automaticamente.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between pt-1">
        {salvoComSucesso ? (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            Configurações salvas
          </span>
        ) : (
          <span />
        )}
        <Button
          size="sm"
          disabled={salvando}
          onClick={handleSave}
          className="gap-1.5 text-white transition-all active:scale-95 hover:brightness-110"
          style={{ background: GRADIENT }}
        >
          {salvando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Salvar alterações
        </Button>
      </div>
    </div>
  )
}

// ─── Aba Financeiro ───────────────────────────────────────────────────────────

const STORAGE_KEY = 'clinitra:dia_vencimento'
const DIAS = Array.from({ length: 28 }, (_, i) => i + 1)
const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]

function proximoVencimento(dia: number): string {
  const hoje = new Date()
  const anoAtual = hoje.getFullYear()
  const mesAtual = hoje.getMonth()
  const candidato = new Date(anoAtual, mesAtual, dia)
  const alvo = candidato > hoje ? candidato : new Date(anoAtual, mesAtual + 1, dia)
  return `${alvo.getDate()} de ${MESES[alvo.getMonth()]} de ${alvo.getFullYear()}`
}

function AbaFinanceiro() {
  const [selecionado, setSelecionado] = useState<number | null>(() => {
    if (typeof window === 'undefined') return null
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? Number(stored) : null
  })
  const [salvo, setSalvo] = useState<number | null>(() => {
    if (typeof window === 'undefined') return null
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? Number(stored) : null
  })

  const dirty = selecionado !== salvo

  function handleSave() {
    if (!selecionado) {
      toast.error('Selecione um dia', {
        description: 'Toque em um dos dias abaixo para definir o vencimento padrão.',
      })
      return
    }
    localStorage.setItem(STORAGE_KEY, String(selecionado))
    setSalvo(selecionado)
    toast.success('Configuração salva', {
      description: `Vencimento padrão definido para o dia ${selecionado} de cada mês.`,
    })
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#04c2fb]/10 shrink-0">
              <CalendarClock className="h-4 w-4 text-[#04c2fb]" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">Dia de vencimento padrão</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Pré-preenche a data de vencimento ao criar novas cobranças
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-7 gap-1 max-w-[220px]">
            {DIAS.map((d) => {
              const ativo = selecionado === d
              return (
                <button
                  key={d}
                  onClick={() => setSelecionado(d)}
                  className={cn(
                    'aspect-square rounded-lg text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#04c2fb]/50',
                    ativo
                      ? 'text-white shadow-md scale-105'
                      : 'bg-slate-100 text-slate-600 hover:bg-[#04c2fb]/10 hover:text-[#04c2fb] hover:scale-105 active:scale-95',
                  )}
                  style={ativo ? { background: GRADIENT } : {}}
                >
                  {d}
                </button>
              )
            })}
          </div>

          {selecionado ? (
            <div className="rounded-xl border border-[#04c2fb]/20 bg-[#04c2fb]/5 px-4 py-3 space-y-1">
              <p className="text-sm text-slate-700">
                Cobranças vencem todo{' '}
                <span
                  className="font-bold text-white px-2 py-0.5 rounded-md text-sm"
                  style={{ background: GRADIENT }}
                >
                  dia {selecionado}
                </span>{' '}
                do mês
              </p>
              <p className="text-xs text-slate-500 flex items-center gap-1.5">
                <CalendarClock className="h-3.5 w-3.5 text-[#04c2fb] shrink-0" />
                Próximo vencimento:{' '}
                <span className="font-medium text-slate-700">{proximoVencimento(selecionado)}</span>
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 flex items-start gap-2 text-xs text-slate-400">
              <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              Selecione um dia acima para ver o preview do vencimento.
            </div>
          )}

          <p className="text-[11px] text-muted-foreground flex items-start gap-1.5">
            <Info className="h-3 w-3 mt-0.5 shrink-0" />
            Os dias 29, 30 e 31 não estão disponíveis pois nem todos os meses os possuem.
          </p>

          <div className="flex items-center justify-between pt-1">
            {salvo && !dirty ? (
              <span className="text-xs text-muted-foreground">Dia {salvo} salvo</span>
            ) : (
              <span />
            )}
            <Button
              size="sm"
              disabled={!dirty}
              onClick={handleSave}
              className="gap-1.5 text-white hover:brightness-110 active:scale-95 transition-all"
              style={dirty ? { background: GRADIENT } : {}}
            >
              <Save className="h-3.5 w-3.5" />
              Salvar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 shrink-0">
              <Banknote className="h-4 w-4 text-slate-400" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold text-slate-500">Mais configurações</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Moeda, impostos e regras de cobrança em breve
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>
    </div>
  )
}

// ─── Aba Dados ────────────────────────────────────────────────────────────────

const MODULOS: Record<ImportModulo, {
  label: string
  icon: ElementType
  descricao: string
  exemplo: string
  cor: string
  corBg: string
  corBorda: string
}> = {
  pacientes: {
    label: 'Pacientes',
    icon: Users,
    descricao: 'Importe o cadastro completo dos seus pacientes com dados de contato e informações pessoais.',
    exemplo: 'Nome, CPF, telefone, e-mail, CEP...',
    cor: 'text-[#04c2fb]',
    corBg: 'bg-[#04c2fb]/10',
    corBorda: 'border-[#04c2fb]',
  },
  financeiro: {
    label: 'Financeiro',
    icon: DollarSign,
    descricao: 'Traga o histórico de receitas e despesas da clínica, incluindo pagamentos de atendimentos passados.',
    exemplo: 'Tipo, valor, status, data de referência...',
    cor: 'text-emerald-600',
    corBg: 'bg-emerald-50',
    corBorda: 'border-emerald-400',
  },
  registros: {
    label: 'Registros de Atendimento',
    icon: BookOpen,
    descricao: 'Importe anotações e registros de atendimentos anteriores vinculados aos seus pacientes.',
    exemplo: 'Paciente, data, presença, anotações...',
    cor: 'text-violet-600',
    corBg: 'bg-violet-50',
    corBorda: 'border-violet-400',
  },
}

function AbaDados({ moduloQuery }: { moduloQuery: string | null }) {
  const moduloForcado: ImportModulo | null =
    moduloQuery === 'pacientes' || moduloQuery === 'financeiro' || moduloQuery === 'registros'
      ? moduloQuery
      : null

  const [modulo, setModulo] = useState<ImportModulo>(moduloForcado ?? 'pacientes')

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-sm font-semibold text-slate-800">Importação de Dados</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Traga seus dados históricos para o Clinitra em poucos passos.
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">O que você quer importar?</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(Object.entries(MODULOS) as [ImportModulo, (typeof MODULOS)[ImportModulo]][]).map(([key, cfg]) => {
            const Icon = cfg.icon
            const ativo = modulo === key
            const bloqueado = !!moduloForcado && key !== moduloForcado
            return (
              <button
                key={key}
                onClick={() => { if (!bloqueado) setModulo(key) }}
                className={cn(
                  'group relative flex flex-col items-start gap-3 rounded-xl border-2 p-4 text-left transition-all duration-200',
                  bloqueado && 'opacity-45 cursor-not-allowed',
                  ativo
                    ? cn('shadow-md', cfg.corBorda, cfg.corBg)
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm',
                )}
              >
                {ativo && (
                  <span className={cn('absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full border-2 bg-white', cfg.corBorda)}>
                    <CheckCircle2 className={cn('h-3 w-3', cfg.cor)} />
                  </span>
                )}
                <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg transition-colors', ativo ? cfg.corBg : 'bg-slate-100 group-hover:bg-slate-200')}>
                  <Icon className={cn('h-5 w-5', ativo ? cfg.cor : 'text-slate-500')} />
                </div>
                <div className="space-y-1 pr-6">
                  <p className={cn('text-sm font-bold', ativo ? cfg.cor : 'text-slate-700')}>{cfg.label}</p>
                  <p className="text-xs text-slate-500 leading-relaxed">{cfg.descricao}</p>
                  <p className={cn('text-[10px] font-medium mt-1', ativo ? cfg.cor : 'text-slate-400')}>{cfg.exemplo}</p>
                </div>
              </button>
            )
          })}
        </div>
        {moduloForcado && (
          <p className="text-[11px] text-slate-500">
            Módulo fixado: <span className="font-semibold">{MODULOS[moduloForcado].label}</span>
          </p>
        )}
      </div>

      <ImportWizard key={modulo} modulo={modulo} />
    </div>
  )
}

// ─── Aba Atendimentos ─────────────────────────────────────────────────────────

function AbaAtendimentos() {
  const { data, isLoading } = useTiposAtendimento()
  const salvarLote = useAtualizarContaComoAtendimentoLote()

  // Estado local: map de id → valor pendente (só ids alterados pelo usuário)
  const [pendentes, setPendentes] = useState<Record<string, boolean>>({})

  const temAlteracoes = Object.keys(pendentes).length > 0

  // Valor exibido: pendente se alterado, senão valor da API
  function valorAtual(id: string, valorApi: boolean): boolean {
    return id in pendentes ? pendentes[id] : valorApi
  }

  function handleToggle(id: string, valorAtualItem: boolean) {
    const novoValor = !valorAtualItem
    setPendentes(prev => {
      const next = { ...prev }
      // Se voltou ao valor original da API, remove das pendências
      const original = data?.items.find(t => t.id === id)?.conta_como_atendimento
      if (novoValor === original) {
        delete next[id]
      } else {
        next[id] = novoValor
      }
      return next
    })
  }

  function handleSalvar() {
    const items = Object.entries(pendentes).map(([id, conta_como_atendimento]) => ({
      id,
      conta_como_atendimento,
    }))
    salvarLote.mutate(items, {
      onSuccess: () => {
        setPendentes({})
        toast.success('Configurações salvas', {
          description: 'Numeração de atendimentos recalculada para os pacientes afetados.',
        })
      },
      onError: () =>
        toast.error('Erro ao salvar', { description: 'Tente novamente.' }),
    })
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
          <Stethoscope className="h-4 w-4 text-[#04c2fb]" />
          Contagem de atendimentos
        </h2>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          Defina quais tipos de atendimento entram na numeração sequencial.
          Tipos desativados ainda aparecem nos registros, mas não recebem número de atendimento.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-slate-700">Tipos de atendimento</CardTitle>
          <CardDescription className="text-xs">
            Ative ou desative cada tipo. O recálculo ocorre ao salvar.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center gap-2 px-6 py-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando tipos...
            </div>
          ) : !data?.items.length ? (
            <p className="px-6 py-4 text-sm text-muted-foreground">Nenhum tipo de atendimento cadastrado.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.items.map((tipo) => {
                const atual = valorAtual(tipo.id, tipo.conta_como_atendimento)
                const alterado = tipo.id in pendentes
                return (
                  <li key={tipo.id} className="flex items-center justify-between gap-4 px-6 py-3 min-h-[52px]">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-slate-800 truncate">{tipo.nome}</p>
                        {alterado && (
                          <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                            alterado
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {tipo.padrao ? 'Tipo padrão' : 'Tipo personalizado'}
                        {atual
                          ? ' · conta na numeração'
                          : ' · não conta na numeração'}
                      </p>
                    </div>
                    <Switch
                      checked={atual}
                      onCheckedChange={() => handleToggle(tipo.id, atual)}
                      disabled={salvarLote.isPending}
                      aria-label={`${atual ? 'Desativar' : 'Ativar'} contagem para ${tipo.nome}`}
                    />
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 flex items-start gap-3">
        <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
        <p className="text-xs text-blue-700 leading-relaxed">
          Ao salvar, os números de atendimento de todos os pacientes com registros dos tipos
          alterados são recalculados de uma vez.
        </p>
      </div>

      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={handleSalvar}
          disabled={!temAlteracoes || salvarLote.isPending}
          className="gap-1.5 text-white transition-all active:scale-95 hover:brightness-110"
          style={{ background: GRADIENT }}
        >
          {salvarLote.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Salvar configurações
        </Button>
      </div>
    </div>
  )
}

// ─── Aba Conexões ─────────────────────────────────────────────────────────────

const DEFAULT_WHATSAPP_TEMPLATE =
  'Olá, {nome}! Sua consulta de {tipo} está agendada para {data} às {horario}.\n\nConfirme sua presença pelo link: {link_confirmacao}'

const VARIAVEIS_WA = [
  { key: '{nome}',             label: 'Nome do paciente' },
  { key: '{data}',             label: 'Data' },
  { key: '{horario}',          label: 'Horário' },
  { key: '{tipo}',             label: 'Tipo de atendimento' },
  { key: '{link_confirmacao}', label: 'Link de confirmação' },
]

function AbaConexoes() {
  const { data: config } = useConfiguracoes()
  const temGoogleCalendar = config?.plano === 'pro' || config?.plano === 'clinica'
  const salvarTemplate = useSalvarWhatsAppTemplate()
  // Rastreia apenas edições do usuário (null = não editou ainda)
  const [waTemplateEdited, setWaTemplateEdited] = useState<string | null>(null)
  const waTemplate = waTemplateEdited ?? config?.whatsapp_template ?? DEFAULT_WHATSAPP_TEMPLATE
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function inserirVariavel(variavel: string) {
    const ta = textareaRef.current
    if (!ta) { setWaTemplateEdited(waTemplate + variavel); return }
    const ini = ta.selectionStart
    const fim = ta.selectionEnd
    const novo = waTemplate.slice(0, ini) + variavel + waTemplate.slice(fim)
    setWaTemplateEdited(novo)
    requestAnimationFrame(() => {
      ta.focus()
      ta.setSelectionRange(ini + variavel.length, ini + variavel.length)
    })
  }

  const previewMensagem = waTemplate
    .replace('{nome}', 'Maria Silva')
    .replace('{data}', '25/04/2026')
    .replace('{horario}', '14:30')
    .replace('{tipo}', 'Atendimento')
    .replace('{link_confirmacao}', 'https://app.clinitra.com.br/confirmar-agendamento/...')

  const { connected, googleEmail, loading, error, connect, disconnect } = useGoogleCalendar()

  async function handleConnect() {
    try {
      connect()
    } catch {
      toast.error('Erro ao conectar', { description: 'Não foi possível iniciar a autenticação.' })
    }
  }

  async function handleDisconnect() {
    try {
      await disconnect()
      toast.success('Desconectado', { description: 'Google Calendar foi desvinculado da sua conta.' })
    } catch {
      toast.error('Erro ao desconectar', { description: 'Tente novamente.' })
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
          <Plug className="h-4 w-4 text-[#04c2fb]" />
          Conexões e integrações
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Conecte serviços externos para sincronizar sua agenda e comunicação.
        </p>
      </div>

      {error && temGoogleCalendar && (
        <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-3">
        {/* Card Google Calendar */}
        <div className="rounded-xl border bg-card shadow-sm p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white border shadow-sm">
              <svg viewBox="0 0 32 32" className="h-6 w-6" fill="none">
                <rect x="4" y="4" width="24" height="24" rx="3" fill="#fff" stroke="#e0e0e0"/>
                <rect x="4" y="4" width="24" height="8" rx="3" fill="#1a73e8"/>
                <rect x="4" y="10" width="24" height="2" fill="#1a73e8"/>
                <text x="16" y="25" textAnchor="middle" fontSize="11" fontWeight="700" fill="#1a73e8">G</text>
                <rect x="9" y="7" width="3" height="6" rx="1.5" fill="white"/>
                <rect x="20" y="7" width="3" height="6" rx="1.5" fill="white"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-semibold text-slate-800">Google Calendar</h3>
                {!temGoogleCalendar && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                    <Lock className="h-2.5 w-2.5" />
                    Plano Pro
                  </span>
                )}
                {temGoogleCalendar && connected && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-50 border border-green-200 px-2 py-0.5 text-[11px] font-medium text-green-700">
                    <CheckCircle2 className="h-3 w-3" />
                    Conectado
                  </span>
                )}
              </div>
              {temGoogleCalendar && connected && googleEmail ? (
                <p className="text-xs text-muted-foreground mt-0.5">{googleEmail}</p>
              ) : (
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  Sincronize sua agenda pessoal do Google Calendar. Os eventos aparecerão
                  na página Agenda do Clinitra e você poderá exportar agendamentos para o Google.
                </p>
              )}
            </div>
            <div className="shrink-0 sm:mt-0.5">
              {!temGoogleCalendar ? (
                <button
                  onClick={() =>
                    toast.info('Em desenvolvimento', {
                      description: 'Os planos pagos ainda estão sendo configurados. Em breve você poderá fazer upgrade diretamente aqui.',
                    })
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:brightness-110 active:scale-95 transition-all"
                  style={{ background: GRADIENT }}
                >
                  Ver planos
                </button>
              ) : connected ? (
                <button
                  onClick={handleDisconnect}
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 transition-colors"
                >
                  Desconectar
                </button>
              ) : (
                <button
                  onClick={handleConnect}
                  disabled={loading}
                  className="flex items-center gap-1.5 rounded-lg border border-[#04c2fb]/30 bg-[#04c2fb]/5 px-3 py-1.5 text-xs font-medium text-[#04c2fb] hover:bg-[#04c2fb]/10 transition-colors disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Aguardando…
                    </>
                  ) : (
                    <>
                      <Calendar className="h-3.5 w-3.5" />
                      Conectar Google Calendar
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
          {!temGoogleCalendar && (
            <div className="mt-3 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2.5 flex items-center gap-2">
              <Lock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              <p className="text-xs text-amber-700">
                Disponível a partir do plano <span className="font-semibold">Pro</span>. Faça upgrade para ativar esta integração.
              </p>
            </div>
          )}
          {temGoogleCalendar && connected && (
            <div className="mt-4 rounded-lg bg-slate-50 border border-slate-100 px-3 py-2.5 text-[11px] text-muted-foreground space-y-1">
              <p>• Eventos do seu Google Calendar aparecem na página <strong className="text-slate-600">Agenda</strong> com badge distinto.</p>
              <p>• Agendamentos do Clinitra podem ser exportados para o seu calendário.</p>
              <p>• A conexão é individual — cada terapeuta conecta sua própria conta.</p>
            </div>
          )}
        </div>

        <div className="rounded-xl border bg-card/50 shadow-sm p-4 sm:p-5 opacity-60">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white border shadow-sm">
              <svg viewBox="0 0 32 32" className="h-6 w-6" fill="none">
                <path d="M5 24l4.5-8h13L27 24H5z" fill="#1e88e5"/>
                <path d="M11.5 8L5 24h7l6.5-16h-7z" fill="#4caf50"/>
                <path d="M20.5 8L27 24h-7l-6.5-16h6.5z" fill="#fdd835"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-slate-800">Google Drive</h3>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">Em breve</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Faça backup dos arquivos dos registros no seu Google Drive de forma automática.</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-card shadow-sm p-4 sm:p-5">
          {/* Cabeçalho */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white border shadow-sm">
              <MessageSquare className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Confirmação via WhatsApp</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Personalize a mensagem enviada ao paciente para confirmar o agendamento.
              </p>
            </div>
          </div>

          {/* Chips de variáveis */}
          <p className="text-xs font-medium text-slate-500 mb-2">Variáveis disponíveis — clique para inserir:</p>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {VARIAVEIS_WA.map((v) => (
              <button
                key={v.key}
                type="button"
                onClick={() => inserirVariavel(v.key)}
                title={v.label}
                className="inline-flex items-center rounded-full border border-[#04c2fb]/30 bg-[#04c2fb]/5 px-2.5 py-1 text-[11px] font-medium text-[#04c2fb] hover:bg-[#04c2fb]/10 transition-colors"
              >
                {v.key}
              </button>
            ))}
          </div>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={waTemplate}
            onChange={(e) => setWaTemplateEdited(e.target.value)}
            rows={6}
            className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#04c2fb]/30 focus:border-[#04c2fb]/50 transition-colors"
            placeholder="Digite o template da mensagem..."
          />

          {/* Preview */}
          <details className="mt-3 group">
            <summary className="text-xs font-medium text-slate-500 cursor-pointer hover:text-slate-700 select-none list-none flex items-center gap-1">
              <span className="transition-transform group-open:rotate-90">▶</span>
              Preview da mensagem
            </summary>
            <div className="mt-2 rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs text-slate-700 whitespace-pre-wrap font-mono">
              {previewMensagem}
            </div>
          </details>

          {/* Salvar */}
          <div className="flex justify-end mt-4">
            <button
              type="button"
              onClick={() =>
                salvarTemplate.mutate(waTemplate, {
                  onSuccess: () => toast.success('Template salvo'),
                  onError: () => toast.error('Erro ao salvar template'),
                })
              }
              disabled={salvarTemplate.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:brightness-110 active:scale-95 transition-all disabled:opacity-60"
              style={{ background: GRADIENT }}
            >
              {salvarTemplate.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Salvar template
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Orquestrador principal ───────────────────────────────────────────────────

function ConfiguracoesPageInner() {
  const searchParams = useSearchParams()

  const [abaAtiva, setAbaAtiva] = useState<AbaConfig>(() => {
    const aba = searchParams.get('aba')
    if (aba === 'financeiro' || aba === 'atendimentos' || aba === 'dados' || aba === 'conexoes') return aba
    return 'geral'
  })

  const moduloQuery = searchParams.get('modulo')

  function handleTabChange(aba: AbaConfig) {
    setAbaAtiva(aba)
    const params = new URLSearchParams(window.location.search)
    params.set('aba', aba)
    if (aba !== 'dados') params.delete('modulo')
    window.history.replaceState(null, '', `?${params.toString()}`)
  }

  return (
    <div>
      {/* Cabeçalho */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Configurações</h1>
        <p className="text-muted-foreground mt-1">Gerencie as configurações da clínica</p>
      </div>

      {/* Mobile: select Clinitra */}
      <div className="block md:hidden mb-4">
        <Select value={abaAtiva} onValueChange={v => handleTabChange(v as AbaConfig)}>
          <SelectTrigger
            className="w-full h-11 rounded-xl border-2 border-[#04c2fb]/30 bg-white pl-3 pr-3 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:border-[#04c2fb]/60 focus:ring-2 focus:ring-[#04c2fb]/20 data-[state=open]:border-[#04c2fb] data-[state=open]:ring-2 data-[state=open]:ring-[#04c2fb]/20"
            style={{ borderLeftWidth: 4, borderLeftColor: '#04c2fb' }}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-xl border border-slate-200 shadow-lg p-1">
            {configNav.map(item => (
              <SelectItem
                key={item.id}
                value={item.id}
                className="rounded-lg py-2.5 pl-3 pr-8 text-sm font-medium text-slate-600 cursor-pointer focus:bg-[#04c2fb]/10 focus:text-[#04c2fb] data-[state=checked]:text-[#04c2fb] data-[state=checked]:font-semibold data-[state=checked]:bg-[#04c2fb]/8"
              >
                <span className="flex items-center gap-2.5">
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.title}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Desktop: trapézios */}
      <nav className="hidden md:flex items-end border-b-2 border-slate-200">
        {configNav.map((item, i) => {
          const active = item.id === abaAtiva
          return (
            <div
              key={item.id}
              className={cn(
                'shrink-0 rounded-t-md -skew-x-6 transition-all duration-150 cursor-pointer',
                i > 0 && '-ml-2',
                active
                  ? 'relative z-10 -mb-0.5 shadow-sm'
                  : 'z-0 bg-slate-100/80 hover:bg-slate-100',
              )}
              style={active ? { background: GRADIENT } : undefined}
              onClick={() => handleTabChange(item.id)}
            >
              <div
                className={cn(
                  'flex items-center gap-2 px-5 py-2.5 text-sm font-medium whitespace-nowrap skew-x-6',
                  active ? 'text-white' : 'text-slate-500 hover:text-slate-700',
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.title}
              </div>
            </div>
          )
        })}
      </nav>

      {/* Conteúdo da aba ativa */}
      <div key={abaAtiva} className="page-fade-in pt-6">
        {abaAtiva === 'geral'          && <AbaGeral />}
        {abaAtiva === 'financeiro'    && <AbaFinanceiro />}
        {abaAtiva === 'atendimentos'  && <AbaAtendimentos />}
        {abaAtiva === 'dados'         && <AbaDados moduloQuery={moduloQuery} />}
        {abaAtiva === 'conexoes'      && <AbaConexoes />}
      </div>
    </div>
  )
}

export default function ConfiguracoesPage() {
  return (
    <Suspense fallback={<div className="pt-6 text-sm text-muted-foreground">Carregando...</div>}>
      <ConfiguracoesPageInner />
    </Suspense>
  )
}
