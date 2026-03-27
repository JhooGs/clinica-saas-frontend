'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import {
  Lock, Plus, Pencil, Trash2, Save, X, Tag, Info,
  AlertTriangle, ArrowUpDown, ArrowUp, ArrowDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

/* ── Types ────────────────────────────────────────── */

type TipoCustomizado = {
  id: string
  nome: string
}

type ModalMode = 'criar' | 'editar'

/* ── Constants ────────────────────────────────────── */

const TIPOS_SISTEMA = [
  'Sessão',
  'Sessão família',
  'Sessão em grupo',
  'Anamnese',
  'Devolutiva família',
  'Reunião com a escola',
  'Reunião multidisciplinar',
]

const MOCK_CUSTOM: TipoCustomizado[] = [
  { id: 'c1', nome: 'Orientação parental' },
]

/* ── Modal glassmorphism criar/editar ─────────────── */

function ModalTipo({
  modo,
  inicial,
  nomesExistentes,
  onSalvar,
  onFechar,
}: {
  modo: ModalMode
  inicial?: TipoCustomizado
  nomesExistentes: string[]
  onSalvar: (dados: Omit<TipoCustomizado, 'id'>) => void
  onFechar: () => void
}) {
  const [nome, setNome] = useState(inicial?.nome ?? '')
  const [erroNome, setErroNome] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 60)
    return () => clearTimeout(t)
  }, [])

  function salvar() {
    const nomeTrim = nome.trim()
    if (!nomeTrim) { setErroNome('Nome obrigatório.'); return }
    const isDup = nomesExistentes.some(n => n.toLowerCase() === nomeTrim.toLowerCase())
    if (isDup && nomeTrim.toLowerCase() !== (inicial?.nome ?? '').toLowerCase()) {
      setErroNome('Já existe um tipo com esse nome.'); return
    }
    onSalvar({ nome: nomeTrim })
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter') salvar()
    if (e.key === 'Escape') onFechar()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backdropFilter: 'blur(5px)', background: 'rgba(0,0,0,0.22)' }}
      onClick={e => { if (e.target === e.currentTarget) onFechar() }}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-white/60 shadow-2xl"
        style={{ background: 'rgba(255,255,255,0.93)', backdropFilter: 'blur(24px)' }}
        onKeyDown={handleKey}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm"
              style={{ background: 'linear-gradient(135deg, #0094c8 0%, #04c2fb 60%, #00d5f5 100%)' }}
            >
              <Tag className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">
                {modo === 'criar' ? 'Novo tipo de sessão' : 'Editar tipo de sessão'}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {modo === 'criar' ? 'Defina o nome do tipo' : 'Altere o nome do tipo'}
              </p>
            </div>
          </div>
          <button
            onClick={onFechar}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-gray-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Nome */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Nome <span className="text-red-400 font-normal normal-case">(obrigatório)</span>
            </label>
            <input
              ref={inputRef}
              value={nome}
              onChange={e => { setNome(e.target.value); setErroNome('') }}
              placeholder="Ex: Terapia ocupacional"
              className={cn(
                'w-full rounded-xl border px-4 py-2.5 text-sm bg-white/70 focus:outline-none focus:ring-2 transition-all',
                erroNome
                  ? 'border-red-300 focus:ring-red-200'
                  : 'border-gray-200 focus:ring-[#04c2fb]/30 focus:border-[#04c2fb]/60',
              )}
            />
            {erroNome && (
              <p className="flex items-center gap-1.5 text-xs text-red-500">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {erroNome}
              </p>
            )}
          </div>

          {modo === 'editar' && (
            <div className="flex items-start gap-2.5 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 leading-relaxed">
                Alterações afetam apenas novos registros. Sessões já registradas com este tipo não são recalculadas.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 px-6 pb-6">
          <button
            onClick={onFechar}
            className="rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-gray-100 transition-colors border border-gray-200"
          >
            Cancelar
          </button>
          <button
            onClick={salvar}
            className="flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-110 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #0094c8 0%, #04c2fb 60%, #00d5f5 100%)' }}
          >
            <Save className="h-4 w-4" />
            {modo === 'criar' ? 'Criar tipo' : 'Salvar alterações'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Modal confirmar exclusão ─────────────────────── */

function ModalExclusao({
  tipo,
  onConfirmar,
  onCancelar,
}: {
  tipo: TipoCustomizado
  onConfirmar: () => void
  onCancelar: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backdropFilter: 'blur(5px)', background: 'rgba(0,0,0,0.22)' }}
      onClick={e => { if (e.target === e.currentTarget) onCancelar() }}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-white/60 shadow-2xl"
        style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(24px)' }}
      >
        <div className="px-6 pt-6 pb-6 space-y-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 border border-red-100">
              <Trash2 className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">Remover tipo de sessão</h2>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                Tem certeza que deseja remover{' '}
                <span className="font-semibold text-gray-800">"{tipo.nome}"</span>?
                Ele deixará de aparecer nas opções de novos registros e planos.
              </p>
              <p className="text-xs text-muted-foreground mt-2 flex items-start gap-1.5">
                <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-slate-400" />
                Sessões já registradas com este tipo não são afetadas.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 justify-end">
            <button
              onClick={onCancelar}
              className="rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-gray-100 transition-colors border border-gray-200"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirmar}
              className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" /> Remover
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Page ─────────────────────────────────────────── */

export default function TiposSessaoPage() {
  const [personalizados, setPersonalizados] = useState<TipoCustomizado[]>(MOCK_CUSTOM)
  const [modal, setModal] = useState<{ modo: ModalMode; tipo?: TipoCustomizado } | null>(null)
  const [excluindo, setExcluindo] = useState<TipoCustomizado | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const nomesExistentes = [
    ...TIPOS_SISTEMA,
    ...personalizados.map(t => t.nome),
  ]

  const listaOrdenada = useMemo(() =>
    [...personalizados].sort((a, b) => {
      const cmp = a.nome.localeCompare(b.nome, 'pt-BR')
      return sortDir === 'asc' ? cmp : -cmp
    }),
  [personalizados, sortDir])

  function criarTipo(dados: Omit<TipoCustomizado, 'id'>) {
    const novo: TipoCustomizado = { id: `c${Date.now()}`, ...dados }
    setPersonalizados(prev => [...prev, novo])
    setModal(null)
    toast.success('Tipo criado', { description: `"${dados.nome}" está disponível no plano dos pacientes.` })
  }

  function salvarEdicao(dados: Omit<TipoCustomizado, 'id'>) {
    const id = modal?.tipo?.id
    if (!id) return
    setPersonalizados(prev => prev.map(t => t.id === id ? { ...t, ...dados } : t))
    setModal(null)
    toast.success('Tipo atualizado', { description: `"${dados.nome}" foi salvo.` })
  }

  function confirmarExclusao() {
    if (!excluindo) return
    const nome = excluindo.nome
    setPersonalizados(prev => prev.filter(t => t.id !== excluindo.id))
    setExcluindo(null)
    toast.success('Tipo removido', { description: `"${nome}" foi removido da lista.` })
  }

  return (
    <div className="space-y-7">

      {/* Modais */}
      {modal && (
        <ModalTipo
          modo={modal.modo}
          inicial={modal.tipo}
          nomesExistentes={nomesExistentes}
          onSalvar={modal.modo === 'criar' ? criarTipo : salvarEdicao}
          onFechar={() => setModal(null)}
        />
      )}
      {excluindo && (
        <ModalExclusao
          tipo={excluindo}
          onConfirmar={confirmarExclusao}
          onCancelar={() => setExcluindo(null)}
        />
      )}

      {/* Cabeçalho */}
      <div>
        <div className="flex items-center gap-2.5 mb-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#04c2fb]/10">
            <Tag className="h-4 w-4 text-[#04c2fb]" />
          </div>
          <h2 className="text-base font-bold text-slate-800">Tipos de Sessão</h2>
        </div>
        <p className="text-sm text-muted-foreground pl-px">
          Gerencie os tipos disponíveis para registro de sessões e configuração de planos dos pacientes.
        </p>
      </div>

      {/* ── Seção: Tipos do sistema ────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-700">Tipos do sistema</h3>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
            {TIPOS_SISTEMA.length}
          </span>
        </div>

        <div className="rounded-xl border bg-slate-50/60 p-4 space-y-4">
          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <Lock className="h-3.5 w-3.5 shrink-0 mt-0.5 text-slate-400" />
            Sessões nativas do Clinitra. Disponíveis automaticamente para todos os pacientes e não podem ser removidos.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {TIPOS_SISTEMA.map(tipo => (
              <div
                key={tipo}
                className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 shadow-sm"
              >
                <Lock className="h-3 w-3 text-slate-300 shrink-0" />
                <span className="text-sm font-medium text-slate-700">{tipo}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Seção: Tipos personalizados ───────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-700">Tipos personalizados</h3>
            {personalizados.length > 0 && (
              <span className="rounded-full bg-[#04c2fb]/10 px-2 py-0.5 text-[11px] font-medium text-[#04c2fb]">
                {personalizados.length}
              </span>
            )}
          </div>
          <button
            onClick={() => setModal({ modo: 'criar' })}
            className="flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:brightness-110 active:scale-95 shrink-0"
            style={{ background: 'linear-gradient(135deg, #0094c8 0%, #04c2fb 60%, #00d5f5 100%)' }}
          >
            <Plus className="h-3.5 w-3.5" /> Novo tipo
          </button>
        </div>

        {personalizados.length === 0 ? (
          /* Empty state */
          <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/40 flex flex-col items-center text-center gap-3 px-6 py-14">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#04c2fb]/10">
              <Tag className="h-7 w-7 text-[#04c2fb]/60" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-700">Nenhum tipo personalizado</p>
              <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                Crie tipos customizados para necessidades específicas da sua clínica.
                Eles aparecem no plano de cada paciente e no formulário de registro de sessão.
              </p>
            </div>
            <button
              onClick={() => setModal({ modo: 'criar' })}
              className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold text-white mt-1 shadow-sm transition-all hover:brightness-110 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #0094c8 0%, #04c2fb 60%, #00d5f5 100%)' }}
            >
              <Plus className="h-3.5 w-3.5" /> Criar primeiro tipo
            </button>
          </div>
        ) : (
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            {/* Cabeçalho da tabela */}
            <div className="grid grid-cols-[1fr_auto] items-center gap-4 px-5 py-2.5 bg-muted/40 border-b">
              <button
                onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors"
              >
                Nome
                {sortDir === 'asc'
                  ? <ArrowUp className="h-3 w-3 text-[#04c2fb]" />
                  : <ArrowDown className="h-3 w-3 text-[#04c2fb]" />}
              </button>
              <span className="w-16" />
            </div>

            {/* Linhas */}
            <div className="divide-y">
              {listaOrdenada.map(tipo => (
                <div
                  key={tipo.id}
                  className="grid grid-cols-[1fr_auto] items-center gap-4 px-5 py-4 hover:bg-muted/20 transition-colors group"
                >
                  {/* Nome */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="h-2 w-2 rounded-full bg-[#04c2fb] shrink-0" />
                    <span className="text-sm font-medium text-gray-800 truncate">{tipo.nome}</span>
                  </div>

                  {/* Ações */}
                  <div className={cn(
                    'flex items-center gap-0.5 w-16 justify-end transition-opacity',
                    'opacity-0 group-hover:opacity-100 focus-within:opacity-100',
                  )}>
                    <button
                      onClick={() => setModal({ modo: 'editar', tipo })}
                      title="Editar"
                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-[#04c2fb]/10 hover:text-[#04c2fb] transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setExcluindo(tipo)}
                      title="Remover"
                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer da tabela */}
            <div className="px-5 py-3 border-t bg-muted/20 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {personalizados.length} tipo{personalizados.length !== 1 ? 's' : ''} personalizado{personalizados.length !== 1 ? 's' : ''}
              </span>
              <button
                onClick={() => setModal({ modo: 'criar' })}
                className="flex items-center gap-1 text-xs font-medium text-[#04c2fb] hover:text-[#04c2fb]/80 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" /> Adicionar
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Nota informativa */}
      <div className="rounded-xl bg-[#04c2fb]/5 border border-[#04c2fb]/20 px-4 py-3.5 flex items-start gap-3">
        <Info className="h-4 w-4 text-[#04c2fb] shrink-0 mt-0.5" />
        <p className="text-xs text-slate-600 leading-relaxed">
          Todos os tipos de sessões nativas e personalizadas aparecem nas opções do{' '}
          <strong className="text-slate-700">Plano do Paciente</strong> e no{' '}
          <strong className="text-slate-700">formulário de registro de sessão</strong>.
          Ao remover um tipo personalizado, sessões já registradas com aquele tipo não são afetadas.
        </p>
      </div>

    </div>
  )
}
