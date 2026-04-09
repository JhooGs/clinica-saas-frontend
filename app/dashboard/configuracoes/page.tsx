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

// ─── Tipos ────────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'clinitra:configuracoes_geral'

type ConfigGeral = {
  logoBase64: string
  nomeClinica: string
  especialidade: string
  nomeResponsavel: string
  telefone: string
  email: string
  cep: string
  logradouro: string
  numero: string
  complemento: string
  bairro: string
  cidade: string
  estado: string
}

const VAZIO: ConfigGeral = {
  logoBase64: '',
  nomeClinica: '',
  especialidade: '',
  nomeResponsavel: '',
  telefone: '',
  email: '',
  cep: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  estado: '',
}

function carregarConfig(): ConfigGeral {
  if (typeof window === 'undefined') return VAZIO
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? { ...VAZIO, ...JSON.parse(raw) } : VAZIO
  } catch {
    return VAZIO
  }
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
  const [form, setForm] = useState<ConfigGeral>(VAZIO)
  const [salvo, setSalvo] = useState<ConfigGeral>(VAZIO)
  const [buscandoCEP, setBuscandoCEP] = useState(false)

  useEffect(() => {
    const config = carregarConfig()
    setForm(config)
    setSalvo(config)
  }, [])
  const [hoverLogo, setHoverLogo] = useState(false)
  const inputFileRef = useRef<HTMLInputElement>(null)

  const dirty = JSON.stringify(form) !== JSON.stringify(salvo)

  function f<K extends keyof ConfigGeral>(key: K, value: ConfigGeral[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  // ── Logo ──────────────────────────────────────────────────────────────────

  function handleLogoClick() {
    inputFileRef.current?.click()
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Imagem muito grande', { description: 'O tamanho máximo é 2 MB.' })
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      f('logoBase64', reader.result as string)
      toast.info('Imagem carregada', { description: 'Salve para confirmar a alteração.' })
    }
    reader.readAsDataURL(file)
    // Reset input para permitir selecionar o mesmo arquivo novamente
    e.target.value = ''
  }

  // ── CEP ───────────────────────────────────────────────────────────────────

  async function handleCEP(raw: string) {
    const masked = maskCEP(raw)
    f('cep', masked)
    const digits = masked.replace(/\D/g, '')
    if (digits.length < 8) return
    setBuscandoCEP(true)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
      const data = await res.json()
      if (data.erro) {
        toast.error('CEP não encontrado', { description: 'Verifique o CEP e tente novamente.' })
      } else {
        setForm(prev => ({
          ...prev,
          logradouro: data.logradouro ?? prev.logradouro,
          bairro: data.bairro ?? prev.bairro,
          cidade: data.localidade ?? prev.cidade,
          estado: data.uf ?? prev.estado,
        }))
      }
    } catch {
      toast.error('Erro ao buscar CEP', { description: 'Verifique sua conexão.' })
    } finally {
      setBuscandoCEP(false)
    }
  }

  // ── Salvar ─────────────────────────────────────────────────────────────────

  function handleSave() {
    if (!form.nomeClinica.trim()) {
      toast.error('Nome obrigatório', { description: 'Preencha o nome da clínica antes de salvar.' })
      return
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(form))
    setSalvo({ ...form })
    toast.success('Configurações salvas', { description: 'Perfil da clínica atualizado.' })
  }

  // ── Iniciais para avatar ───────────────────────────────────────────────────

  const iniciais = form.nomeClinica
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('') || 'CL'

  const cepCompleto = form.cep.replace(/\D/g, '').length === 8
  const enderecoDesabilitado = !cepCompleto || buscandoCEP

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
          {/* Logo + nome em linha */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
            {/* Avatar / logo */}
            <div className="flex flex-col items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleLogoClick}
                onMouseEnter={() => setHoverLogo(true)}
                onMouseLeave={() => setHoverLogo(false)}
                className="relative h-24 w-24 rounded-full overflow-hidden ring-2 ring-white shadow-md focus-visible:outline-none focus-visible:ring-[#04c2fb] focus-visible:ring-offset-2 transition-transform active:scale-95"
              >
                {form.logoBase64 ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={form.logoBase64}
                    alt="Logo da clínica"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div
                    className="h-full w-full flex items-center justify-center text-white text-2xl font-bold tracking-tight select-none"
                    style={{ background: GRADIENT }}
                  >
                    {iniciais}
                  </div>
                )}

                {/* Overlay câmera */}
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

              <input
                ref={inputFileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoChange}
              />
            </div>

            {/* Nome + especialidade */}
            <div className="flex-1 w-full space-y-3">
              <Campo label="Nome da clínica">
                <Input
                  placeholder="Ex: Clínica Bem Estar"
                  value={form.nomeClinica}
                  onChange={e => f('nomeClinica', e.target.value)}
                  className="h-9 text-sm"
                />
              </Campo>

              <Campo label="Especialidade">
                <Input
                  placeholder="Ex: Psicologia Clínica, Fisioterapia..."
                  value={form.especialidade}
                  onChange={e => f('especialidade', e.target.value)}
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
              value={form.nomeResponsavel}
              onChange={e => f('nomeResponsavel', e.target.value)}
              className="h-9 text-sm"
            />
          </Campo>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Campo label="Telefone">
              <Input
                placeholder="(00) 00000-0000"
                value={form.telefone}
                onChange={e => f('telefone', maskTelefone(e.target.value))}
                inputMode="numeric"
                className="h-9 text-sm"
              />
            </Campo>

            <Campo label="E-mail">
              <Input
                type="email"
                placeholder="contato@clinica.com.br"
                value={form.email}
                onChange={e => f('email', e.target.value)}
                className="h-9 text-sm"
              />
            </Campo>
          </div>
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
          {/* CEP */}
          <Campo label="CEP" className="max-w-[180px]">
            <div className="relative">
              <Input
                placeholder="00000-000"
                value={form.cep}
                onChange={e => handleCEP(e.target.value)}
                inputMode="numeric"
                className={cn('h-9 text-sm', buscandoCEP && 'pr-9')}
                maxLength={9}
              />
              {buscandoCEP && (
                <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#04c2fb] animate-spin" />
              )}
            </div>
          </Campo>

          {/* Logradouro */}
          <Campo label="Logradouro">
            <Input
              placeholder="Rua, Avenida, Alameda..."
              value={form.logradouro}
              onChange={e => f('logradouro', e.target.value)}
              disabled={enderecoDesabilitado}
              className={cn('h-9 text-sm', enderecoDesabilitado && 'opacity-50')}
            />
          </Campo>

          {/* Número + Complemento */}
          <div className="grid grid-cols-2 gap-3">
            <Campo label="Número">
              <Input
                placeholder="Ex: 142"
                value={form.numero}
                onChange={e => f('numero', e.target.value)}
                disabled={enderecoDesabilitado}
                className={cn('h-9 text-sm', enderecoDesabilitado && 'opacity-50')}
              />
            </Campo>
            <Campo label="Complemento">
              <Input
                placeholder="Sala 3, Bloco B..."
                value={form.complemento}
                onChange={e => f('complemento', e.target.value)}
                disabled={enderecoDesabilitado}
                className={cn('h-9 text-sm', enderecoDesabilitado && 'opacity-50')}
              />
            </Campo>
          </div>

          {/* Bairro */}
          <Campo label="Bairro">
            <Input
              placeholder="Bairro"
              value={form.bairro}
              onChange={e => f('bairro', e.target.value)}
              disabled={enderecoDesabilitado}
              className={cn('h-9 text-sm', enderecoDesabilitado && 'opacity-50')}
            />
          </Campo>

          {/* Cidade + Estado */}
          <div className="grid grid-cols-3 gap-3">
            <Campo label="Cidade" className="col-span-2">
              <Input
                placeholder="Cidade"
                value={form.cidade}
                onChange={e => f('cidade', e.target.value)}
                disabled={enderecoDesabilitado}
                className={cn('h-9 text-sm', enderecoDesabilitado && 'opacity-50')}
              />
            </Campo>
            <Campo label="Estado">
              <Input
                placeholder="UF"
                value={form.estado}
                onChange={e => f('estado', e.target.value.toUpperCase().slice(0, 2))}
                disabled={enderecoDesabilitado}
                className={cn('h-9 text-sm', enderecoDesabilitado && 'opacity-50')}
                maxLength={2}
              />
            </Campo>
          </div>

          {/* Hint CEP */}
          {!cepCompleto && (
            <p className="text-[11px] text-muted-foreground">
              Digite o CEP para preencher os campos de endereço automaticamente.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Rodapé ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-1">
        {!dirty && salvo.nomeClinica ? (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            Configurações salvas
          </span>
        ) : (
          <span />
        )}

        <Button
          size="sm"
          disabled={!dirty}
          onClick={handleSave}
          className={cn(
            'gap-1.5 text-white transition-all active:scale-95',
            dirty ? 'hover:brightness-110' : 'opacity-50 cursor-not-allowed',
          )}
          style={dirty ? { background: GRADIENT } : {}}
        >
          <Save className="h-3.5 w-3.5" />
          Salvar alterações
        </Button>
      </div>
    </div>
  )
}
