'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Building2, Calendar, CreditCard, Power, Edit3, Users, Package } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { useAdminClinicaDetalhe, useAdminAtualizarClinica } from '@/hooks/use-admin-clinicas'
import { useAdminPlanos } from '@/hooks/use-admin-planos'
import { cn } from '@/lib/utils'

const PLANO_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; bar: string }> = {
  free:        { label: 'Free',        color: 'text-gray-600',   bg: 'bg-gray-50',   border: 'border-gray-200',   bar: 'bg-gray-400' },
  solo:        { label: 'Solo',        color: 'text-cyan-700',   bg: 'bg-cyan-50',   border: 'border-cyan-200',   bar: 'bg-[#04c2fb]' },
  clinica:     { label: 'Clínica',     color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200', bar: 'bg-purple-500' },
  clinica_pro: { label: 'Clínica Pro', color: 'text-violet-700', bg: 'bg-violet-50', border: 'border-violet-200', bar: 'bg-violet-600' },
}

// ── Gauge circular de uso ─────────────────────────────────────────────────────

function UsageGauge({ usado, limite, label }: { usado: number; limite: number | null; label: string }) {
  const pct = limite ? Math.min((usado / limite) * 100, 100) : null
  const color = pct === null ? '#04c2fb' : pct >= 80 ? '#ef4444' : pct >= 60 ? '#f59e0b' : '#10b981'
  const r = 28
  const circ = 2 * Math.PI * r
  const dash = pct !== null ? (pct / 100) * circ : circ

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative flex items-center justify-center">
        <svg width="72" height="72" className="-rotate-90">
          <circle cx="36" cy="36" r={r} fill="none" stroke="#e5e7eb" strokeWidth="6" />
          <circle
            cx="36" cy="36" r={r} fill="none"
            stroke={color} strokeWidth="6"
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.5s ease' }}
          />
        </svg>
        <div className="absolute text-center">
          <p className="text-sm font-bold leading-none tabular-nums">{usado}</p>
          {limite && <p className="text-[10px] text-muted-foreground leading-none mt-0.5">/{limite}</p>}
        </div>
      </div>
      <p className="text-xs text-muted-foreground font-medium">{label}</p>
      {pct !== null && (
        <p className="text-[11px] font-semibold" style={{ color }}>{Math.round(pct)}% usado</p>
      )}
      {pct === null && <p className="text-[11px] text-muted-foreground">Ilimitado</p>}
    </div>
  )
}

// ── Modal alterar plano ───────────────────────────────────────────────────────

