'use client'

import { useState, useMemo } from 'react'
import type { DateRange } from 'react-day-picker'
import { TrendingUp, TrendingDown, Clock, Plus, X } from 'lucide-react'
import { cn, hoje } from '@/lib/utils'
import { ConfirmDiscard } from '@/components/confirm-discard'
import { ModalPortal } from '@/components/modal-portal'
import { DatePicker } from '@/components/ui/date-picker'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import { toast } from 'sonner'

type Tipo = 'receita' | 'despesa'
type Status = 'pago' | 'pendente'

type Transacao = {
  id: number
  data: string
  descricao: string
  tipo: Tipo
  valor: number
  status: Status
}

const transacoesIniciais: Transacao[] = [
  { id: 1, data: '03/03/2026', descricao: 'Sessão - Bernardo',         tipo: 'receita', valor: 120.00, status: 'pago'     },
  { id: 2, data: '05/03/2026', descricao: 'Sessão - Angelo',           tipo: 'receita', valor: 100.00, status: 'pago'     },
  { id: 3, data: '07/03/2026', descricao: 'Sessão - Lorenzo',          tipo: 'receita', valor: 150.00, status: 'pago'     },
  { id: 4, data: '10/03/2026', descricao: 'Aluguel da sala',           tipo: 'despesa', valor: 800.00, status: 'pago'     },
  { id: 5, data: '12/03/2026', descricao: 'Sessão - Pietro',           tipo: 'receita', valor: 150.00, status: 'pendente' },
  { id: 6, data: '14/03/2026', descricao: 'Sessão - Isadora',          tipo: 'receita', valor: 160.00, status: 'pendente' },
  { id: 7, data: '15/03/2026', descricao: 'Material terapêutico',      tipo: 'despesa', valor: 250.00, status: 'pendente' },
  { id: 8, data: '17/03/2026', descricao: 'Sessão - Moysés',           tipo: 'receita', valor: 160.00, status: 'pendente' },
]

