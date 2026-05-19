'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Building2, Calendar, Power, Edit3, Users, Puzzle,
  Plus, Trash2, Loader2, ToggleLeft, ToggleRight, Pencil, FileText,
  FolderOpen, Clock, HardDrive, X, CheckCircle2, Circle, SkipForward,
  MinusCircle, PackageOpen, ChevronRight, Import,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { useAdminClinicaDetalhe, useAdminAtualizarClinica, type OnboardingDetalhe, type OnboardingStepStatus } from '@/hooks/use-admin-clinicas'
import { useAdminPlanos } from '@/hooks/use-admin-planos'
import {
  useAdminAddonsClinica, useAdminAddonsCatalogo,
  useAdminCriarAddon, useAdminAtualizarAddon, useAdminRemoverAddon,
  type ClinicaAddon,
} from '@/hooks/use-admin-addons'
import { cn } from '@/lib/utils'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(0)} KB`
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`
}

// ── Config visual por plano ───────────────────────────────────────────────────

const PLANO_CONFIG: Record<string, {
  label: string; color: string; bg: string; border: string; bar: string
  gradient: string
}> = {
  free:        { label: 'Free',        color: 'text-gray-600',   bg: 'bg-gray-50',   border: 'border-gray-200',   bar: 'bg-gray-400',    gradient: 'from-gray-500 to-gray-600' },
  solo:        { label: 'Solo',        color: 'text-cyan-700',   bg: 'bg-cyan-50',   border: 'border-cyan-200',   bar: 'bg-[#04c2fb]',   gradient: 'from-[#0094c8] to-[#04c2fb]' },
  clinica:     { label: 'Clínica',     color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200', bar: 'bg-purple-500',   gradient: 'from-[#3b0764] to-[#581c87]' },
  clinica_pro: { label: 'Clínica Pro', color: 'text-violet-700', bg: 'bg-violet-50', border: 'border-violet-200', bar: 'bg-violet-600',   gradient: 'from-amber-500 to-orange-500' },
}

// ── Gauge circular ────────────────────────────────────────────────────────────

function UsageGauge({ usado, limite, label }: { usado: number; limite: number | null; label: string }) {
  const pct = limite ? Math.min((usado / limite) * 100, 100) : null
  const cor = pct === null ? '#04c2fb' : pct >= 80 ? '#ef4444' : pct >= 60 ? '#f59e0b' : '#10b981'
  const r = 26; const circ = 2 * Math.PI * r
  const dash = pct !== null ? (pct / 100) * circ : circ
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative flex items-center justify-center">
        <svg width="66" height="66" className="-rotate-90">
          <circle cx="33" cy="33" r={r} fill="none" stroke="#f1f5f9" strokeWidth="5" />
          <circle cx="33" cy="33" r={r} fill="none" stroke={cor} strokeWidth="5"
            strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.5s ease' }}
          />
        </svg>
        <div className="absolute text-center">
          <p className="text-sm font-bold leading-none tabular-nums">{usado}</p>
          {limite && <p className="text-[9px] text-muted-foreground mt-0.5">/{limite}</p>}
        </div>
      </div>
      <p className="text-xs text-muted-foreground font-medium">{label}</p>
      {pct !== null
        ? <p className="text-[11px] font-semibold" style={{ color: cor }}>{Math.round(pct)}%</p>
        : <p className="text-[11px] text-emerald-600 font-semibold">Ilimitado</p>
      }
    </div>
  )
}

// ── Stat card simples ─────────────────────────────────────────────────────────

function StatCard({
  icon: Icon, label, value, sub, iconBg,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string | number
  sub?: string
  iconBg: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-white p-4">
      <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', iconBg)}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide leading-none mb-1">{label}</p>
        <p className="text-xl font-bold tabular-nums leading-none">{value}</p>
        {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ── Info field ────────────────────────────────────────────────────────────────

function InfoField({ label, value, mono }: { label: string; value: string | null; mono?: boolean }) {
  return (
    <div className="rounded-xl bg-muted/40 px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
      <p className={cn('text-sm font-medium break-all', mono ? 'font-mono text-xs' : '', !value && 'text-muted-foreground italic')}>
        {value || 'Não informado'}
      </p>
    </div>
  )
}

// ── Modal alterar plano ───────────────────────────────────────────────────────

function ModalAlterarPlano({ planoAtual, clinicaId, onClose }: { planoAtual: string; clinicaId: string; onClose: () => void }) {
  const { data: planos } = useAdminPlanos()
  const atualizar = useAdminAtualizarClinica()
  const [novoPlano, setNovoPlano] = useState(planoAtual)

  async function handleSalvar() {
    if (novoPlano === planoAtual) { onClose(); return }
    try {
      await atualizar.mutateAsync({ clinicaId, body: { plano: novoPlano } })
      toast.success('Plano alterado', { description: `Clínica agora está no ${PLANO_CONFIG[novoPlano]?.label ?? novoPlano}.` })
      onClose()
    } catch (e) {
      toast.error('Erro ao alterar plano', { description: String(e) })
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-full max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Alterar plano</DialogTitle>
          <DialogDescription className="text-xs">
            Plano atual: <span className="font-semibold">{PLANO_CONFIG[planoAtual]?.label ?? planoAtual}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-1">
          {planos?.map(p => {
            const cfg = PLANO_CONFIG[p.slug]
            const selecionado = novoPlano === p.slug
            return (
              <button key={p.slug} onClick={() => setNovoPlano(p.slug)} className={cn(
                'w-full text-left px-4 py-3 rounded-xl border-2 transition-all',
                selecionado ? 'border-[#04c2fb] bg-[#e0f7fe]' : 'border-transparent bg-muted/40 hover:bg-muted/70',
              )}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn('h-2.5 w-2.5 rounded-full', cfg?.bar ?? 'bg-gray-300')} />
                    <span className="font-semibold text-sm">{p.nome_display}</span>
                  </div>
                  <span className="text-sm text-muted-foreground font-medium">
                    {p.preco === 0 ? 'Grátis' : `R$ ${p.preco.toFixed(0)}/mês`}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 ml-4">
                  {p.max_pacientes ?? '∞'} pacientes · {p.max_usuarios ?? '∞'} usuários
                </p>
              </button>
            )
          })}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSalvar} disabled={atualizar.isPending || novoPlano === planoAtual}>
            {atualizar.isPending ? 'Salvando...' : 'Confirmar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Modal confirmar status ────────────────────────────────────────────────────

function ModalConfirmarStatus({ nome, ativo, clinicaId, onClose }: { nome: string; ativo: boolean; clinicaId: string; onClose: () => void }) {
  const atualizar = useAdminAtualizarClinica()

  async function handleConfirmar() {
    try {
      await atualizar.mutateAsync({ clinicaId, body: { ativo: !ativo } })
      toast.success(ativo ? 'Clínica desativada' : 'Clínica ativada', { description: nome })
      onClose()
    } catch (e) {
      toast.error('Erro ao alterar status', { description: String(e) })
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-full max-w-sm" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{ativo ? 'Desativar clínica?' : 'Ativar clínica?'}</DialogTitle>
          <DialogDescription className="text-xs">
            {ativo
              ? `"${nome}" será desativada. Os usuários perdem acesso, mas os dados são preservados.`
              : `"${nome}" será reativada e os usuários poderão acessar novamente.`}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button variant={ativo ? 'destructive' : 'default'} onClick={handleConfirmar} disabled={atualizar.isPending}>
            {atualizar.isPending ? 'Salvando...' : 'Confirmar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Modal criar add-on ────────────────────────────────────────────────────────

function AddonModalHeader({ title, description, onClose }: { title: string; description: string; onClose: () => void }) {
  return (
    <div className="relative bg-gradient-to-br from-[#0094c8] to-[#04c2fb] p-6 pb-10 rounded-t-lg">
      <div className="flex items-start justify-between mb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
          <Puzzle className="h-5 w-5 text-white" />
        </div>
        <button
          onClick={onClose}
          className="text-white/60 hover:text-white transition-colors rounded-lg p-1"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <DialogTitle className="text-xl font-bold text-white">{title}</DialogTitle>
      <DialogDescription className="text-cyan-100 text-xs mt-0.5">{description}</DialogDescription>
      <div className="absolute bottom-0 left-0 right-0 h-5 bg-background rounded-t-[20px]" />
    </div>
  )
}

function ModalCriarAddon({ clinicaId, onClose }: { clinicaId: string; onClose: () => void }) {
  const { data: catalogo } = useAdminAddonsCatalogo()
  const criar = useAdminCriarAddon(clinicaId)
  const [slugSelecionado, setSlugSelecionado] = useState('')
  const [quantidade, setQuantidade] = useState('1')
  const [precoCustom, setPrecoCustom] = useState('')
  const [observacao, setObservacao] = useState('')

  const addonInfo = catalogo?.find(a => a.slug === slugSelecionado)
  const precoFinal = precoCustom !== '' ? parseFloat(precoCustom) : (addonInfo?.preco_padrao ?? 0)
  const qty = parseInt(quantidade, 10) || 1

  function getLabelIncremento(item: typeof addonInfo) {
    if (!item?.campo_limite || !item.incremento_por_unidade) return null
    if (item.campo_limite === 'max_usuarios') return `+${item.incremento_por_unidade} profissional por unidade`
    if (item.campo_limite === 'max_ia_mes') return `+${item.incremento_por_unidade} gerações IA/mês por unidade`
    if (item.campo_limite === 'storage') return '+10 GB de armazenamento por unidade'
    return null
  }

  async function handleCriar() {
    if (!slugSelecionado) { toast.error('Selecione um add-on'); return }
    if (isNaN(qty) || qty < 1) { toast.error('Quantidade inválida'); return }
    try {
      await criar.mutateAsync({
        addon_slug: slugSelecionado,
        quantidade: qty,
        preco_unitario: precoCustom !== '' ? precoFinal : null,
        observacao: observacao || null,
      })
      toast.success('Add-on adicionado', { description: addonInfo?.descricao })
      onClose()
    } catch (e) {
      toast.error('Erro ao adicionar add-on', { description: String(e) })
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-full max-w-lg p-0 overflow-hidden gap-0" showCloseButton={false}>
        <AddonModalHeader
          title="Adicionar add-on"
          description="Extras contratuais por clínica. Preços podem ser personalizados."
          onClose={onClose}
        />

        <div className="px-6 py-5 space-y-5 overflow-y-auto max-h-[65vh]">
          {/* Catálogo */}
          <div className="space-y-2">
            {catalogo?.map(item => {
              const selecionado = slugSelecionado === item.slug
              const incrementoLabel = getLabelIncremento(item)
              return (
                <button
                  key={item.slug}
                  onClick={() => { setSlugSelecionado(item.slug); setPrecoCustom('') }}
                  className={cn(
                    'w-full text-left px-4 py-3.5 rounded-xl border-2 transition-all',
                    selecionado
                      ? 'border-[#04c2fb] bg-gradient-to-r from-cyan-50 to-blue-50 shadow-sm'
                      : 'border-gray-100 bg-muted/30 hover:bg-muted/60 hover:border-gray-200',
                  )}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2.5">
                      <div className={cn(
                        'h-2 w-2 rounded-full shrink-0 transition-colors',
                        selecionado ? 'bg-[#04c2fb]' : 'bg-gray-300',
                      )} />
                      <span className="text-sm font-semibold text-gray-900">{item.descricao}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-sm font-bold text-gray-800 tabular-nums">
                        R$ {item.preco_padrao.toFixed(0)}
                      </span>
                      <span className="text-xs text-muted-foreground ml-0.5">
                        {item.recorrente ? '/mês' : ' único'}
                      </span>
                    </div>
                  </div>
                  {incrementoLabel && (
                    <p className="text-xs text-muted-foreground mt-1 ml-4.5 pl-0.5">{incrementoLabel}</p>
                  )}
                </button>
              )
            })}
          </div>

          {/* Configuração — aparece ao selecionar */}
          {slugSelecionado && (
            <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 space-y-4">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Configuração do contrato
              </p>

              <div className="flex gap-4 items-start">
                <div className="w-32 shrink-0">
                  <Label htmlFor="addon-qty" className="text-xs font-medium">Quantidade</Label>
                  <Input
                    id="addon-qty"
                    type="number"
                    min="1"
                    value={quantidade}
                    onChange={(e) => setQuantidade(e.target.value)}
                    className="mt-1.5 bg-white"
                  />
                </div>
                <div className="flex-1">
                  <Label htmlFor="addon-preco" className="text-xs font-medium">Preço unitário (R$)</Label>
                  <Input
                    id="addon-preco"
                    type="number"
                    min="0"
                    step="1"
                    value={precoCustom}
                    placeholder={addonInfo ? `${addonInfo.preco_padrao.toFixed(0)} — padrão` : ''}
                    onChange={(e) => setPrecoCustom(e.target.value)}
                    className="mt-1.5 bg-white"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Vazio = preço padrão do catálogo.
                  </p>
                </div>
              </div>

              {addonInfo && (
                <div className="flex items-center justify-between rounded-lg bg-white border border-gray-200 px-4 py-2.5">
                  <span className="text-xs text-muted-foreground">Total deste add-on</span>
                  <span className="text-sm font-bold tabular-nums" style={{ color: '#0094c8' }}>
                    R$ {(precoFinal * qty).toFixed(2)}
                    <span className="text-xs font-normal text-muted-foreground ml-1">
                      {addonInfo.recorrente ? '/mês' : 'único'}
                    </span>
                  </span>
                </div>
              )}

              <div>
                <Label htmlFor="addon-obs" className="text-xs font-medium">Observação</Label>
                <Input
                  id="addon-obs"
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  placeholder="Ex: Contrato assinado em 01/05/2026, renovação automática..."
                  className="mt-1.5 bg-white"
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 border-t px-6 py-4">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button
            className="flex-1"
            style={{ background: 'linear-gradient(135deg, #0094c8 0%, #04c2fb 100%)' }}
            onClick={handleCriar}
            disabled={criar.isPending || !slugSelecionado}
          >
            {criar.isPending
              ? <><Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />Adicionando...</>
              : 'Adicionar add-on'
            }
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Modal editar add-on ───────────────────────────────────────────────────────

function ModalEditarAddon({ addon, clinicaId, onClose }: { addon: ClinicaAddon; clinicaId: string; onClose: () => void }) {
  const atualizar = useAdminAtualizarAddon(clinicaId)
  const [quantidade, setQuantidade] = useState(String(addon.quantidade))
  const [preco, setPreco] = useState(String(addon.preco_unitario))
  const [observacao, setObservacao] = useState(addon.observacao ?? '')
  const [ativo, setAtivo] = useState(addon.ativo)

  async function handleSalvar() {
    const qty = parseInt(quantidade, 10)
    const pr = parseFloat(preco)
    if (isNaN(qty) || qty < 1) { toast.error('Quantidade inválida'); return }
    if (isNaN(pr) || pr < 0) { toast.error('Preço inválido'); return }
    try {
      await atualizar.mutateAsync({ addonId: addon.id, body: { quantidade: qty, preco_unitario: pr, ativo, observacao: observacao || null } })
      toast.success('Add-on atualizado')
      onClose()
    } catch (e) {
      toast.error('Erro ao atualizar add-on', { description: String(e) })
    }
  }

  const totalMensal = parseFloat(preco) * parseInt(quantidade, 10)

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-full max-w-md p-0 overflow-hidden gap-0" showCloseButton={false}>
        <AddonModalHeader
          title={addon.descricao}
          description={addon.recorrente ? 'Add-on recorrente — cobrado mensalmente' : 'Add-on de serviço único'}
          onClose={onClose}
        />

        <div className="px-6 py-5 space-y-4">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Configuração
          </p>

          <div className="flex gap-4 items-start">
            <div className="w-32 shrink-0">
              <Label htmlFor="ea-qty" className="text-xs font-medium">Quantidade</Label>
              <Input id="ea-qty" type="number" min="1" value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)} className="mt-1.5" />
            </div>
            <div className="flex-1">
              <Label htmlFor="ea-preco" className="text-xs font-medium">Preço unitário (R$)</Label>
              <Input id="ea-preco" type="number" min="0" step="1" value={preco}
                onChange={(e) => setPreco(e.target.value)} className="mt-1.5" />
            </div>
          </div>

          {!isNaN(totalMensal) && totalMensal > 0 && (
            <div className="flex items-center justify-between rounded-lg bg-muted/40 border px-4 py-2.5">
              <span className="text-xs text-muted-foreground">Total</span>
              <span className="text-sm font-bold tabular-nums" style={{ color: '#0094c8' }}>
                R$ {totalMensal.toFixed(2)}
                <span className="text-xs font-normal text-muted-foreground ml-1">
                  {addon.recorrente ? '/mês' : 'único'}
                </span>
              </span>
            </div>
          )}

          <div>
            <Label htmlFor="ea-obs" className="text-xs font-medium">Observação</Label>
            <Input id="ea-obs" value={observacao}
              onChange={(e) => setObservacao(e.target.value)} className="mt-1.5"
              placeholder="Detalhes do contrato..." />
          </div>

          <div className="flex items-center justify-between rounded-xl border px-4 py-3 bg-muted/30">
            <div>
              <p className="text-sm font-medium">Ativo</p>
              <p className="text-xs text-muted-foreground">
                {ativo ? 'Cobrado e aplicado aos limites' : 'Suspenso — sem efeito nos limites'}
              </p>
            </div>
            <Switch checked={ativo} onCheckedChange={setAtivo} />
          </div>
        </div>

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

// ── Seção add-ons ─────────────────────────────────────────────────────────────

function SecaoAddons({ clinicaId }: { clinicaId: string }) {
  const { data: addons, isLoading } = useAdminAddonsClinica(clinicaId)
  const remover = useAdminRemoverAddon(clinicaId)
  const [modalCriar, setModalCriar] = useState(false)
  const [editando, setEditando] = useState<ClinicaAddon | null>(null)

  const mrrAddons = (addons ?? []).filter(a => a.ativo && a.recorrente)
    .reduce((s, a) => s + a.preco_unitario * a.quantidade, 0)

  async function handleRemover(addon: ClinicaAddon) {
    if (!confirm(`Remover "${addon.descricao}"?`)) return
    try {
      await remover.mutateAsync(addon.id)
      toast.success('Add-on removido')
    } catch (e) {
      toast.error('Erro ao remover', { description: String(e) })
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Puzzle className="h-4 w-4" />
            Add-ons contratados
            {mrrAddons > 0 && (
              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full normal-case tracking-normal">
                +R${mrrAddons.toFixed(0)}/mês
              </span>
            )}
          </CardTitle>
          <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs" onClick={() => setModalCriar(true)}>
            <Plus className="h-3.5 w-3.5" /> Adicionar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="px-4 py-4 space-y-2 animate-pulse">
            {[...Array(2)].map((_, i) => <div key={i} className="h-10 bg-muted rounded-lg" />)}
          </div>
        ) : !addons?.length ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Nenhum add-on contratado.</p>
        ) : (
          <div className="divide-y">
            {addons.map(addon => (
              <div key={addon.id} className={cn('flex items-center gap-3 px-4 py-3', !addon.ativo && 'opacity-50')}>
                <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                  addon.ativo ? 'bg-emerald-100' : 'bg-muted')}>
                  {addon.ativo
                    ? <ToggleRight className="h-4 w-4 text-emerald-600" />
                    : <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {addon.descricao}
                    {addon.quantidade > 1 && <span className="ml-1 text-xs text-muted-foreground font-normal">×{addon.quantidade}</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    R$ {addon.preco_unitario.toFixed(2)}/unidade · {addon.recorrente ? 'mensal' : 'único'}
                    {addon.observacao && ` · ${addon.observacao}`}
                  </p>
                </div>
                <div className="shrink-0 flex items-center gap-1">
                  <span className="text-sm font-bold tabular-nums text-gray-700 mr-1">
                    R${(addon.preco_unitario * addon.quantidade).toFixed(0)}{addon.recorrente ? '/mês' : ''}
                  </span>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-gray-700" onClick={() => setEditando(addon)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => handleRemover(addon)} disabled={remover.isPending}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      {modalCriar && <ModalCriarAddon clinicaId={clinicaId} onClose={() => setModalCriar(false)} />}
      {editando && <ModalEditarAddon addon={editando} clinicaId={clinicaId} onClose={() => setEditando(null)} />}
    </Card>
  )
}

// ── Seção Onboarding ──────────────────────────────────────────────────────────

const STEP_CONFIG: Record<string, { label: string; sub: string }> = {
  import_pacientes:   { label: 'Importar pacientes',             sub: 'CSV/XLSX com histórico de pacientes' },
  import_financeiro:  { label: 'Importar financeiro',            sub: 'Histórico de transações e recebimentos' },
  import_registros:   { label: 'Importar registros clínicos',    sub: 'Atendimentos e anotações anteriores' },
  planos:             { label: 'Criar plano de atendimento',      sub: 'Tipos de atendimento e pacotes' },
  adicionar_paciente: { label: 'Cadastrar primeiro paciente',     sub: 'Paciente inicial para começar a usar' },
}

function StepStatusIcon({ status }: { status: OnboardingStepStatus }) {
  if (status === 'completed')   return <CheckCircle2  className="h-5 w-5 text-emerald-500 shrink-0" />
  if (status === 'skipped')     return <SkipForward   className="h-5 w-5 text-amber-400 shrink-0" />
  if (status === 'pending')     return <Circle        className="h-5 w-5 text-blue-400 shrink-0" />
  return                               <MinusCircle   className="h-5 w-5 text-gray-300 shrink-0" />
}

function StepStatusBadge({ status }: { status: OnboardingStepStatus }) {
  const map: Record<OnboardingStepStatus, { label: string; cls: string }> = {
    completed:   { label: 'Concluído',     cls: 'bg-emerald-100 text-emerald-700' },
    skipped:     { label: 'Pulado',        cls: 'bg-amber-100   text-amber-700'   },
    pending:     { label: 'Pendente',      cls: 'bg-blue-100    text-blue-700'    },
    unavailable: { label: 'N/A',           cls: 'bg-gray-100    text-gray-400'    },
  }
  const { label, cls } = map[status]
  return (
    <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide', cls)}>
      {label}
    </span>
  )
}

function SecaoOnboarding({ onboarding }: { onboarding: OnboardingDetalhe | null }) {
  if (!onboarding) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <PackageOpen className="h-4 w-4" /> Jornada de onboarding
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground py-4 text-center">
            Nenhum registro de onboarding encontrado para esta clínica.
          </p>
        </CardContent>
      </Card>
    )
  }

  const decisaoLabel = onboarding.decisao === 'importar'
    ? 'Importar dados históricos'
    : onboarding.decisao === 'sem_importacao'
      ? 'Começar do zero'
      : null

  const decisaoCor = onboarding.decisao === 'importar'
    ? 'bg-violet-100 text-violet-700 border-violet-200'
    : onboarding.decisao === 'sem_importacao'
      ? 'bg-sky-100 text-sky-700 border-sky-200'
      : 'bg-gray-100 text-gray-500 border-gray-200'

  const stepsOrdenados = [
    'import_pacientes',
    'import_financeiro',
    'import_registros',
    'planos',
    'adicionar_paciente',
  ] as const

  const totalRelevantes = stepsOrdenados.filter(
    s => onboarding.steps[s] !== 'unavailable'
  ).length
  const concluidos = stepsOrdenados.filter(
    s => onboarding.steps[s] === 'completed' || onboarding.steps[s] === 'skipped'
  ).length
  const progresso = totalRelevantes > 0 ? Math.round((concluidos / totalRelevantes) * 100) : 0

  return (
    <Card className="overflow-hidden">
      {/* Header colorido */}
      <div className={cn(
        'px-5 py-4 border-b flex items-start justify-between gap-4',
        onboarding.concluido ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100',
      )}>
        <div className="flex items-center gap-3">
          <div className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
            onboarding.concluido ? 'bg-emerald-500' : 'bg-amber-400',
          )}>
            <PackageOpen className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-bold text-gray-900">Jornada de onboarding</p>
              {onboarding.concluido ? (
                <span className="text-[10px] font-bold bg-emerald-500 text-white px-2.5 py-0.5 rounded-full uppercase tracking-wide">
                  Concluído
                </span>
              ) : (
                <span className="text-[10px] font-bold bg-amber-400 text-white px-2.5 py-0.5 rounded-full uppercase tracking-wide">
                  Em andamento
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {onboarding.criado_em
                ? `Iniciado em ${new Date(onboarding.criado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}`
                : 'Data de início não registrada'}
              {onboarding.concluido_em && (
                <> · Concluído em {new Date(onboarding.concluido_em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}</>
              )}
            </p>
          </div>
        </div>

        {/* Progresso circular compacto */}
        <div className="shrink-0 flex flex-col items-center gap-0.5">
          <div className="relative flex items-center justify-center">
            <svg width="46" height="46" className="-rotate-90">
              <circle cx="23" cy="23" r="18" fill="none" stroke="#e2e8f0" strokeWidth="4" />
              <circle
                cx="23" cy="23" r="18" fill="none"
                stroke={onboarding.concluido ? '#10b981' : '#f59e0b'}
                strokeWidth="4"
                strokeDasharray={`${(progresso / 100) * 2 * Math.PI * 18} ${2 * Math.PI * 18}`}
                strokeLinecap="round"
                style={{ transition: 'stroke-dasharray 0.5s ease' }}
              />
            </svg>
            <p className="absolute text-[11px] font-bold tabular-nums">{progresso}%</p>
          </div>
          <p className="text-[9px] text-muted-foreground font-medium">{concluidos}/{totalRelevantes} etapas</p>
        </div>
      </div>

      <CardContent className="p-5 space-y-5">
        {/* Decisão tomada */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
            Decisão de importação
          </p>
          {decisaoLabel ? (
            <div className={cn(
              'inline-flex items-center gap-2 rounded-xl border px-3 py-2',
              decisaoCor,
            )}>
              <Import className="h-4 w-4 shrink-0" />
              <span className="text-sm font-semibold">{decisaoLabel}</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-gray-400">
              <Circle className="h-4 w-4 shrink-0" />
              <span className="text-sm font-medium italic">Ainda não decidiu</span>
            </div>
          )}
        </div>

        {/* Timeline de etapas */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            Etapas do fluxo
          </p>
          <div className="relative">
            {/* Linha vertical */}
            <div className="absolute left-[10px] top-3 bottom-3 w-px bg-gray-100" />

            <div className="space-y-1">
              {stepsOrdenados.map((stepKey, idx) => {
                const status = onboarding.steps[stepKey]
                const cfg = STEP_CONFIG[stepKey]
                const isLast = idx === stepsOrdenados.length - 1
                const isUnavailable = status === 'unavailable'

                return (
                  <div
                    key={stepKey}
                    className={cn(
                      'relative flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors',
                      isUnavailable ? 'opacity-40' : 'bg-muted/30 hover:bg-muted/50',
                    )}
                  >
                    <div className="relative z-10 mt-0.5">
                      <StepStatusIcon status={status} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={cn(
                          'text-sm font-semibold',
                          isUnavailable ? 'text-muted-foreground' : 'text-gray-900',
                        )}>
                          {cfg.label}
                        </p>
                        <StepStatusBadge status={status} />
                      </div>
                      {!isUnavailable && (
                        <p className="text-xs text-muted-foreground mt-0.5">{cfg.sub}</p>
                      )}
                    </div>
                    {!isLast && !isUnavailable && (
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0 mt-1" />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Rodapé: última atualização */}
        {onboarding.atualizado_em && (
          <p className="text-[11px] text-muted-foreground text-right">
            Última atualização:{' '}
            {new Date(onboarding.atualizado_em).toLocaleDateString('pt-BR', {
              day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
            })}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-5 bg-muted rounded w-20" />
      <div className="h-40 bg-muted rounded-2xl" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-muted rounded-xl" />)}
      </div>
      <div className="h-32 bg-muted rounded-xl" />
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function ClinicaDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: clinica, isLoading } = useAdminClinicaDetalhe(id)
  const atualizar = useAdminAtualizarClinica()
  const [modalPlano, setModalPlano] = useState(false)
  const [modalStatus, setModalStatus] = useState(false)
  const [togglingIsencao, setTogglingIsencao] = useState(false)

  async function handleToggleIsencao(novoValor: boolean) {
    if (!clinica) return
    setTogglingIsencao(true)
    try {
      await atualizar.mutateAsync({ clinicaId: id, body: { isento_cobranca: novoValor } })
      toast.success(
        novoValor ? 'Isenção ativada' : 'Isenção removida',
        { description: novoValor ? `${clinica.nome} não será cobrada.` : `${clinica.nome} voltará a ser cobrada normalmente.` },
      )
    } catch (e) {
      toast.error('Erro ao alterar isenção', { description: String(e) })
    } finally {
      setTogglingIsencao(false)
    }
  }

  if (isLoading) return <PageSkeleton />

  if (!clinica) {
    return (
      <div className="space-y-4">
        <Link href="/clinitra-admin/clinicas" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Clínicas
        </Link>
        <Card><CardContent className="p-8 text-center text-muted-foreground">Clínica não encontrada.</CardContent></Card>
      </div>
    )
  }

  const planoCfg = PLANO_CONFIG[clinica.plano]
  const temTrial = !!clinica.trial_expira_em
  const trialExpirado = temTrial && new Date(clinica.trial_expira_em!) < new Date()

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <Link
        href="/clinitra-admin/clinicas"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Clínicas
      </Link>

      {/* Hero */}
      <div className="rounded-2xl overflow-hidden border shadow-sm">
        {/* Faixa colorida do plano */}
        <div className={cn('h-2 w-full bg-gradient-to-r', planoCfg?.gradient ?? 'from-gray-400 to-gray-500')} />

        <div className="p-5 sm:p-6 bg-white">
          <div className="flex items-start gap-4 flex-wrap">
            {/* Avatar */}
            <div
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-xl font-bold text-white shadow-sm"
              style={{ background: 'linear-gradient(135deg, #0094c8, #04c2fb)' }}
            >
              {clinica.nome.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('') || <Building2 className="h-7 w-7" />}
            </div>

            {/* Nome + badges */}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-gray-900 leading-tight truncate">{clinica.nome}</h1>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge variant="outline" className={cn('font-semibold', planoCfg?.color, planoCfg?.bg, planoCfg?.border)}>
                  {planoCfg?.label ?? clinica.plano}
                </Badge>
                <div className="flex items-center gap-1.5">
                  <div className={cn('h-2 w-2 rounded-full', clinica.ativo ? 'bg-emerald-500' : 'bg-gray-300')} />
                  <span className={cn('text-xs font-medium', clinica.ativo ? 'text-emerald-700' : 'text-muted-foreground')}>
                    {clinica.ativo ? 'Ativa' : 'Inativa'}
                  </span>
                </div>
                {temTrial && (
                  <div className={cn('flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full',
                    trialExpirado ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700')}>
                    <Clock className="h-3 w-3" />
                    {trialExpirado ? 'Trial expirado' : `Trial até ${new Date(clinica.trial_expira_em!).toLocaleDateString('pt-BR')}`}
                  </div>
                )}
              </div>
            </div>

            {/* Ações */}
            <div className="flex flex-col gap-2 shrink-0">
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setModalPlano(true)}
                  className="inline-flex items-center gap-1.5 px-3 h-8 text-xs font-semibold rounded-lg text-white shadow-sm transition-opacity hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #0094c8 0%, #04c2fb 100%)' }}
                >
                  <Edit3 className="h-3.5 w-3.5" /> Alterar plano
                </button>
                <button
                  onClick={() => setModalStatus(true)}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 h-8 text-xs font-semibold rounded-lg text-white shadow-sm transition-opacity hover:opacity-90',
                    clinica.ativo
                      ? 'bg-rose-500 hover:bg-rose-600'
                      : 'bg-emerald-500 hover:bg-emerald-600',
                  )}
                >
                  <Power className="h-3.5 w-3.5" />
                  {clinica.ativo ? 'Desativar' : 'Ativar'}
                </button>
              </div>

              {/* Toggle isenção de cobrança */}
              <div
                className={cn(
                  'flex items-center gap-2.5 rounded-lg border px-3 py-2 transition-colors',
                  clinica.isento_cobranca
                    ? 'border-amber-300 bg-amber-50'
                    : 'border-gray-200 bg-gray-50',
                )}
              >
                <Switch
                  checked={clinica.isento_cobranca}
                  onCheckedChange={handleToggleIsencao}
                  disabled={togglingIsencao}
                  className="data-[state=checked]:bg-amber-500"
                />
                <div>
                  <p className={cn('text-xs font-semibold leading-none', clinica.isento_cobranca ? 'text-amber-700' : 'text-gray-600')}>
                    {clinica.isento_cobranca ? 'Isento de cobrança' : 'Cobrança normal'}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 leading-none">
                    {clinica.isento_cobranca ? 'Nenhuma taxa é gerada' : 'Assinatura e add-ons cobrados'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Métricas de uso — gauges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 flex flex-col items-center justify-center">
            <UsageGauge usado={clinica.pacientes_count} limite={clinica.quota_pacientes} label="Pacientes" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex flex-col items-center justify-center">
            <UsageGauge usado={clinica.usuarios_count} limite={clinica.quota_usuarios} label="Usuários" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex flex-col items-center justify-center">
            <UsageGauge usado={clinica.agendamentos_count} limite={null} label="Agendamentos" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex flex-col items-center justify-center">
            <UsageGauge usado={clinica.registros_count} limite={null} label="Registros" />
          </CardContent>
        </Card>
      </div>

      {/* Stats de conteúdo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={FileText} label="Formulários" value={clinica.formularios_count} iconBg="bg-gradient-to-br from-violet-500 to-purple-600" />
        <StatCard icon={FolderOpen} label="Arquivos" value={clinica.arquivos_count} iconBg="bg-gradient-to-br from-amber-400 to-orange-500" />
        <StatCard
          icon={Calendar}
          label="Criada em"
          value={clinica.criado_em ? new Date(clinica.criado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
          iconBg="bg-gradient-to-br from-slate-500 to-slate-600"
        />
        <StatCard
          icon={Clock}
          label="Último acesso"
          value={clinica.ultimo_acesso ? new Date(clinica.ultimo_acesso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : '—'}
          sub={clinica.ultimo_acesso ? new Date(clinica.ultimo_acesso).getFullYear().toString() : undefined}
          iconBg="bg-gradient-to-br from-[#0094c8] to-[#04c2fb]"
        />
      </div>

      {/* Storage */}
      {clinica.storage_bytes_limite > 0 && (() => {
        const pct = clinica.storage_uso_pct ?? 0
        const corBarra = pct >= 80 ? '#ef4444' : pct >= 60 ? '#f59e0b' : '#04c2fb'
        const corTexto = pct >= 80 ? 'text-rose-600' : pct >= 60 ? 'text-amber-600' : 'text-[#0094c8]'
        return (
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#0094c8] to-[#04c2fb]">
                    <HardDrive className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Armazenamento</p>
                    <p className="text-xs text-muted-foreground">Supabase Storage — arquivos e anexos</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={cn('text-lg font-bold tabular-nums', corTexto)}>
                    {pct.toFixed(1)}%
                  </p>
                  <p className="text-[11px] text-muted-foreground">utilizado</p>
                </div>
              </div>

              {/* Barra */}
              <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden mb-2">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: corBarra }}
                />
              </div>

              {/* Números */}
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-gray-700 tabular-nums">
                  {formatBytes(clinica.storage_bytes_used)} usados
                </span>
                <span className="text-muted-foreground tabular-nums">
                  {formatBytes(clinica.storage_bytes_limite)} incluídos no plano
                </span>
              </div>

              {pct >= 80 && (
                <div className="mt-3 flex items-center gap-2 rounded-lg bg-rose-50 border border-rose-200 px-3 py-2">
                  <div className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
                  <p className="text-xs text-rose-700 font-medium">
                    {pct >= 100
                      ? 'Limite atingido — novos uploads bloqueados.'
                      : 'Acima de 80% — considere adicionar o add-on de storage extra.'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })()}

      {/* Dados da clínica */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Building2 className="h-4 w-4" /> Dados da clínica
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <InfoField label="CNPJ" value={clinica.cnpj} />
          <InfoField label="ID interno" value={clinica.id} mono />
          <InfoField label="Stripe Customer" value={clinica.stripe_customer_id} mono />
          <InfoField label="Stripe Subscription" value={clinica.stripe_subscription_id} mono />
        </CardContent>
      </Card>

      {/* Onboarding */}
      <SecaoOnboarding onboarding={clinica.onboarding} />

      {/* Add-ons */}
      <SecaoAddons clinicaId={id} />

      {/* Usuários */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Users className="h-4 w-4" /> Usuários
            </CardTitle>
            <span className="text-sm font-medium text-muted-foreground tabular-nums">{clinica.usuarios.length}</span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {clinica.usuarios.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Nenhum usuário cadastrado.</p>
          ) : (
            <div className="divide-y">
              {clinica.usuarios.map((u) => (
                <div key={u.id} className="flex items-center gap-3 px-4 py-3">
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                    style={{ background: 'linear-gradient(135deg, #0094c8, #04c2fb)' }}
                  >
                    {(u.nome || u.email).slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{u.nome || u.email}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    <Badge variant="outline" className="text-xs capitalize hidden sm:inline-flex">
                      {u.role}
                    </Badge>
                    <div className={cn('h-2 w-2 rounded-full', u.ativo ? 'bg-emerald-500' : 'bg-gray-300')} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {modalPlano && (
        <ModalAlterarPlano planoAtual={clinica.plano} clinicaId={id} onClose={() => setModalPlano(false)} />
      )}
      {modalStatus && (
        <ModalConfirmarStatus nome={clinica.nome} ativo={clinica.ativo} clinicaId={id} onClose={() => setModalStatus(false)} />
      )}
    </div>
  )
}
