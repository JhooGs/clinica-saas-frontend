'use client'

import { useMemo, useState } from 'react'
import {
  Edit3, Settings2, AlertCircle, Infinity, Users, UserCog, Cpu,
  Stethoscope, Star, Zap, Building2, Plus, Loader2, X, Info,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import {
  useAdminPlanos, useAdminAtualizarPlano, useAdminCriarPlano, type PlanoConfig,
} from '@/hooks/use-admin-planos'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'

// ── Config visual por plano ───────────────────────────────────────────────────

interface PlanoVisual {
  headerGradient: string
  iconBg: string
  icon: React.ComponentType<{ className?: string }>
  tagline: string
  accentColor: string
  accentHex: string
  highlight?: string
}

const PLANO_VISUAL: Record<string, PlanoVisual> = {
  free: {
    headerGradient: 'from-slate-600 to-slate-700',
    iconBg: 'bg-slate-500/20',
    icon: Stethoscope,
    tagline: 'Para começar sem custo',
    accentColor: 'text-slate-300',
    accentHex: '#94a3b8',
  },
  solo: {
    headerGradient: 'from-[#0094c8] to-[#04c2fb]',
    iconBg: 'bg-white/20',
    icon: Star,
    tagline: 'Para profissionais autônomos',
    accentColor: 'text-cyan-200',
    accentHex: '#04c2fb',
    highlight: 'Trial 14 dias',
  },
  clinica: {
    headerGradient: 'from-[#3b0764] to-[#581c87]',
    iconBg: 'bg-white/15',
    icon: Building2,
    tagline: 'Para clínicas em crescimento',
    accentColor: 'text-purple-300',
    accentHex: '#a78bfa',
    highlight: 'Mais popular',
  },
  clinica_pro: {
    headerGradient: 'from-amber-500 to-orange-500',
    iconBg: 'bg-white/20',
    icon: Zap,
    tagline: 'Para clínicas de alto volume',
    accentColor: 'text-amber-200',
    accentHex: '#f59e0b',
  },
  _default: {
    headerGradient: 'from-gray-500 to-gray-600',
    iconBg: 'bg-white/15',
    icon: Settings2,
    tagline: 'Plano personalizado',
    accentColor: 'text-gray-300',
    accentHex: '#9ca3af',
  },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function calcularPrecoAnual(precoMensal: string): string | null {
  const mensal = parseFloat(precoMensal)
  if (isNaN(mensal) || mensal <= 0) return null
  return (mensal * 12 * 0.8).toFixed(2)
}

function parseLimit(val: string): number | null | -1 {
  if (val === '') return null
  const n = parseInt(val, 10)
  return isNaN(n) || n < 0 ? -1 : n
}

// ── Linha de feature (card) ───────────────────────────────────────────────────

function FeatureRow({
  icon: Icon, label, value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number | null
}) {
  const unlimited = value === null
  return (
    <div className="flex items-center justify-between py-2.5 border-b last:border-b-0 border-gray-100">
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="text-sm text-gray-600">{label}</span>
      </div>
      {unlimited ? (
        <div className="flex items-center gap-1 text-emerald-600">
          <Infinity className="h-3.5 w-3.5" />
          <span className="text-xs font-semibold">Ilimitado</span>
        </div>
      ) : (
        <span className="text-sm font-bold text-gray-800">{value}</span>
      )}
    </div>
  )
}

// ── Input de limite com hint ──────────────────────────────────────────────────

function LimitInputEnhanced({ id, label, hint, value, onChange }: {
  id: string
  label: string
  hint: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <Label htmlFor={id} className="text-xs font-medium">{label}</Label>
      <Input
        id={id}
        type="number"
        min="0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Ilimitado"
        className="mt-1"
      />
      <p className="text-[11px] text-muted-foreground mt-1 leading-tight">{hint}</p>
    </div>
  )
}

// ── Divisor de seção ──────────────────────────────────────────────────────────

function SectionDivider() {
  return <div className="h-px bg-border" />
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
      {children}
    </p>
  )
}

// ── Modal de edição ───────────────────────────────────────────────────────────

interface EditFormState {
  nome_display: string
  preco: string
  max_pacientes: string
  max_usuarios: string
  max_tipos_atendimento: string
  max_ia_mes: string
  ativo: boolean
}

function ModalEditarPlano({ plano, onClose }: { plano: PlanoConfig; onClose: () => void }) {
  const atualizar = useAdminAtualizarPlano()
  const visual = PLANO_VISUAL[plano.slug] ?? PLANO_VISUAL._default
  const PlanIcon = visual.icon

  const [form, setForm] = useState<EditFormState>({
    nome_display:          plano.nome_display,
    preco:                 String(plano.preco),
    max_pacientes:         plano.max_pacientes?.toString() ?? '',
    max_usuarios:          plano.max_usuarios?.toString() ?? '',
    max_tipos_atendimento: plano.max_tipos_atendimento?.toString() ?? '',
    max_ia_mes:            plano.max_ia_mes?.toString() ?? '',
    ativo:                 plano.ativo,
  })

  const precoAnual = useMemo(() => calcularPrecoAnual(form.preco), [form.preco])

  async function handleSalvar() {
    const preco = parseFloat(form.preco)
    if (isNaN(preco) || preco < 0) { toast.error('Preço inválido'); return }

    const max_pacientes         = parseLimit(form.max_pacientes)
    const max_usuarios          = parseLimit(form.max_usuarios)
    const max_tipos_atendimento = parseLimit(form.max_tipos_atendimento)
    const max_ia_mes            = parseLimit(form.max_ia_mes)

    if (max_pacientes === -1)         { toast.error('Limite de pacientes inválido'); return }
    if (max_usuarios === -1)          { toast.error('Limite de usuários inválido'); return }
    if (max_tipos_atendimento === -1) { toast.error('Limite de tipos de atendimento inválido'); return }
    if (max_ia_mes === -1)            { toast.error('Limite de uso de IA inválido'); return }

    try {
      await atualizar.mutateAsync({
        slug: plano.slug,
        body: {
          nome_display: form.nome_display,
          preco,
          max_pacientes,
          max_usuarios,
          max_tipos_atendimento,
          max_ia_mes,
          ativo: form.ativo,
        },
      })
      toast.success('Plano atualizado', { description: `${form.nome_display} salvo com sucesso.` })
      onClose()
    } catch (e) {
      toast.error('Erro ao salvar plano', { description: String(e) })
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-full max-w-lg p-0 overflow-hidden gap-0" showCloseButton={false}>
        {/* Cabeçalho colorido */}
        <div className={cn('relative bg-gradient-to-br p-6 pb-10', visual.headerGradient)}>
          <div className="flex items-start justify-between mb-4">
            <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', visual.iconBg)}>
              <PlanIcon className="h-5 w-5 text-white" />
            </div>
            <button
              onClick={onClose}
              className="text-white/60 hover:text-white transition-colors rounded-lg p-1"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <DialogTitle className="text-xl font-bold text-white">{plano.nome_display}</DialogTitle>
          <DialogDescription className="text-xs mt-0.5" style={{ color: visual.accentHex }}>
            {visual.tagline}
          </DialogDescription>
          <p className="text-[11px] text-white/40 mt-1 font-mono">{plano.slug}</p>
          <div className="absolute bottom-0 left-0 right-0 h-5 bg-background rounded-t-[20px]" />
        </div>

        {/* Corpo com seções */}
        <div className="px-6 py-5 space-y-5 overflow-y-auto max-h-[60vh]">
          {/* Identificação */}
          <section>
            <SectionTitle>Identificação</SectionTitle>
            <div className="space-y-3">
              <div>
                <Label htmlFor="edit-nome" className="text-xs font-medium">Nome de exibição</Label>
                <Input
                  id="edit-nome"
                  value={form.nome_display}
                  onChange={(e) => setForm({ ...form, nome_display: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-medium">Slug</Label>
                <Input value={plano.slug} disabled className="mt-1 font-mono text-xs bg-muted/40" />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Identificador imutável — chave primária do plano no banco.
                </p>
              </div>
            </div>
          </section>

          <SectionDivider />

          {/* Preços */}
          <section>
            <SectionTitle>Preços</SectionTitle>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="edit-preco" className="text-xs font-medium">Mensal (R$)</Label>
                <Input
                  id="edit-preco"
                  type="number"
                  step="1"
                  min="0"
                  value={form.preco}
                  onChange={(e) => setForm({ ...form, preco: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <Label className="text-xs font-medium">Anual (R$)</Label>
                  <span className="text-[10px] bg-emerald-100 text-emerald-700 font-semibold px-1.5 py-0.5 rounded-full">
                    −20%
                  </span>
                </div>
                <Input
                  value={precoAnual ? `R$ ${precoAnual}` : '—'}
                  disabled
                  className="mt-1 bg-muted/40 text-muted-foreground"
                />
                <p className="text-[11px] text-muted-foreground mt-1">Mensal × 12 × 0,8</p>
              </div>
            </div>
          </section>

          <SectionDivider />

          {/* Limites */}
          <section>
            <SectionTitle>Limites de uso</SectionTitle>
            <div className="grid grid-cols-2 gap-3">
              <LimitInputEnhanced
                id="edit-pac"   label="Pacientes"
                hint="Pacientes ativos na clínica"
                value={form.max_pacientes}
                onChange={(v) => setForm({ ...form, max_pacientes: v })}
              />
              <LimitInputEnhanced
                id="edit-usr"   label="Profissionais"
                hint="Usuários com acesso à conta"
                value={form.max_usuarios}
                onChange={(v) => setForm({ ...form, max_usuarios: v })}
              />
              <LimitInputEnhanced
                id="edit-tipos" label="Tipos atendimento"
                hint="Modalidades configuráveis na agenda"
                value={form.max_tipos_atendimento}
                onChange={(v) => setForm({ ...form, max_tipos_atendimento: v })}
              />
              <LimitInputEnhanced
                id="edit-ia"    label="IA / mês"
                hint="Gerações de resumo clínico por IA"
                value={form.max_ia_mes}
                onChange={(v) => setForm({ ...form, max_ia_mes: v })}
              />
            </div>
          </section>

          <SectionDivider />

          {/* Status */}
          <section>
            <SectionTitle>Status</SectionTitle>
            <div className="flex items-center justify-between rounded-xl border px-4 py-3 bg-muted/30">
              <div>
                <p className="text-sm font-medium">Plano ativo</p>
                <p className="text-xs text-muted-foreground">
                  {form.ativo
                    ? 'Visível para novas assinaturas e aplicado a clínicas existentes.'
                    : 'Oculto para novos cadastros. Clínicas existentes não são afetadas.'}
                </p>
              </div>
              <Switch
                checked={form.ativo}
                onCheckedChange={(v) => setForm({ ...form, ativo: v })}
              />
            </div>
          </section>
        </div>

        {/* Rodapé */}
        <div className="flex gap-2 border-t px-6 py-4">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button className="flex-1" onClick={handleSalvar} disabled={atualizar.isPending}>
            {atualizar.isPending
              ? <><Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />Salvando...</>
              : 'Salvar alterações'
            }
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Modal de criação ──────────────────────────────────────────────────────────

interface CreateFormState {
  slug: string
  nome_display: string
  preco: string
  max_pacientes: string
  max_usuarios: string
  max_tipos_atendimento: string
  max_ia_mes: string
  ativo: boolean
  ordem: string
}

function ModalCriarPlano({ onClose }: { onClose: () => void }) {
  const criar = useAdminCriarPlano()
  const [slugEditado, setSlugEditado] = useState(false)

  const [form, setForm] = useState<CreateFormState>({
    slug: '',
    nome_display: '',
    preco: '0',
    max_pacientes: '',
    max_usuarios: '',
    max_tipos_atendimento: '',
    max_ia_mes: '',
    ativo: true,
    ordem: '99',
  })

  const precoAnual = useMemo(() => calcularPrecoAnual(form.preco), [form.preco])

  function handleNomeChange(nome: string) {
    setForm(prev => ({
      ...prev,
      nome_display: nome,
      slug: slugEditado
        ? prev.slug
        : nome.toLowerCase()
            .normalize('NFD').replace(/[̀-ͯ]/g, '')
            .replace(/\s+/g, '_')
            .replace(/[^a-z0-9_]/g, '')
            .slice(0, 50),
    }))
  }

  async function handleCriar() {
    if (!form.slug || form.slug.length < 3) {
      toast.error('Slug inválido', { description: 'Mínimo 3 caracteres, apenas letras minúsculas, números e underscore.' })
      return
    }
    if (!form.nome_display.trim()) {
      toast.error('Nome obrigatório')
      return
    }
    const preco = parseFloat(form.preco)
    if (isNaN(preco) || preco < 0) { toast.error('Preço inválido'); return }

    const max_pacientes         = parseLimit(form.max_pacientes)
    const max_usuarios          = parseLimit(form.max_usuarios)
    const max_tipos_atendimento = parseLimit(form.max_tipos_atendimento)
    const max_ia_mes            = parseLimit(form.max_ia_mes)

    if (max_pacientes === -1)         { toast.error('Limite de pacientes inválido'); return }
    if (max_usuarios === -1)          { toast.error('Limite de usuários inválido'); return }
    if (max_tipos_atendimento === -1) { toast.error('Limite de tipos de atendimento inválido'); return }
    if (max_ia_mes === -1)            { toast.error('Limite de uso de IA inválido'); return }

    try {
      await criar.mutateAsync({
        slug: form.slug,
        nome_display: form.nome_display.trim(),
        preco,
        max_pacientes,
        max_usuarios,
        max_tipos_atendimento,
        max_ia_mes,
        ativo: form.ativo,
        ordem: parseInt(form.ordem, 10) || 99,
      })
      toast.success('Plano criado', { description: `${form.nome_display} foi adicionado com sucesso.` })
      onClose()
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        toast.error('Slug já existe', { description: 'Escolha um identificador diferente.' })
      } else {
        toast.error('Erro ao criar plano', { description: String(e) })
      }
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo plano</DialogTitle>
          <DialogDescription className="text-xs">
            Crie planos customizados para contratos Enterprise ou configurações especiais.
          </DialogDescription>
        </DialogHeader>

        {/* Aviso informativo */}
        <div className="flex items-start gap-2.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5">
          <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700">
            Planos customizados não aparecem automaticamente na página pública de preços.
            Para exibir publicamente, edite o componente de pricing do site após a criação.
          </p>
        </div>

        <div className="space-y-5">
          {/* Identificação */}
          <section>
            <SectionTitle>Identificação</SectionTitle>
            <div className="space-y-3">
              <div>
                <Label htmlFor="new-nome" className="text-xs font-medium">Nome de exibição</Label>
                <Input
                  id="new-nome"
                  value={form.nome_display}
                  onChange={(e) => handleNomeChange(e.target.value)}
                  placeholder="Ex: Enterprise, Starter, Parceiro..."
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="new-slug" className="text-xs font-medium">
                  Slug
                  <span className="ml-1 text-muted-foreground font-normal">(identificador único)</span>
                </Label>
                <Input
                  id="new-slug"
                  value={form.slug}
                  onChange={(e) => {
                    setSlugEditado(true)
                    setForm({
                      ...form,
                      slug: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 50),
                    })
                  }}
                  placeholder="enterprise"
                  className="mt-1 font-mono text-sm"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Apenas letras minúsculas, números e underscore. Imutável após criação.
                </p>
              </div>
            </div>
          </section>

          <SectionDivider />

          {/* Preços */}
          <section>
            <SectionTitle>Preços</SectionTitle>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="new-preco" className="text-xs font-medium">Mensal (R$)</Label>
                <Input
                  id="new-preco"
                  type="number"
                  step="1"
                  min="0"
                  value={form.preco}
                  onChange={(e) => setForm({ ...form, preco: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <Label className="text-xs font-medium">Anual (R$)</Label>
                  <span className="text-[10px] bg-emerald-100 text-emerald-700 font-semibold px-1.5 py-0.5 rounded-full">
                    −20%
                  </span>
                </div>
                <Input
                  value={precoAnual ? `R$ ${precoAnual}` : '—'}
                  disabled
                  className="mt-1 bg-muted/40 text-muted-foreground"
                />
                <p className="text-[11px] text-muted-foreground mt-1">Mensal × 12 × 0,8</p>
              </div>
            </div>
          </section>

          <SectionDivider />

          {/* Limites */}
          <section>
            <SectionTitle>Limites de uso</SectionTitle>
            <div className="grid grid-cols-2 gap-3">
              <LimitInputEnhanced
                id="new-pac"   label="Pacientes"
                hint="Pacientes ativos na clínica"
                value={form.max_pacientes}
                onChange={(v) => setForm({ ...form, max_pacientes: v })}
              />
              <LimitInputEnhanced
                id="new-usr"   label="Profissionais"
                hint="Usuários com acesso à conta"
                value={form.max_usuarios}
                onChange={(v) => setForm({ ...form, max_usuarios: v })}
              />
              <LimitInputEnhanced
                id="new-tipos" label="Tipos atendimento"
                hint="Modalidades configuráveis na agenda"
                value={form.max_tipos_atendimento}
                onChange={(v) => setForm({ ...form, max_tipos_atendimento: v })}
              />
              <LimitInputEnhanced
                id="new-ia"    label="IA / mês"
                hint="Gerações de resumo clínico por IA"
                value={form.max_ia_mes}
                onChange={(v) => setForm({ ...form, max_ia_mes: v })}
              />
            </div>
          </section>

          <SectionDivider />

          {/* Configurações */}
          <section>
            <SectionTitle>Configurações</SectionTitle>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-xl border px-4 py-3 bg-muted/30">
                <div>
                  <p className="text-sm font-medium">Plano ativo</p>
                  <p className="text-xs text-muted-foreground">Visível para novas assinaturas</p>
                </div>
                <Switch
                  checked={form.ativo}
                  onCheckedChange={(v) => setForm({ ...form, ativo: v })}
                />
              </div>
              <div>
                <Label htmlFor="new-ordem" className="text-xs font-medium">Ordem de exibição</Label>
                <Input
                  id="new-ordem"
                  type="number"
                  min="0"
                  value={form.ordem}
                  onChange={(e) => setForm({ ...form, ordem: e.target.value })}
                  className="mt-1 w-24"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Número menor aparece primeiro nos cards.
                </p>
              </div>
            </div>
          </section>
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleCriar} disabled={criar.isPending}>
            {criar.isPending
              ? <><Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />Criando...</>
              : 'Criar plano'
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Card de plano ─────────────────────────────────────────────────────────────

function PlanoCard({ plano, onEditar }: { plano: PlanoConfig; onEditar: () => void }) {
  const visual = PLANO_VISUAL[plano.slug] ?? PLANO_VISUAL._default
  const PlanIcon = visual.icon

  return (
    <Card className={cn(
      'overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow flex flex-col',
      !plano.ativo && 'opacity-55',
    )}>
      {/* Cabeçalho colorido */}
      <div className={cn('relative bg-gradient-to-br p-5 pb-6', visual.headerGradient)}>
        <div className="flex items-start justify-between mb-4">
          <div className={cn('flex h-9 w-9 items-center justify-center rounded-xl', visual.iconBg)}>
            <PlanIcon className="h-4.5 w-4.5 text-white" />
          </div>
          <div className="flex flex-col items-end gap-1">
            {visual.highlight && (
              <span className="text-[10px] font-bold uppercase tracking-wide bg-white/20 text-white px-2 py-0.5 rounded-full">
                {visual.highlight}
              </span>
            )}
            <span className={cn(
              'text-[10px] font-semibold px-2 py-0.5 rounded-full',
              plano.ativo ? 'bg-white/20 text-white' : 'bg-black/20 text-white/60',
            )}>
              {plano.ativo ? 'Ativo' : 'Inativo'}
            </span>
          </div>
        </div>

        <div className="mb-4">
          <p className="text-xl font-bold text-white leading-tight">{plano.nome_display}</p>
          <p className={cn('text-xs mt-0.5', visual.accentColor)}>{visual.tagline}</p>
        </div>

        {plano.preco === 0 ? (
          <p className="text-3xl font-extrabold text-white">Grátis</p>
        ) : (
          <div className="flex items-baseline gap-1">
            <span className="text-sm font-medium text-white/70">R$</span>
            <p className="text-3xl font-extrabold text-white">{plano.preco.toFixed(0)}</p>
            <span className="text-sm text-white/70">/mês</span>
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 h-3 bg-white rounded-t-[20px]" />
      </div>

      {/* Features */}
      <CardContent className="px-5 pt-2 pb-4 flex flex-col flex-1">
        <div className="flex-1">
          <FeatureRow icon={Users}       label="Pacientes"          value={plano.max_pacientes} />
          <FeatureRow icon={UserCog}     label="Profissionais"      value={plano.max_usuarios} />
          <FeatureRow icon={Stethoscope} label="Tipos atendimento"  value={plano.max_tipos_atendimento} />
          <FeatureRow icon={Cpu}         label="Gerações de IA/mês" value={plano.max_ia_mes} />
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-4 border border-dashed border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-500 hover:text-gray-700"
          onClick={onEditar}
        >
          <Edit3 className="h-3.5 w-3.5 mr-1.5" />
          Editar plano
        </Button>
      </CardContent>
    </Card>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function PlanoCardSkeleton() {
  return (
    <Card className="overflow-hidden border-0 shadow-sm animate-pulse">
      <div className="h-44 bg-gradient-to-br from-gray-200 to-gray-300" />
      <CardContent className="p-5 space-y-3">
        {[80, 60, 70, 55].map((w, i) => (
          <div key={i} className="flex justify-between items-center py-1">
            <div className="h-3 bg-gray-200 rounded" style={{ width: `${w}%` }} />
            <div className="h-3 w-12 bg-gray-200 rounded" />
          </div>
        ))}
        <div className="h-8 bg-gray-100 rounded-lg mt-4" />
      </CardContent>
    </Card>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function PlanosPage() {
  const { data: planos, isLoading } = useAdminPlanos()
  const [editando, setEditando] = useState<PlanoConfig | null>(null)
  const [criando, setCriando] = useState(false)

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={{ background: 'linear-gradient(135deg, #0094c8 0%, #04c2fb 60%, #00d5f5 100%)' }}
          >
            <Settings2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold leading-tight">Planos</h1>
            <p className="text-sm text-muted-foreground">Configuração de preços e limites por plano</p>
          </div>
        </div>
        <Button
          size="sm"
          onClick={() => setCriando(true)}
          className="gap-1.5 shrink-0 text-white"
          style={{ background: 'linear-gradient(135deg, #0094c8 0%, #04c2fb 100%)' }}
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Novo plano</span>
          <span className="sm:hidden">Novo</span>
        </Button>
      </div>

      {/* Aviso */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-xs sm:text-sm text-amber-800">
          Alterações em preços e limites se aplicam imediatamente a todas as clínicas.
        </p>
      </div>

      {/* Grid de planos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {isLoading
          ? [...Array(4)].map((_, i) => <PlanoCardSkeleton key={i} />)
          : planos?.map(p => (
              <PlanoCard key={p.slug} plano={p} onEditar={() => setEditando(p)} />
            ))
        }
      </div>

      {editando && <ModalEditarPlano plano={editando} onClose={() => setEditando(null)} />}
      {criando && <ModalCriarPlano onClose={() => setCriando(false)} />}
    </div>
  )
}
