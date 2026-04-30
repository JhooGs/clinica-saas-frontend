'use client'

import { useState } from 'react'
import { Edit3, Settings2, AlertCircle, Infinity, Check, Users, UserCog, Cpu } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { useAdminPlanos, useAdminAtualizarPlano, type PlanoConfig } from '@/hooks/use-admin-planos'
import { cn } from '@/lib/utils'

// ── Config visual por plano ───────────────────────────────────────────────────

const PLANO_VISUAL: Record<string, {
  gradient: string
  border: string
  badgeColor: string
  badgeBg: string
}> = {
  free: {
    gradient: 'from-gray-100 to-gray-50',
    border: 'border-gray-200',
    badgeColor: 'text-gray-600',
    badgeBg: 'bg-gray-100',
  },
  solo: {
    gradient: 'from-cyan-50 to-white',
    border: 'border-cyan-200',
    badgeColor: 'text-cyan-700',
    badgeBg: 'bg-cyan-100',
  },
  clinica: {
    gradient: 'from-purple-50 to-white',
    border: 'border-purple-200',
    badgeColor: 'text-purple-700',
    badgeBg: 'bg-purple-100',
  },
  clinica_pro: {
    gradient: 'from-violet-50 to-white',
    border: 'border-violet-200',
    badgeColor: 'text-violet-700',
    badgeBg: 'bg-violet-100',
  },
}

