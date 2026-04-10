'use client'

import { useState } from 'react'
import { Edit3, Settings2, AlertCircle } from 'lucide-react'
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
  max_pacientes: string  // string vazia = ilimitado
  max_usuarios: string
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
    nome_display: plano.nome_display,
    preco: String(plano.preco),
    max_pacientes: plano.max_pacientes?.toString() ?? '',
    max_usuarios: plano.max_usuarios?.toString() ?? '',
  })

  async function handleSalvar() {
    const preco = parseFloat(form.preco)
    if (isNaN(preco) || preco < 0) {
      toast.error('Preco invalido', { description: 'Informe um valor numerico maior ou igual a zero.' })
      return
    }

    const max_pacientes = form.max_pacientes === '' ? null : parseInt(form.max_pacientes, 10)
    const max_usuarios = form.max_usuarios === '' ? null : parseInt(form.max_usuarios, 10)

    if (max_pacientes !== null && (isNaN(max_pacientes) || max_pacientes < 0)) {
      toast.error('Limite de pacientes invalido')
      return
    }
    if (max_usuarios !== null && (isNaN(max_usuarios) || max_usuarios < 0)) {
      toast.error('Limite de usuarios invalido')
      return
    }

    try {
      await atualizar.mutateAsync({
        slug: plano.slug,
        body: {
          nome_display: form.nome_display,
          preco,
          max_pacientes,
          max_usuarios,
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
          <DialogTitle>Editar plano: {plano.slug}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label htmlFor="nome">Nome de exibicao</Label>
            <Input
              id="nome"
              value={form.nome_display}
              onChange={(e) => setForm({ ...form, nome_display: e.target.value })}
              placeholder="Ex: Profissional"
            />
          </div>

          <div>
            <Label htmlFor="preco">Preco mensal (R$)</Label>
            <Input
              id="preco"
              type="number"
              step="0.01"
              min="0"
              value={form.preco}
              onChange={(e) => setForm({ ...form, preco: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="max_pac">Max pacientes (vazio = ilimitado)</Label>
            <Input
              id="max_pac"
              type="number"
              min="0"
              value={form.max_pacientes}
              onChange={(e) => setForm({ ...form, max_pacientes: e.target.value })}
              placeholder="Ilimitado"
            />
          </div>

          <div>
            <Label htmlFor="max_usr">Max usuarios (vazio = ilimitado)</Label>
            <Input
              id="max_usr"
              type="number"
              min="0"
              value={form.max_usuarios}
              onChange={(e) => setForm({ ...form, max_usuarios: e.target.value })}
              placeholder="Ilimitado"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSalvar} disabled={atualizar.isPending}>
            {atualizar.isPending ? 'Salvando...' : 'Salvar alteracoes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function PlanosPage() {
  const { data: planos, isLoading } = useAdminPlanos()
  const [editando, setEditando] = useState<PlanoConfig | null>(null)

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center gap-3">
        <Settings2 className="h-6 w-6 text-cyan-600" />
        <h1 className="text-xl sm:text-2xl font-bold">Configuracao de Planos</h1>
      </div>

      <Card className="border-amber-200 bg-amber-50/50">
        <CardContent className="p-3 sm:p-4 flex items-start gap-3">
          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs sm:text-sm text-amber-900">
            Alteracoes em precos e limites se aplicam imediatamente a todas as clinicas. O cache de metricas e invalidado automaticamente.
          </p>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6 h-40 bg-muted/30" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {planos?.map((p) => (
            <Card key={p.slug}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-lg">{p.nome_display}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1 font-mono">{p.slug}</p>
                  </div>
                  {p.ativo ? (
                    <Badge variant="default" className="text-xs">Ativo</Badge>
                  ) : (
                    <Badge variant="destructive" className="text-xs">Inativo</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">Preco mensal</p>
                  <p className="text-2xl font-bold">
                    {p.preco === 0 ? 'Gratis' : `R$ ${p.preco.toFixed(2)}`}
                  </p>
                </div>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Max pacientes</span>
                    <span className="font-medium">{p.max_pacientes ?? 'Ilimitado'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Max usuarios</span>
                    <span className="font-medium">{p.max_usuarios ?? 'Ilimitado'}</span>
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
