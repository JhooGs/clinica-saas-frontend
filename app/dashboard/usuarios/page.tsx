'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Loader2, ShieldCheck, User as UserIcon, X } from 'lucide-react'
import { toast } from 'sonner'
import { apiFetch, MFARequiredError } from '@/lib/api'
import { ModalMFARequired } from '@/components/modal-mfa-required'
import { usePermissions } from '@/hooks/use-permissions'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type { Usuario, Role, Permissoes } from '@/types'
import { PageLoader } from '@/components/ui/page-loader'

const MODULOS: { key: keyof Permissoes; label: string }[] = [
  { key: 'pacientes', label: 'Pacientes' },
  { key: 'registros', label: 'Registros' },
  { key: 'agenda', label: 'Agenda' },
  { key: 'financeiro', label: 'Financeiro' },
  { key: 'relatorios', label: 'Relatórios' },
]

const PERMISSOES_DEFAULT: Record<Role, Permissoes> = {
  super_admin: { pacientes: true, registros: true, agenda: true, financeiro: true, relatorios: true },
  admin: { pacientes: true, registros: true, agenda: true, financeiro: true, relatorios: true },
  usuario: { pacientes: true, registros: true, agenda: true, financeiro: false, relatorios: false },
}

function roleBadge(role: Role) {
  if (role === 'super_admin') return <Badge className="bg-violet-100 text-violet-700 border-0">Super Admin</Badge>
  if (role === 'admin') return <Badge className="bg-blue-100 text-blue-700 border-0">Admin</Badge>
  return <Badge className="bg-gray-100 text-gray-600 border-0">Usuário</Badge>
}

function PermissoesForm({
  permissoes,
  onChange,
}: {
  permissoes: Permissoes
  onChange: (p: Permissoes) => void
}) {
  return (
    <div className="space-y-2">
      {MODULOS.map(({ key, label }) => (
        <div key={key} className="flex items-center justify-between rounded-lg border bg-white/60 px-3 py-2">
          <span className="text-sm font-medium text-gray-700">{label}</span>
          <Switch
            checked={permissoes[key]}
            onCheckedChange={(val) => onChange({ ...permissoes, [key]: val })}
          />
        </div>
      ))}
    </div>
  )
}