function ModalAlterarPlano({
  planoAtual,
  clinicaId,
  onClose,
}: {
  planoAtual: string
  clinicaId: string
  onClose: () => void
}) {
  const { data: planos } = useAdminPlanos()
  const atualizar = useAdminAtualizarClinica()
  const [novoPlano, setNovoPlano] = useState(planoAtual)

  async function handleSalvar() {
    if (novoPlano === planoAtual) { onClose(); return }
    try {
      await atualizar.mutateAsync({ clinicaId, body: { plano: novoPlano } })
      toast.success('Plano alterado', {
        description: `Clínica agora está no ${PLANO_CONFIG[novoPlano]?.label ?? novoPlano}.`,
      })
      onClose()
    } catch (e) {
      toast.error('Erro ao alterar plano', { description: String(e) })
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-full max-w-md bg-white/90 backdrop-blur-xl border border-white/20 shadow-2xl" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Alterar plano</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <p className="text-sm text-muted-foreground mb-3">
            Plano atual: <span className="font-semibold">{PLANO_CONFIG[planoAtual]?.label ?? planoAtual}</span>
          </p>
          {planos?.map(p => {
            const cfg = PLANO_CONFIG[p.slug]
            const selecionado = novoPlano === p.slug
            return (
              <button
                key={p.slug}
                onClick={() => setNovoPlano(p.slug)}
                className={cn(
                  'w-full text-left px-4 py-3 rounded-xl border-2 transition-all',
                  selecionado
                    ? cn('border-[#04c2fb] bg-[#e0f7fe]')
                    : 'border-transparent bg-muted/40 hover:bg-muted/70'
                )}
              >
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

function ModalConfirmarStatus({
  nome,
  ativo,
  clinicaId,
  onClose,
}: {
  nome: string
  ativo: boolean
  clinicaId: string
  onClose: () => void
}) {
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
      <DialogContent className="w-full max-w-md bg-white/90 backdrop-blur-xl border border-white/20 shadow-2xl" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{ativo ? 'Desativar clínica?' : 'Ativar clínica?'}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground py-2">
          {ativo
            ? `A clínica "${nome}" será desativada. Os usuários perdem acesso, mas os dados são preservados.`
            : `A clínica "${nome}" será reativada e os usuários poderão acessar novamente.`
          }
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            variant={ativo ? 'destructive' : 'default'}
            onClick={handleConfirmar}
            disabled={atualizar.isPending}
          >
            {atualizar.isPending ? 'Salvando...' : 'Confirmar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function ClinicaDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: clinica, isLoading } = useAdminClinicaDetalhe(id)
  const [modalPlano, setModalPlano] = useState(false)
  const [modalStatus, setModalStatus] = useState(false)

  if (isLoading) {
    return (
      <div className="space-y-5 animate-pulse">
        <div className="h-6 bg-muted rounded w-20" />
        <div className="h-24 bg-muted rounded-2xl" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-muted rounded-xl" />)}
        </div>
      </div>
    )
  }

  if (!clinica) {
    return (
      <div className="space-y-4">
        <Link href="/clinitra-admin/clinicas" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Clínicas
        </Link>
        <Card><CardContent className="p-6 text-center text-muted-foreground">Clínica não encontrada.</CardContent></Card>
      </div>
    )
  }

  const planoCfg = PLANO_CONFIG[clinica.plano]

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <Link href="/clinitra-admin/clinicas" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Clínicas
      </Link>

      {/* Hero da clínica */}
      <div className="rounded-2xl border bg-gradient-to-br from-muted/30 to-muted/10 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-lg font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #0094c8, #04c2fb)' }}
            >
              {clinica.nome.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('') || <Building2 />}
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{clinica.nome}</h1>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <Badge variant="outline" className={cn('text-xs font-semibold', planoCfg?.color, planoCfg?.bg, planoCfg?.border)}>
                  {planoCfg?.label ?? clinica.plano}
                </Badge>
                <div className="flex items-center gap-1.5">
                  <div className={cn('h-2 w-2 rounded-full', clinica.ativo ? 'bg-emerald-500' : 'bg-gray-300')} />
                  <span className="text-xs text-muted-foreground">{clinica.ativo ? 'Ativa' : 'Inativa'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => setModalPlano(true)}>
              <Edit3 className="h-4 w-4 mr-1.5" /> Alterar plano
            </Button>
            <Button
              variant={clinica.ativo ? 'destructive' : 'default'}
              size="sm"
              onClick={() => setModalStatus(true)}
            >
              <Power className="h-4 w-4 mr-1.5" />
              {clinica.ativo ? 'Desativar' : 'Ativar'}
            </Button>
          </div>
        </div>
      </div>

      {/* Gauges de uso */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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
          <CardContent className="p-4 flex flex-col items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
              <Calendar className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground font-medium">Criada em</p>
              <p className="text-sm font-bold mt-1">
                {clinica.criado_em ? new Date(clinica.criado_em).toLocaleDateString('pt-BR') : '-'}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex flex-col items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
              <Package className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground font-medium">Último acesso</p>
              <p className="text-sm font-bold mt-1">
                {clinica.ultimo_acesso ? new Date(clinica.ultimo_acesso).toLocaleDateString('pt-BR') : 'Sem dados'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dados da clínica */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Dados da clínica
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="rounded-lg bg-muted/40 px-4 py-3">
            <p className="text-xs text-muted-foreground mb-1">CNPJ</p>
            <p className="font-medium">{clinica.cnpj || 'Não informado'}</p>
          </div>
          <div className="rounded-lg bg-muted/40 px-4 py-3">
            <p className="text-xs text-muted-foreground mb-1">ID interno</p>
            <p className="font-mono text-xs break-all">{clinica.id}</p>
          </div>
          <div className="rounded-lg bg-muted/40 px-4 py-3">
            <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              <CreditCard className="h-3 w-3" /> Stripe Customer
            </p>
            <p className="font-mono text-xs">{clinica.stripe_customer_id || 'Não integrado'}</p>
          </div>
          <div className="rounded-lg bg-muted/40 px-4 py-3">
            <p className="text-xs text-muted-foreground mb-1">Stripe Subscription</p>
            <p className="font-mono text-xs">{clinica.stripe_subscription_id || 'Não integrado'}</p>
          </div>
        </CardContent>
      </Card>

      {/* Usuários da clínica */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Users className="h-4 w-4" /> Usuários
            </CardTitle>
            <span className="text-sm text-muted-foreground">{clinica.usuarios.length}</span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {clinica.usuarios.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">Nenhum usuário cadastrado.</div>
          ) : (
            <div className="divide-y">
              {clinica.usuarios.map((u) => (
                <div key={u.id} className="flex items-center gap-3 px-4 py-3">
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                    style={{ background: 'linear-gradient(135deg, #0094c8, #04c2fb)' }}
                  >
                    {(u.nome || u.email).slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{u.nome || u.email}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    <Badge variant="outline" className="text-xs capitalize hidden sm:inline-flex">{u.role}</Badge>
                    <div className={cn('h-2 w-2 rounded-full', u.ativo ? 'bg-emerald-500' : 'bg-gray-300')} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {modalPlano && (
        <ModalAlterarPlano
          planoAtual={clinica.plano}
          clinicaId={id}
          onClose={() => setModalPlano(false)}
        />
      )}
      {modalStatus && (
        <ModalConfirmarStatus
          nome={clinica.nome}
          ativo={clinica.ativo}
          clinicaId={id}
          onClose={() => setModalStatus(false)}
        />
      )}
    </div>
  )
}
