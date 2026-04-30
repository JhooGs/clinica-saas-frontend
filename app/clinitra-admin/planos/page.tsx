'use client'

import { useState } from 'react'
import { Edit3, Settings2, AlertCircle, Infinity } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { useAdminPlanos, useAdminAtualizarPlano, type PlanoConfig } from '@/hooks/use-admin-planos'

interface FormState {
  nome_display: string
  preco: string
  max_pacientes: string
  max_usuarios: string
  max_tipos_atendimento: string
  max_ia_mes: string
  ativo: boolean
}

function LimitInput({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label htmlFor={id}>{label} <span className="text-muted-foreground font-normal text-xs">(vazio = ilimitado)</span></Label>
      <Input
        id={id}
        type="number"
        min="0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Ilimitado"
      />
    </div>
  )
}

function ModalEditarPlano({
  plano,
  onClose,
}: {
  plano: PlanoConfig
  onClose: () => void
}) {
  const atualizar = useAdminAtualizarPlano()
  const [form, setForm] = useState<FormState>({
    nome_display:          plano.nome_display,
    preco:                 String(plano.preco),
    max_pacientes:         plano.max_pacientes?.toString() ?? '',
    max_usuarios:          plano.max_usuarios?.toString() ?? '',
    max_tipos_atendimento: plano.max_tipos_atendimento?.toString() ?? '',
    max_ia_mes:            plano.max_ia_mes?.toString() ?? '',
    ativo:                 plano.ativo,
  })

  function parseLimit(val: string): number | null {
    if (val === '') return null
    const n = parseInt(val, 10)
    return isNaN(n) || n < 0 ? -1 : n
  }

  async function handleSalvar() {
    const preco = parseFloat(form.preco)
    if (isNaN(preco) || preco < 0) {
      toast.error('Preço inválido', { description: 'Informe um valor numérico maior ou igual a zero.' })
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
      toast.success('Plano atualizado', { description: `${form.nome_display} foi salvo com sucesso.` })
      onClose()
    } catch (e) {
      toast.error('Erro ao salvar plano', { description: String(e) })
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="w-full max-w-md bg-white/80 backdrop-blur-xl border border-white/20 shadow-2xl"
        showCloseButton={false}
      >
        <DialogHeader>
          <DialogTitle>Editar plano: {plano.nome_display}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label htmlFor="nome">Nome de exibição</Label>
            <Input
              id="nome"
              value={form.nome_display}
              onChange={(e) => setForm({ ...form, nome_display: e.target.value })}
              placeholder="Ex: Clínica Pro"
            />
          </div>

          <div>
            <Label htmlFor="preco">Preço mensal (R$)</Label>
            <Input
              id="preco"
              type="number"
              step="0.01"
              min="0"
              value={form.preco}
              onChange={(e) => setForm({ ...form, preco: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <LimitInput
              id="max_pac"
              label="Pacientes"
              value={form.max_pacientes}
              onChange={(v) => setForm({ ...form, max_pacientes: v })}
            />
            <LimitInput
              id="max_usr"
              label="Usuários"
              value={form.max_usuarios}
              onChange={(v) => setForm({ ...form, max_usuarios: v })}
            />
            <LimitInput
              id="max_tipos"
              label="Tipos de atendimento"
              value={form.max_tipos_atendimento}
              onChange={(v) => setForm({ ...form, max_tipos_atendimento: v })}
            />
            <LimitInput
              id="max_ia"
              label="Usos de IA / mês"
              value={form.max_ia_mes}
              onChange={(v) => setForm({ ...form, max_ia_mes: v })}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border px-4 py-3">
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

function LimitValue({ value }: { value: number | null }) {
  if (value === null) return <span className="flex items-center gap-1 font-medium"><Infinity className="h-3.5 w-3.5" /> Ilimitado</span>
  return <span className="font-medium">{value}</span>
}

export default function PlanosPage() {
  const { data: planos, isLoading } = useAdminPlanos()
  const [editando, setEditando] = useState<PlanoConfig | null>(null)

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center gap-3">
        <Settings2 className="h-6 w-6 text-cyan-600" />
        <h1 className="text-xl sm:text-2xl font-bold">Configuração de Planos</h1>
      </div>

      <Card className="border-amber-200 bg-amber-50/50">
        <CardContent className="p-3 sm:p-4 flex items-start gap-3">
          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs sm:text-sm text-amber-900">
            Alterações em preços e limites se aplicam imediatamente a todas as clínicas. O cache de métricas é invalidado automaticamente.
          </p>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6 h-48 bg-muted/30" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {planos?.map((p) => (
            <Card key={p.slug} className={!p.ativo ? 'opacity-60' : undefined}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-lg">{p.nome_display}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1 font-mono">{p.slug}</p>
                  </div>
                  {p.ativo ? (
                    <Badge variant="default" className="text-xs shrink-0">Ativo</Badge>
                  ) : (
                    <Badge variant="destructive" className="text-xs shrink-0">Inativo</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">Preço mensal</p>
                  <p className="text-2xl font-bold">
                    {p.preco === 0 ? 'Grátis' : `R$ ${p.preco.toFixed(2)}`}
                  </p>
                </div>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Pacientes</span>
                    <LimitValue value={p.max_pacientes} />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Usuários</span>
                    <LimitValue value={p.max_usuarios} />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Tipos atendimento</span>
                    <LimitValue value={p.max_tipos_atendimento} />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">IA / mês</span>
                    <LimitValue value={p.max_ia_mes} />
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setEditando(p)}
                >
                  <Edit3 className="h-4 w-4 mr-2" /> Editar
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {editando && <ModalEditarPlano plano={editando} onClose={() => setEditando(null)} />}
    </div>
  )
}