function formInicial() {
  return {
    tipo: 'receita' as Tipo,
    descricao: '',
    valor: '',
    dataVencimento: hoje(),
    status: 'pendente' as Status,
  }
}

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function ModalNovaTransacao({
  onSalvar,
  onFechar,
}: {
  onSalvar: (f: ReturnType<typeof formInicial>) => void
  onFechar: () => void
}) {
  const [form, setForm] = useState(formInicial)
  const [confirmarSair, setConfirmarSair] = useState(false)
  function f(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const temDados = form.descricao !== '' || form.valor !== '' || form.dataVencimento !== ''

  function tentarFechar() {
    if (temDados) setConfirmarSair(true)
    else onFechar()
  }

  return (
    <ModalPortal>
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
    >
      {confirmarSair && (
        <ConfirmDiscard
          onConfirmar={onFechar}
          onCancelar={() => setConfirmarSair(false)}
        />
      )}
      <div
        className="w-full max-w-lg rounded-2xl border border-white/30 shadow-2xl"
        style={{ backdropFilter: 'blur(20px)', backgroundColor: 'rgba(255,255,255,0.92)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold tracking-tight">Nova Transação</h2>
          <button
            onClick={tentarFechar}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-gray-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Tipo *</label>
            <select
              value={form.tipo}
              onChange={e => f('tipo', e.target.value)}
              className="w-full rounded-lg border bg-white/80 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#04c2fb]/40"
            >
              <option value="receita">Receita (Entrada)</option>
              <option value="despesa">Despesa (Saída)</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Descrição *</label>
            <input
              value={form.descricao}
              onChange={e => f('descricao', e.target.value)}
              placeholder="Ex: Sessão - Nome do paciente"
              className="w-full rounded-lg border bg-white/80 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#04c2fb]/40"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Valor (R$) *</label>
              <input
                value={form.valor}
                onChange={e => f('valor', e.target.value)}
                placeholder="0,00"
                className="w-full rounded-lg border bg-white/80 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#04c2fb]/40"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Data</label>
              <DatePicker
                value={form.dataVencimento}
                onChange={v => f('dataVencimento', v)}
                placeholder="Selecionar data"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Status</label>
            <select
              value={form.status}
              onChange={e => f('status', e.target.value)}
              className="w-full rounded-lg border bg-white/80 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#04c2fb]/40"
            >
              <option value="pendente">Pendente</option>
              <option value="pago">Pago</option>
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
          <button
            onClick={tentarFechar}
            className="rounded-lg border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-gray-100 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => { if (form.descricao.trim() && form.valor) onSalvar(form) }}
            className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors hover:brightness-110"
            style={{ background: 'linear-gradient(135deg, #0094c8 0%, #04c2fb 60%, #00d5f5 100%)' }}
          >
            Salvar Transação
          </button>
        </div>
      </div>
    </div>
    </ModalPortal>
  )
}

export default function FinanceiroPage() {
  const [transacoes, setTransacoes] = useState<Transacao[]>(transacoesIniciais)
  const [abrirModal, setAbrirModal] = useState(false)
  const [filtroTipo, setFiltroTipo] = useState<'todos' | Tipo>('todos')
  const [filtroPeriodo, setFiltroPeriodo] = useState<DateRange | undefined>(undefined)

  const resumo = useMemo(() => {
    const receitaMes = transacoes.filter(t => t.tipo === 'receita').reduce((s, t) => s + t.valor, 0)
    const despesaMes = transacoes.filter(t => t.tipo === 'despesa').reduce((s, t) => s + t.valor, 0)
    const aReceber   = transacoes.filter(t => t.tipo === 'receita' && t.status === 'pendente').reduce((s, t) => s + t.valor, 0)
    return { receitaMes, despesaMes, aReceber }
  }, [transacoes])

  // Converte DD/MM/YYYY → Date para comparação com o range
  function parseDateBR(br: string): Date | null {
    if (!br) return null
    const [d, m, y] = br.split('/')
    return new Date(Number(y), Number(m) - 1, Number(d))
  }

  const filtroInicio = filtroPeriodo?.from
  const filtroFim    = filtroPeriodo?.to

  const lista = transacoes.filter(t => {
    if (filtroTipo !== 'todos' && t.tipo !== filtroTipo) return false
    if (filtroInicio || filtroFim) {
      const dt = parseDateBR(t.data)
      if (!dt) return true
      if (filtroInicio && dt < filtroInicio) return false
      if (filtroFim   && dt > filtroFim)    return false
    }
    return true
  })

  function salvar(form: ReturnType<typeof formInicial>) {
    const nova: Transacao = {
      id: Date.now(),
      data: form.dataVencimento
        ? new Date(form.dataVencimento).toLocaleDateString('pt-BR')
        : new Date().toLocaleDateString('pt-BR'),
      descricao: form.descricao,
      tipo: form.tipo,
      valor: parseFloat(form.valor.replace(',', '.')),
      status: form.status,
    }
    setTransacoes(prev => [nova, ...prev])
    setAbrirModal(false)
    toast.success('Transação registrada', {
      description: `${nova.tipo === 'receita' ? 'Entrada' : 'Saída'} de ${formatBRL(nova.valor)} adicionada.`,
    })
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {abrirModal && <ModalNovaTransacao onSalvar={salvar} onFechar={() => setAbrirModal(false)} />}

      {/* Cabeçalho */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Financeiro</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gerencie as entradas e saídas da clínica</p>
        </div>
        <button
          onClick={() => setAbrirModal(true)}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors hover:brightness-110"
          style={{ background: 'linear-gradient(135deg, #0094c8 0%, #04c2fb 60%, #00d5f5 100%)' }}
        >
          <Plus className="h-4 w-4" />
          Nova Transação
        </button>
      </div>

      {/* Cards resumo */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Receita do Mês</p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-emerald-600">{formatBRL(resumo.receitaMes)}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">total de entradas</p>
            </div>
            <div className="rounded-lg p-2.5 bg-emerald-500/10">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Despesa do Mês</p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-red-500">{formatBRL(resumo.despesaMes)}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">total de saídas</p>
            </div>
            <div className="rounded-lg p-2.5 bg-red-500/10">
              <TrendingDown className="h-4 w-4 text-red-500" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">A Receber</p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-amber-600">{formatBRL(resumo.aReceber)}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">receitas pendentes</p>
            </div>
            <div className="rounded-lg p-2.5 bg-amber-500/10">
              <Clock className="h-4 w-4 text-amber-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <DateRangePicker
          value={filtroPeriodo}
          onChange={setFiltroPeriodo}
          placeholder="Filtrar por período"
        />
        <div className="flex items-center gap-2">
          {(['todos', 'receita', 'despesa'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFiltroTipo(f)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                filtroTipo === f
                  ? 'text-white'
                  : 'border bg-background text-muted-foreground hover:bg-muted'
              )}
              style={filtroTipo === f ? { background: 'linear-gradient(135deg, #0094c8 0%, #04c2fb 60%, #00d5f5 100%)' } : undefined}
            >
              {f === 'todos' ? 'Todos' : f === 'receita' ? 'Receitas' : 'Despesas'}
            </button>
          ))}
        </div>
        {(filtroPeriodo?.from || filtroTipo !== 'todos') && (
          <button
            onClick={() => { setFiltroPeriodo(undefined); setFiltroTipo('todos') }}
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            Limpar filtros
          </button>
        )}
        <span className="ml-auto text-xs text-muted-foreground">{lista.length} registro(s)</span>
      </div>

      {/* Tabela */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Data</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Descrição</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Tipo</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Valor</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {lista.map(t => (
                <tr key={t.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground">{t.data}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{t.descricao}</td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
                      t.tipo === 'receita' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                    )}>
                      {t.tipo === 'receita' ? '↑ Entrada' : '↓ Saída'}
                    </span>
                  </td>
                  <td className={cn(
                    'px-4 py-3 text-right font-semibold',
                    t.tipo === 'receita' ? 'text-emerald-600' : 'text-red-500'
                  )}>
                    {t.tipo === 'despesa' && '− '}{formatBRL(t.valor)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
                      t.status === 'pago' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                    )}>
                      <span className={cn('h-1.5 w-1.5 rounded-full', t.status === 'pago' ? 'bg-green-500' : 'bg-amber-500')} />
                      {t.status === 'pago' ? 'Pago' : 'Pendente'}
                    </span>
                  </td>
                </tr>
              ))}
              {lista.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    Nenhuma transação encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
