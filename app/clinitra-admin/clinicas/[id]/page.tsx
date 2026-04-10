'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Building2, Calendar, CreditCard, Power, Edit3 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { useAdminClinicaDetalhe, useAdminAtualizarClinica } from '@/hooks/use-admin-clinicas'
import { useAdminPlanos } from '@/hooks/use-admin-planos'
import { cn } from '@/lib/utils'

const PLANO_COLORS: Record<string, string> = {
  free: 'bg-gray-100 text-gray-700 border-gray-200',
  pro: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  clinica: 'bg-purple-50 text-purple-700 border-purple-200',
}

function UsageBar({ usado, limite, pct }: { usado: number; limite: number | null; pct: number | null }) {
  if (pct === null) {
    return (
      <div>
        <p className="text-2xl font-bold tabular-nums">{usado}</p>
        <p className="text-xs text-muted-foreground mt-1">Ilimitado</p>
      </div>
    )
  }
  const color = pct >= 80 ? 'bg-red-500' : pct >= 60 ? 'bg-amber-500' : 'bg-emerald-500'
  return (
    <div>
      <p className="text-2xl font-bold tabular-nums">
        {usado}<span className="text-sm font-normal text-muted-foreground">/{limite}</span>
      </p>
      <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <p className={cn('text-xs mt-1 font-medium', pct >= 80 ? 'text-red-600' : 'text-muted-foreground')}>
        {pct}% usado
      </p>
    </div>
  )
}

