'use client'

import { useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Building2,
  Camera,
  CheckCircle2,
  Loader2,
  MapPin,
  Save,
  User,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useConfiguracoes, useSalvarConfiguracoes } from '@/hooks/use-configuracoes'

// ─── Logo (localStorage — upload para Supabase Storage é task futura) ─────────

const LOGO_KEY = 'clinitra:logo_base64'

function carregarLogo(): string {
  if (typeof window === 'undefined') return ''
  try { return localStorage.getItem(LOGO_KEY) ?? '' } catch { return '' }
}

// ─── Máscaras ─────────────────────────────────────────────────────────────────

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

// ─── Gradiente ────────────────────────────────────────────────────────────────

const GRADIENT = 'linear-gradient(135deg, #0094c8 0%, #04c2fb 60%, #00d5f5 100%)'

// ─── Componente de campo ──────────────────────────────────────────────────────

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

// ─── Página principal ────────────────────────────────────────────────────────

export default function ConfiguracoesGeralPage() {
  const { data: config, isLoading } = useConfiguracoes()
  const { mutateAsync: salvar, isPending: salvando } = useSalvarConfiguracoes()

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
  const [logoBase64, setLogoBase64] = useState('')
  const [buscandoCEP, setBuscandoCEP] = useState(false)
  const [hoverLogo, setHoverLogo] = useState(false)
  const [salvoComSucesso, setSalvoComSucesso] = useState(false)

  const inputFileRef = useRef<HTMLInputElement>(null)

  // Preenche o formulário quando os dados chegam da API
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

  useEffect(() => {
    setLogoBase64(carregarLogo())
  }, [])

  // ── Logo ──────────────────────────────────────────────────────────────────

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Imagem muito grande', { description: 'O tamanho máximo é 2 MB.' })
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const b64 = reader.result as string
      setLogoBase64(b64)
      localStorage.setItem(LOGO_KEY, b64)
      toast.info('Imagem carregada', { description: 'Logo atualizado.' })
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  // ── CEP ───────────────────────────────────────────────────────────────────

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

  // ── Salvar ─────────────────────────────────────────────────────────────────

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

  // ── Iniciais para avatar ───────────────────────────────────────────────────

  const iniciais = nomeClinica
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('') || 'CL'

  const cepCompleto = cep.replace(/\D/g, '').length === 8
  const enderecoDesabilitado = !cepCompleto || buscandoCEP

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-[#04c2fb]" />
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-6">
      {/* ── Card 1: Identidade ─────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3 p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#04c2fb]/10 shrink-0">
              <Building2 className="h-4 w-4 text-[#04c2fb]" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">Identidade da clínica</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Logo, nome e área de atuação
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5 px-4 sm:px-6 pb-4 sm:pb-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
            {/* Avatar / logo */}
            <div className="flex flex-col items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => inputFileRef.current?.click()}
                onMouseEnter={() => setHoverLogo(true)}
                onMouseLeave={() => setHoverLogo(false)}
                className="relative h-24 w-24 rounded-full overflow-hidden ring-2 ring-white shadow-md focus-visible:outline-none focus-visible:ring-[#04c2fb] focus-visible:ring-offset-2 transition-transform active:scale-95"
              >
                {logoBase64 ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoBase64} alt="Logo da clínica" className="h-full w-full object-cover" />
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
                    hoverLogo ? 'opacity-100' : 'opacity-0',
                  )}
                >
                  <Camera className="h-6 w-6 text-white drop-shadow" />
                </div>
              </button>
              <span className="text-[11px] text-muted-foreground">Clique para alterar</span>
              <input ref={inputFileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
            </div>

            {/* Nome + especialidade */}
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

      {/* ── Card 2: Responsável ────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3 p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#04c2fb]/10 shrink-0">
              <User className="h-4 w-4 text-[#04c2fb]" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">Responsável</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Dados de contato do responsável pela clínica
              </CardDescription>
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

      {/* ── Card 3: Endereço ───────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3 p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#04c2fb]/10 shrink-0">
              <MapPin className="h-4 w-4 text-[#04c2fb]" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">Endereço</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Localização física da clínica
              </CardDescription>
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

      {/* ── Rodapé ─────────────────────────────────────────────────── */}
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
          {salvando ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          Salvar alterações
        </Button>
      </div>
    </div>
  )
}