const PLANO_ACCENT: Record<string, string> = {
  free:        '#6b7280',
  solo:        '#04c2fb',
  clinica:     '#a855f7',
  clinica_pro: '#7c3aed',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function FeatureRow({ label, value }: { label: string; value: number | null }) {
  const unlimited = value === null
  return (
    <div className="flex items-center justify-between py-1.5 border-b last:border-b-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1.5">
        {unlimited
          ? <><Infinity className="h-3.5 w-3.5 text-emerald-500" /><span className="text-sm font-medium text-emerald-600">Ilimitado</span></>
          : <><Check className="h-3.5 w-3.5 text-gray-400" /><span className="text-sm font-semibold">{value}</span></>
        }
      </div>
    </div>
  )
}

// ── Input de limite ───────────────────────────────────────────────────────────

function LimitInput({
  id, label, value, onChange,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <Label htmlFor={id} className="text-xs">
        {label} <span className="text-muted-foreground font-normal">(vazio = ilimitado)</span>
      </Label>
      <Input
        id={id}
        type="number"
        min="0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Ilimitado"
        className="mt-1"
      />
    </div>
  )
}

// ── Modal de edição ───────────────────────────────────────────────────────────

interface FormState {
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
  const visual = PLANO_VISUAL[plano.slug]
  const accent = PLANO_ACCENT[plano.slug] ?? '#04c2fb'

  const [form, setForm] = useState<FormState>({
    nome_display:          plano.nome_display,
    preco:                 String(plano.preco),
    max_pacientes:         plano.max_pacientes?.toString() ?? '',
    max_usuarios:          plano.max_usuarios?.toString() ?? '',
    max_tipos_atendimento: plano.max_tipos_atendimento?.toString() ?? '',
    max_ia_mes:            plano.max_ia_mes?.toString() ?? '',
    ativo:                 plano.ativo,
  })

  function parseLimit(val: string): number | null | -1 {
    if (val === '') return null
    const n = parseInt(val, 10)
    return isNaN(n) || n < 0 ? -1 : n
  }

  async function handleSalvar() {
    const preco = parseFloat(form.preco)
    if (isNaN(preco) || preco < 0) {
      toast.error('Preço inválido')
      return
    }
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
        body: { nome_display: form.nome_display, preco, max_pacientes, max_usuarios, max_tipos_atendimento, max_ia_mes, ativo: form.ativo },
      })
      toast.success('Plano atualizado', { description: `${form.nome_display} salvo com sucesso.` })
      onClose()
    } catch (e) {
      toast.error('Erro ao salvar plano', { description: String(e) })
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-full max-w-md bg-white/90 backdrop-blur-xl border border-white/20 shadow-2xl" showCloseButton={false}>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: accent }}
            />
            <DialogTitle>Editar plano <span className={cn('font-mono text-sm', visual?.badgeColor)}>{plano.slug}</span></DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label htmlFor="nome" className="text-xs">Nome de exibição</Label>
            <Input
              id="nome"
              value={form.nome_display}
              onChange={(e) => setForm({ ...form, nome_display: e.target.value })}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="preco" className="text-xs">Preço mensal (R$)</Label>
            <Input
              id="preco"
              type="number"
              step="1"
              min="0"
              value={form.preco}
              onChange={(e) => setForm({ ...form, preco: e.target.value })}
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <LimitInput id="max_pac"   label="Pacientes"          value={form.max_pacientes}         onChange={(v) => setForm({ ...form, max_pacientes: v })} />
            <LimitInput id="max_usr"   label="Usuários"           value={form.max_usuarios}          onChange={(v) => setForm({ ...form, max_usuarios: v })} />
            <LimitInput id="max_tipos" label="Tipos atendimento"  value={form.max_tipos_atendimento} onChange={(v) => setForm({ ...form, max_tipos_atendimento: v })} />
            <LimitInput id="max_ia"    label="IA / mês"           value={form.max_ia_mes}            onChange={(v) => setForm({ ...form, max_ia_mes: v })} />
          </div>

          <div className="flex items-center justify-between rounded-xl border px-4 py-3 bg-muted/30">
            <div>
              <p className="text-sm font-medium">Plano ativo</p>
              <p className="text-xs text-muted-foreground">Visível para novos cadastros</p>
            </div>
            <Button
              type="button"
              variant={form.ativo ? 'default' : 'outline'}
              size="sm"
              onClick={() => setForm({ ...form, ativo: !form.ativo })}
            >
              {form.ativo ? 'Ativo' : 'Inativo'}
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSalvar} disabled={atualizar.isPending}>
            {atualizar.isPending ? 'Salvando...' : 'Salvar alterações'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Card de plano ─────────────────────────────────────────────────────────────

function PlanoCard({ plano, onEditar }: { plano: PlanoConfig; onEditar: () => void }) {
  const visual = PLANO_VISUAL[plano.slug] ?? PLANO_VISUAL.free
  const accent = PLANO_ACCENT[plano.slug] ?? '#04c2fb'

  return (
    <Card className={cn(
      'overflow-hidden border-2 transition-shadow hover:shadow-md',
      visual.border,
      !plano.ativo && 'opacity-60',
    )}>
      {/* Cabeçalho com cor do plano */}
      <div className={cn('bg-gradient-to-br p-5', visual.gradient)}>
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <div
              className="h-1.5 w-10 rounded-full mb-2"
              style={{ backgroundColor: accent }}
            />
            <p className="text-lg font-bold text-gray-900">{plano.nome_display}</p>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">{plano.slug}</p>
          </div>
          <span
            className={cn(
              'text-[11px] font-semibold px-2 py-0.5 rounded-full',
              plano.ativo ? visual.badgeBg + ' ' + visual.badgeColor : 'bg-gray-100 text-gray-400'
            )}
          >
            {plano.ativo ? 'Ativo' : 'Inativo'}
          </span>
        </div>

        {/* Preço */}
        <div className="flex items-baseline gap-1">
          {plano.preco === 0 ? (
            <p className="text-3xl font-bold text-gray-900">Grátis</p>
          ) : (
            <>
              <span className="text-sm font-medium text-muted-foreground">R$</span>
              <p className="text-3xl font-bold text-gray-900">{plano.preco.toFixed(0)}</p>
              <span className="text-sm text-muted-foreground">/mês</span>
            </>
          )}
        </div>
      </div>

      {/* Features */}
      <CardContent className="px-5 py-4 space-y-0">
        <FeatureRow label="Pacientes"         value={plano.max_pacientes} />
        <FeatureRow label="Usuários"          value={plano.max_usuarios} />
        <FeatureRow label="Tipos atendimento" value={plano.max_tipos_atendimento} />
        <FeatureRow label="IA / mês"          value={plano.max_ia_mes} />

        <div className="pt-4">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={onEditar}
          >
            <Edit3 className="h-3.5 w-3.5 mr-1.5" /> Editar plano
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function PlanosPage() {
  const { data: planos, isLoading } = useAdminPlanos()
  const [editando, setEditando] = useState<PlanoConfig | null>(null)

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ background: 'linear-gradient(135deg, #0094c8 0%, #04c2fb 60%, #00d5f5 100%)' }}
        >
          <Settings2 className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold leading-tight">Planos</h1>
          <p className="text-sm text-muted-foreground">Configuração de preços e limites</p>
        </div>
      </div>

      {/* Aviso */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3">
        <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-xs sm:text-sm text-amber-900">
          Alterações em preços e limites se aplicam imediatamente a todas as clínicas.
        </p>
      </div>

      {/* Legenda dos limites */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
        <div className="flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" /> Pacientes por clínica
        </div>
        <div className="flex items-center gap-1.5">
          <UserCog className="h-3.5 w-3.5" /> Profissionais por clínica
        </div>
        <div className="flex items-center gap-1.5">
          <Cpu className="h-3.5 w-3.5" /> Gerações de IA por mês
        </div>
      </div>

      {/* Grid de planos */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse overflow-hidden">
              <div className="h-36 bg-muted/40" />
              <CardContent className="p-5 space-y-3">
                {[...Array(4)].map((__, j) => (
                  <div key={j} className="h-3 bg-muted rounded w-full" />
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {planos?.map(p => (
            <PlanoCard key={p.slug} plano={p} onEditar={() => setEditando(p)} />
          ))}
        </div>
      )}

      {editando && <ModalEditarPlano plano={editando} onClose={() => setEditando(null)} />}
    </div>
  )
}