export default function ClinicaDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: clinica, isLoading } = useAdminClinicaDetalhe(id)
  const { data: planos } = useAdminPlanos()
  const atualizar = useAdminAtualizarClinica()

  const [modalPlano, setModalPlano] = useState(false)
  const [modalStatus, setModalStatus] = useState(false)
  const [novoPlano, setNovoPlano] = useState<string>('')

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-muted rounded w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}><CardContent className="p-6 h-24 bg-muted/50" /></Card>
          ))}
        </div>
      </div>
    )
  }

  if (!clinica) {
    return (
      <div className="space-y-6">
        <Link href="/clinitra-admin/clinicas" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
        <Card><CardContent className="p-6 text-center text-muted-foreground">Clinica nao encontrada.</CardContent></Card>
      </div>
    )
  }

  async function handleAlterarPlano() {
    if (!novoPlano || novoPlano === clinica?.plano) {
      setModalPlano(false)
      return
    }
    try {
      await atualizar.mutateAsync({ clinicaId: id, body: { plano: novoPlano } })
      toast.success('Plano alterado', { description: `Clinica agora esta no plano ${novoPlano}.` })
      setModalPlano(false)
    } catch (e) {
      toast.error('Erro ao alterar plano', { description: String(e) })
    }
  }

  async function handleAlterarStatus() {
    if (!clinica) return
    try {
      await atualizar.mutateAsync({ clinicaId: id, body: { ativo: !clinica.ativo } })
      toast.success(
        clinica.ativo ? 'Clinica desativada' : 'Clinica ativada',
        { description: clinica.nome }
      )
      setModalStatus(false)
    } catch (e) {
      toast.error('Erro ao alterar status', { description: String(e) })
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link href="/clinitra-admin/clinicas" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-2">
            <ArrowLeft className="h-4 w-4" /> Clinicas
          </Link>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold">{clinica.nome}</h1>
            <Badge variant="outline" className={cn('text-xs capitalize', PLANO_COLORS[clinica.plano])}>
              {clinica.plano}
            </Badge>
            <Badge variant={clinica.ativo ? 'default' : 'destructive'} className="text-xs">
              {clinica.ativo ? 'Ativa' : 'Inativa'}
            </Badge>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { setNovoPlano(clinica.plano); setModalPlano(true) }}>
            <Edit3 className="h-4 w-4 mr-2" /> Alterar plano
          </Button>
          <Button
            variant={clinica.ativo ? 'destructive' : 'default'}
            size="sm"
            onClick={() => setModalStatus(true)}
          >
            <Power className="h-4 w-4 mr-2" /> {clinica.ativo ? 'Desativar' : 'Ativar'}
          </Button>
        </div>
      </div>

      {/* Cards de uso */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 sm:p-6">
            <p className="text-xs sm:text-sm text-muted-foreground font-medium mb-2">Pacientes</p>
            <UsageBar usado={clinica.pacientes_count} limite={clinica.quota_pacientes} pct={clinica.uso_pacientes_pct} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:p-6">
            <p className="text-xs sm:text-sm text-muted-foreground font-medium mb-2">Usuarios</p>
            <UsageBar usado={clinica.usuarios_count} limite={clinica.quota_usuarios} pct={clinica.uso_usuarios_pct} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs sm:text-sm text-muted-foreground font-medium">Criada em</p>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-base sm:text-lg font-bold">
              {clinica.criado_em ? new Date(clinica.criado_em).toLocaleDateString('pt-BR') : '-'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs sm:text-sm text-muted-foreground font-medium">Ultimo acesso</p>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-base sm:text-lg font-bold">
              {clinica.ultimo_acesso ? new Date(clinica.ultimo_acesso).toLocaleDateString('pt-BR') : 'Sem dados'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Dados da clinica */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Dados da clinica</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground mb-1">CNPJ</p>
            <p className="font-medium">{clinica.cnpj || '-'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">ID</p>
            <p className="font-mono text-xs">{clinica.id}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              <CreditCard className="h-3 w-3" /> Stripe Customer
            </p>
            <p className="font-mono text-xs">{clinica.stripe_customer_id || 'Nao integrado'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Stripe Subscription</p>
            <p className="font-mono text-xs">{clinica.stripe_subscription_id || '-'}</p>
          </div>
        </CardContent>
      </Card>

      {/* Usuarios da clinica */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span>Usuarios</span>
            <span className="text-sm font-normal text-muted-foreground">{clinica.usuarios.length}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-xs">
                  <th className="text-left px-4 py-2 font-medium">Nome</th>
                  <th className="text-left px-4 py-2 font-medium">Email</th>
                  <th className="text-left px-4 py-2 font-medium hidden sm:table-cell">Role</th>
                  <th className="text-left px-4 py-2 font-medium hidden md:table-cell">Status</th>
                </tr>
              </thead>
              <tbody>
                {clinica.usuarios.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground text-xs">
                      Nenhum usuario.
                    </td>
                  </tr>
                ) : (
                  clinica.usuarios.map((u) => (
                    <tr key={u.id} className="border-b">
                      <td className="px-4 py-2 font-medium">{u.nome}</td>
                      <td className="px-4 py-2 text-muted-foreground text-xs">{u.email}</td>
                      <td className="px-4 py-2 hidden sm:table-cell text-xs capitalize">{u.role}</td>
                      <td className="px-4 py-2 hidden md:table-cell">
                        <Badge variant={u.ativo ? 'default' : 'destructive'} className="text-xs">
                          {u.ativo ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Modal alterar plano (glassmorphism) */}
      <Dialog open={modalPlano} onOpenChange={setModalPlano}>
        <DialogContent
          className="w-full max-w-md bg-white/80 backdrop-blur-xl border border-white/20 shadow-2xl"
          showCloseButton={false}
        >
          <DialogHeader>
            <DialogTitle>Alterar plano</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Plano atual: <span className="font-semibold capitalize">{clinica.plano}</span>
            </p>
            <div className="space-y-2">
              {planos?.map((p) => (
                <button
                  key={p.slug}
                  onClick={() => setNovoPlano(p.slug)}
                  className={cn(
                    'w-full text-left px-4 py-3 rounded-lg border transition-all',
                    novoPlano === p.slug
                      ? 'border-cyan-500 bg-cyan-50/50 ring-2 ring-cyan-500/20'
                      : 'border-muted hover:bg-muted/30'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{p.nome_display}</span>
                    <span className="text-sm text-muted-foreground">
                      {p.preco === 0 ? 'Gratis' : `R$ ${p.preco.toFixed(2)}`}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {p.max_pacientes ?? 'Ilimitados'} pacientes · {p.max_usuarios ?? 'Ilimitados'} usuarios
                  </p>
                </button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalPlano(false)}>Cancelar</Button>
            <Button onClick={handleAlterarPlano} disabled={atualizar.isPending || novoPlano === clinica.plano}>
              {atualizar.isPending ? 'Salvando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal confirmar status (glassmorphism) */}
      <Dialog open={modalStatus} onOpenChange={setModalStatus}>
        <DialogContent
          className="w-full max-w-md bg-white/80 backdrop-blur-xl border border-white/20 shadow-2xl"
          showCloseButton={false}
        >
          <DialogHeader>
            <DialogTitle>{clinica.ativo ? 'Desativar clinica?' : 'Ativar clinica?'}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            {clinica.ativo
              ? `A clinica "${clinica.nome}" sera desativada. Os usuarios perdem o acesso ao sistema, mas os dados sao preservados.`
              : `A clinica "${clinica.nome}" sera reativada e os usuarios poderao acessar novamente.`
            }
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalStatus(false)}>Cancelar</Button>
            <Button
              variant={clinica.ativo ? 'destructive' : 'default'}
              onClick={handleAlterarStatus}
              disabled={atualizar.isPending}
            >
              {atualizar.isPending ? 'Salvando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