function ModalConvidar({ onFechar }: { onFechar: () => void }) {
  const queryClient = useQueryClient()
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'admin' | 'usuario'>('usuario')
  const [permissoes, setPermissoes] = useState<Permissoes>(PERMISSOES_DEFAULT.usuario)
  const [mfaAberto, setMfaAberto] = useState(false)
  const [ultimoPayload, setUltimoPayload] = useState<{ nome: string; email: string; role: Role; permissoes: Permissoes } | null>(null)

  function handleRoleChange(r: 'admin' | 'usuario') {
    setRole(r)
    setPermissoes(PERMISSOES_DEFAULT[r])
  }

  const convidar = useMutation({
    mutationFn: (payload: { nome: string; email: string; role: Role; permissoes: Permissoes }) =>
      apiFetch('/api/v1/usuarios/convidar', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      toast.success('Convite enviado', { description: `Convite enviado para ${email}.` })
      queryClient.invalidateQueries({ queryKey: ['usuarios'] })
      onFechar()
    },
    onError: (err: Error) => {
      if (err instanceof MFARequiredError) {
        setMfaAberto(true)
      } else if (err.message.startsWith('API error 409') || err.message.includes('409')) {
        toast.error('Usuário já cadastrado', {
          description: 'Este e-mail já possui uma conta no Clinitra.',
        })
      } else {
        toast.error('Erro ao enviar convite', { description: 'Tente novamente.' })
      }
    },
  })

  function salvar() {
    if (!nome.trim() || !email.trim()) {
      toast.error('Preencha nome e e-mail.')
      return
    }
    const payload = { nome: nome.trim(), email: email.trim(), role, permissoes }
    setUltimoPayload(payload)
    convidar.mutate(payload)
  }

  // Após elevar a sessão via MFA, reenvia o convite automaticamente
  function handleSessaoElevada() {
    if (ultimoPayload) convidar.mutate(ultimoPayload)
  }

  return (
    <>
    <Dialog open onOpenChange={(open) => !open && onFechar()}>
      <DialogContent
        className="w-full max-w-md bg-white/80 backdrop-blur-xl border border-white/20 shadow-2xl"
        showCloseButton={false}
      >
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base font-semibold">Convidar Usuário</DialogTitle>
            <button
              onClick={onFechar}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-gray-100 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </DialogHeader>

        <div className="space-y-3 pt-1">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Nome *</label>
            <input
              value={nome}
              onChange={e => setNome(e.target.value)}
              placeholder="Nome completo"
              className="w-full rounded-lg border bg-white/80 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#04c2fb]/40"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">E-mail *</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="usuario@clinica.com"
              className="w-full rounded-lg border bg-white/80 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#04c2fb]/40"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Perfil</label>
            <select
              value={role}
              onChange={e => handleRoleChange(e.target.value as 'admin' | 'usuario')}
              className="w-full rounded-lg border bg-white/80 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#04c2fb]/40"
            >
              <option value="admin">Admin</option>
              <option value="usuario">Usuário</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Permissoes de acesso</p>
            <PermissoesForm permissoes={permissoes} onChange={setPermissoes} />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
          <button
            onClick={onFechar}
            className="rounded-lg border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-gray-100 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={salvar}
            disabled={convidar.isPending}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors hover:brightness-110 disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #0094c8 0%, #04c2fb 60%, #00d5f5 100%)' }}
          >
            {convidar.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
            Enviar convite
          </button>
        </div>
      </DialogContent>
    </Dialog>

    {/* Modal MFA — exibido quando o backend exige AAL2 para convidar */}
    <ModalMFARequired
      open={mfaAberto}
      onClose={() => setMfaAberto(false)}
      onSessaoElevada={handleSessaoElevada}
    />
    </>
  )
}

function ModalPermissoes({ usuario, onFechar }: { usuario: Usuario; onFechar: () => void }) {
  const queryClient = useQueryClient()
  const { isSuperAdmin } = usePermissions()

  const [permissoes, setPermissoes] = useState<Permissoes>(
    usuario.permissoes ?? PERMISSOES_DEFAULT[usuario.role]
  )
  const [roleEdit, setRoleEdit] = useState<Role>(usuario.role)
  const [ativo, setAtivo] = useState(usuario.ativo)

  const atualizar = useMutation({
    mutationFn: (payload: Partial<{ role: Role; ativo: boolean; permissoes: Permissoes }>) =>
      apiFetch(`/api/v1/usuarios/${usuario.id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      toast.success('Permissoes atualizadas', { description: `Alterações salvas para ${usuario.nome}.` })
      queryClient.invalidateQueries({ queryKey: ['usuarios'] })
      onFechar()
    },
    onError: () => {
      toast.error('Erro ao salvar permissoes', { description: 'Tente novamente.' })
    },
  })

  function salvar() {
    const payload: Partial<{ role: Role; ativo: boolean; permissoes: Permissoes }> = {
      permissoes,
    }
    if (isSuperAdmin) {
      payload.role = roleEdit
      payload.ativo = ativo
    }
    atualizar.mutate(payload)
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onFechar()}>
      <DialogContent
        className="w-full max-w-md bg-white/80 backdrop-blur-xl border border-white/20 shadow-2xl"
        showCloseButton={false}
      >
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base font-semibold">
              Permissoes de {usuario.nome}
            </DialogTitle>
            <button
              onClick={onFechar}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-gray-100 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </DialogHeader>

        <div className="space-y-3 pt-1">
          {isSuperAdmin && (
            <>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Perfil</label>
                <select
                  value={roleEdit}
                  onChange={e => setRoleEdit(e.target.value as Role)}
                  className="w-full rounded-lg border bg-white/80 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#04c2fb]/40"
                >
                  <option value="super_admin">Super Admin</option>
                  <option value="admin">Admin</option>
                  <option value="usuario">Usuário</option>
                </select>
              </div>
              <div className="flex items-center justify-between rounded-lg border bg-white/60 px-3 py-2">
                <span className="text-sm font-medium text-gray-700">Conta ativa</span>
                <Switch checked={ativo} onCheckedChange={setAtivo} />
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Acesso aos modulos</p>
            <PermissoesForm permissoes={permissoes} onChange={setPermissoes} />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
          <button
            onClick={onFechar}
            className="rounded-lg border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-gray-100 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={salvar}
            disabled={atualizar.isPending}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors hover:brightness-110 disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #0094c8 0%, #04c2fb 60%, #00d5f5 100%)' }}
          >
            {atualizar.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
            Salvar
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function UsuariosPage() {
  const { isSuperAdmin, isAdmin, isLoading: permLoading } = usePermissions()
  const [modalConvidar, setModalConvidar] = useState(false)
  const [usuarioSelecionado, setUsuarioSelecionado] = useState<Usuario | null>(null)

  const { data: usuarios = [], isLoading } = useQuery<Usuario[]>({
    queryKey: ['usuarios'],
    queryFn: () => apiFetch<Usuario[]>('/api/v1/usuarios'),
  })

  if (permLoading) {
    return <PageLoader />
  }

  if (!isSuperAdmin && !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <ShieldCheck className="h-10 w-10 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">Sem permissao para acessar esta pagina.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {modalConvidar && <ModalConvidar onFechar={() => setModalConvidar(false)} />}
      {usuarioSelecionado && (
        <ModalPermissoes usuario={usuarioSelecionado} onFechar={() => setUsuarioSelecionado(null)} />
      )}

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Usuarios da Clinica</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gerencie o acesso da equipe ao sistema</p>
        </div>
        <button
          onClick={() => setModalConvidar(true)}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors hover:brightness-110"
          style={{ background: 'linear-gradient(135deg, #0094c8 0%, #04c2fb 60%, #00d5f5 100%)' }}
        >
          <Plus className="h-4 w-4" />
          Convidar Usuario
        </button>
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="px-4 py-3 text-xs font-semibold text-muted-foreground">Nome</TableHead>
                <TableHead className="px-4 py-3 text-xs font-semibold text-muted-foreground">E-mail</TableHead>
                <TableHead className="px-4 py-3 text-xs font-semibold text-muted-foreground">Perfil</TableHead>
                <TableHead className="px-4 py-3 text-xs font-semibold text-muted-foreground">Status</TableHead>
                <TableHead className="px-4 py-3 text-xs font-semibold text-muted-foreground text-right">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={5} className="px-4">
                    <PageLoader compact />
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && usuarios.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    Nenhum usuario encontrado.
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && usuarios.map((u) => (
                <TableRow key={u.id} className="hover:bg-muted/20 transition-colors">
                  <TableCell className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#04c2fb]/10 text-[#04c2fb]">
                        <UserIcon className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-medium text-gray-800">{u.nome}</span>
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-muted-foreground">{u.email}</TableCell>
                  <TableCell className="px-4 py-3">{roleBadge(u.role)}</TableCell>
                  <TableCell className="px-4 py-3">
                    <span className={cn(
                      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
                      u.ativo ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                    )}>
                      <span className={cn('h-1.5 w-1.5 rounded-full', u.ativo ? 'bg-green-500' : 'bg-gray-400')} />
                      {u.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-right">
                    {u.role !== 'super_admin' && (
                      <button
                        onClick={() => setUsuarioSelecionado(u)}
                        className="rounded-lg border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
                      >
                        Permissoes
                      </button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
