'use client'

import { useState, useRef, useEffect } from 'react'
import {
  DollarSign, TrendingDown, TrendingUp, Wallet, Plus, RefreshCw, Pencil,
  Trash2, ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight,
  ToggleLeft, ToggleRight, Receipt, Calendar, Loader2, CheckCircle, Clock,
  User, ArrowUpRight,
} from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  useAdminLancamentos,
  useAdminCriarLancamento,
  useAdminAtualizarLancamento,
  useAdminExcluirLancamento,
  useAdminAssinaturas,
  useAdminCriarAssinatura,
  useAdminAtualizarAssinatura,
  useAdminSincronizarAssinatura,
  type LancamentosFilter,
  type CriarLancamentoPayload,
  type CriarAssinaturaPayload,
  type AtualizarAssinaturaPayload,
} from '@/hooks/use-admin-financeiro'
import type { ClinitraAssinatura, ClinitraFinanceiro } from '@/types'
import { cn } from '@/lib/utils'
import { hojeISO } from '@/lib/timezone'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

function fmtMes(ym: string) {
  const [ano, mes] = ym.split('-')
  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  return `${meses[parseInt(mes) - 1]} ${ano}`
}

function fmtDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR')
}

function mesAtual() {
  const hoje = new Date()
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`
}

const CATEGORIAS_DESPESA = [
  { value: 'infraestrutura', label: 'Infraestrutura' },
  { value: 'ferramentas',    label: 'Ferramentas' },
  { value: 'marketing',      label: 'Marketing' },
  { value: 'pessoal',        label: 'Pessoal' },
  { value: 'impostos',       label: 'Impostos' },
  { value: 'outros',         label: 'Outros' },
]

const CATEGORIAS_RECEITA = [
  { value: 'assinaturas', label: 'Assinaturas' },
  { value: 'consultoria', label: 'Consultoria' },
  { value: 'outros',      label: 'Outros' },
]

function categoriasParaTipo(tipo: 'receita' | 'despesa') {
  return tipo === 'despesa' ? CATEGORIAS_DESPESA : CATEGORIAS_RECEITA
}

function labelCategoria(cat: string) {
  return [...CATEGORIAS_DESPESA, ...CATEGORIAS_RECEITA].find((c) => c.value === cat)?.label ?? cat
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string; border: string }> = {
  pendente:  { label: 'Pendente',  bg: 'bg-amber-50',  text: 'text-amber-700', dot: 'bg-amber-400', border: 'border-amber-200' },
  pago:      { label: 'Pago',      bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', border: 'border-emerald-200' },
  atrasado:  { label: 'Atrasado',  bg: 'bg-red-50',    text: 'text-red-600',   dot: 'bg-red-500',   border: 'border-red-200' },
  cancelado: { label: 'Cancelado', bg: 'bg-gray-50',   text: 'text-gray-500',  dot: 'bg-gray-300',  border: 'border-gray-200' },
}

function StatusBadge({ status, size = 'sm' }: { status: string; size?: 'sm' | 'md' }) {
  const conf = STATUS_CONFIG[status] ?? STATUS_CONFIG.pendente
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-full border font-medium whitespace-nowrap',
      size === 'md' ? 'px-2.5 py-1 text-xs' : 'px-2 py-0.5 text-[11px]',
      conf.bg, conf.text, conf.border,
    )}>
      <span className={cn('rounded-full shrink-0', size === 'md' ? 'w-1.5 h-1.5' : 'w-1.5 h-1.5', conf.dot)} />
      {conf.label}
    </span>
  )
}

function parseMoeda(v: string): number {
  return parseFloat(v.replace(/\./g, '').replace(',', '.')) || 0
}

function SortIcon({ col, sortCol, sortDir }: { col: string; sortCol: string | null; sortDir: 'asc' | 'desc' }) {
  if (sortCol !== col) return <ChevronsUpDown className="h-3 w-3 text-muted-foreground/40" />
  return sortDir === 'asc' ? <ChevronUp className="h-3 w-3 text-[#04c2fb]" /> : <ChevronDown className="h-3 w-3 text-[#04c2fb]" />
}

function formatMoedaInput(v: string): string {
  const nums = v.replace(/\D/g, '')
  if (!nums) return ''
  const cents = parseInt(nums, 10)
  return (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ── Seletor de mês ───────────────────────────────────────────────────────────

const MESES_CURTOS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const MESES_LONGOS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

function AdminMesPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const hoje = new Date()
  const anoHoje = hoje.getFullYear()
  const mesHoje = hoje.getMonth() // 0-indexed

  const anoVal = value ? parseInt(value.slice(0, 4)) : anoHoje
  const mesVal = value ? parseInt(value.slice(5, 7)) - 1 : mesHoje

  const [open, setOpen] = useState(false)
  const [anoLocal, setAnoLocal] = useState(anoVal)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleFora(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleFora)
    return () => document.removeEventListener('mousedown', handleFora)
  }, [])

  function abrirPicker() {
    setAnoLocal(anoVal) // sincroniza com o valor atual ao abrir
    setOpen((a) => !a)
  }

  function select(mesIdx: number) {
    const mm = String(mesIdx + 1).padStart(2, '0')
    onChange(`${anoLocal}-${mm}`)
    setOpen(false)
  }

  const label = value
    ? `${MESES_LONGOS[mesVal]} ${anoVal}`
    : 'Selecionar mês'

  return (
    <div className="relative" ref={ref}>
      {/* Trigger */}
      <button
        type="button"
        onClick={abrirPicker}
        className={cn(
          'flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-semibold transition-all bg-white whitespace-nowrap',
          open
            ? 'border-[#04c2fb]/60 ring-2 ring-[#04c2fb]/20 text-[#04c2fb]'
            : 'border-border hover:border-[#04c2fb]/40 text-foreground',
        )}
      >
        <Calendar className={cn('h-4 w-4 shrink-0 transition-colors', open ? 'text-[#04c2fb]' : 'text-muted-foreground')} />
        {label}
        <ChevronDown className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform duration-150 ml-0.5', open && 'rotate-180')} />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute left-0 top-full z-40 mt-1.5 w-64 rounded-2xl border shadow-xl overflow-hidden"
          style={{ backgroundColor: 'rgba(255,255,255,0.99)', backdropFilter: 'blur(20px)' }}
        >
          {/* Navegação de ano */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/20">
            <button
              type="button"
              onClick={() => setAnoLocal((a) => a - 1)}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-bold tracking-tight">{anoLocal}</span>
            <button
              type="button"
              onClick={() => setAnoLocal((a) => a + 1)}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              disabled={anoLocal >= anoHoje + 1}
            >
              <ChevronRight className={cn('h-4 w-4', anoLocal >= anoHoje + 1 && 'opacity-30')} />
            </button>
          </div>

          {/* Grid de meses */}
          <div className="grid grid-cols-4 gap-1 p-3">
            {MESES_CURTOS.map((m, i) => {
              const isSelected = anoLocal === anoVal && i === mesVal
              const isHoje = anoLocal === anoHoje && i === mesHoje && !isSelected
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => select(i)}
                  className={cn(
                    'rounded-xl py-2 text-xs font-semibold transition-all',
                    isSelected
                      ? 'text-white shadow-sm'
                      : isHoje
                        ? 'bg-[#04c2fb]/10 text-[#04c2fb] hover:bg-[#04c2fb]/20'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                  style={isSelected
                    ? { background: 'linear-gradient(135deg, #0094c8 0%, #04c2fb 60%, #00d5f5 100%)' }
                    : undefined
                  }
                >
                  {m}
                </button>
              )
            })}
          </div>

          {/* Rodapé: atalho mês atual */}
          {(anoVal !== anoHoje || mesVal !== mesHoje) && (
            <div className="px-3 pb-3">
              <button
                type="button"
                onClick={() => {
                  const mm = String(mesHoje + 1).padStart(2, '0')
                  onChange(`${anoHoje}-${mm}`)
                  setAnoLocal(anoHoje)
                  setOpen(false)
                }}
                className="w-full rounded-xl border border-[#04c2fb]/30 bg-[#04c2fb]/6 py-1.5 text-xs font-semibold text-[#04c2fb] hover:bg-[#04c2fb]/12 transition-colors"
              >
                Mês atual
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({
  title,
  value,
  sub,
  icon: Icon,
  iconGradient,
  valueClass,
}: {
  title: string
  value: string
  sub?: string
  icon: React.ElementType
  iconGradient: string
  valueClass?: string
}) {
  return (
    <Card className="border shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground mb-2">{title}</p>
            <p className={cn('text-2xl font-bold tracking-tight tabular-nums leading-none', valueClass ?? 'text-foreground')}>
              {value}
            </p>
            {sub && <p className="text-[11px] text-muted-foreground mt-1.5">{sub}</p>}
          </div>
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={{ background: iconGradient }}
          >
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Modal Novo Lançamento ─────────────────────────────────────────────────────

function ModalNovoLancamento({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [tipo, setTipo] = useState<'receita' | 'despesa'>('despesa')
  const [categoria, setCategoria] = useState('')
  const [descricao, setDescricao] = useState('')
  const [valorRaw, setValorRaw] = useState('')
  const [mesRef, setMesRef] = useState(mesAtual())
  const [vencimento, setVencimento] = useState('')

  const criar = useAdminCriarLancamento()

  function reset() {
    setTipo('despesa'); setCategoria(''); setDescricao('')
    setValorRaw(''); setMesRef(mesAtual()); setVencimento('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const valor = parseMoeda(valorRaw)
    if (!categoria || !descricao || valor <= 0 || !mesRef) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }
    const payload: CriarLancamentoPayload = {
      tipo, categoria, descricao, valor,
      data_referencia: mesRef,
      ...(vencimento ? { data_vencimento: vencimento } : {}),
    }
    try {
      await criar.mutateAsync(payload)
      toast.success('Lançamento criado', { description: `${descricao} — ${fmt(valor)}` })
      reset(); onClose()
    } catch {
      toast.error('Erro ao criar lançamento')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose() } }}>
      <DialogContent className="sm:max-w-xl gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
              style={{ background: 'linear-gradient(135deg, #0094c8 0%, #04c2fb 60%, #00d5f5 100%)' }}
            >
              <Receipt className="h-4 w-4 text-white" />
            </div>
            <DialogTitle className="text-base font-semibold">Novo Lançamento</DialogTitle>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 space-y-6">

            {/* Tipo */}
            <div className="grid grid-cols-2 gap-2 rounded-xl border p-1 bg-muted/30">
              {(['despesa', 'receita'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => { setTipo(t); setCategoria('') }}
                  className={cn(
                    'flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all',
                    tipo === t
                      ? t === 'despesa' ? 'bg-red-500 text-white shadow-sm' : 'bg-emerald-500 text-white shadow-sm'
                      : 'text-muted-foreground hover:bg-background hover:text-foreground',
                  )}
                >
                  {t === 'despesa' ? <TrendingDown className="h-4 w-4 shrink-0" /> : <TrendingUp className="h-4 w-4 shrink-0" />}
                  {t === 'despesa' ? 'Despesa' : 'Receita'}
                </button>
              ))}
            </div>

            {/* Detalhes */}
            <div className="space-y-3">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Detalhes</p>
              <div className="space-y-1.5">
                <Label>Descrição *</Label>
                <Input
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Ex: Servidor AWS, Freelancer design..."
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Categoria *</Label>
                  <Select value={categoria} onValueChange={setCategoria}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {categoriasParaTipo(tipo).map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Mês de referência *</Label>
                  <Input type="month" value={mesRef} onChange={(e) => setMesRef(e.target.value)} />
                </div>
              </div>
            </div>

            {/* Valores */}
            <div className="space-y-3">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Valores</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Valor *</Label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground select-none">R$</span>
                    <Input
                      className="pl-8"
                      value={valorRaw}
                      onChange={(e) => setValorRaw(formatMoedaInput(e.target.value))}
                      placeholder="0,00"
                      inputMode="numeric"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1">
                    Vencimento <span className="text-muted-foreground font-normal text-xs">(opcional)</span>
                  </Label>
                  <Input type="date" value={vencimento} onChange={(e) => setVencimento(e.target.value)} />
                </div>
              </div>
            </div>

          </div>

          <div className="flex gap-3 px-6 py-4 border-t bg-muted/20">
            <Button type="button" variant="outline" className="flex-1" onClick={() => { reset(); onClose() }} disabled={criar.isPending}>
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 text-white"
              style={{ background: 'linear-gradient(135deg, #0094c8 0%, #04c2fb 60%, #00d5f5 100%)' }}
              disabled={criar.isPending}
            >
              {criar.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Criar lançamento
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Modal Detalhe Lançamento ──────────────────────────────────────────────────

function DetalheRow({ icon: Icon, label, value, valueClass }: { icon: React.ElementType; label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <span className="text-xs text-muted-foreground flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 shrink-0" />
        {label}
      </span>
      <span className={cn('text-sm font-medium', valueClass ?? 'text-gray-800')}>{value}</span>
    </div>
  )
}

function ModalDetalheLancamento({
  lancamento,
  onClose,
}: {
  lancamento: ClinitraFinanceiro | null
  onClose: () => void
}) {
  const [dataPagamento, setDataPagamento] = useState(hojeISO())
  const atualizar = useAdminAtualizarLancamento()
  const excluir = useAdminExcluirLancamento()

  if (!lancamento) return null

  const isReceita = lancamento.tipo === 'receita'
  const isPago = lancamento.status === 'pago' || lancamento.status === 'cancelado'

  async function handlePagar() {
    try {
      await atualizar.mutateAsync({ id: lancamento!.id, payload: { status: 'pago', data_pagamento: dataPagamento } })
      toast.success(isReceita ? 'Recebimento confirmado' : 'Pagamento confirmado', { description: `Em ${fmtDate(dataPagamento)}` })
      onClose()
    } catch {
      toast.error('Erro ao registrar pagamento')
    }
  }

  async function handleExcluir() {
    try {
      await excluir.mutateAsync(lancamento!.id)
      toast.success('Lançamento excluído')
      onClose()
    } catch {
      toast.error('Erro ao excluir lançamento')
    }
  }

  return (
    <Dialog open={!!lancamento} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-lg gap-0 p-0 overflow-hidden">

        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                isReceita ? 'bg-emerald-100' : 'bg-red-100',
              )}>
                <Receipt className={cn('h-4 w-4', isReceita ? 'text-emerald-600' : 'text-red-500')} />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-sm font-semibold leading-tight truncate">
                  {lancamento.descricao}
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">{labelCategoria(lancamento.categoria)}</p>
              </div>
            </div>
            <StatusBadge status={lancamento.status} size="md" />
          </div>
        </DialogHeader>

        {/* Hero */}
        <div className={cn(
          'px-6 py-5',
          isReceita ? 'bg-gradient-to-br from-emerald-50 to-teal-50/30' : 'bg-gradient-to-br from-red-50 to-rose-50/30',
        )}>
          <p className="text-[11px] font-medium text-muted-foreground mb-1 uppercase tracking-wide">
            {isReceita ? (isPago ? 'Valor recebido' : 'A receber') : 'Valor da despesa'}
          </p>
          <p className={cn('text-4xl font-bold tracking-tight tabular-nums', isReceita ? 'text-emerald-600' : 'text-red-500')}>
            {isReceita ? '+' : '−'}{fmt(lancamento.valor)}
          </p>
          {lancamento.assinatura_nome && (
            <div className="flex items-center gap-1.5 mt-2">
              <RefreshCw className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Recorrente — {lancamento.assinatura_nome}</span>
            </div>
          )}
        </div>

        {/* Detalhes */}
        <div className="px-6 divide-y divide-gray-50">
          <DetalheRow icon={Calendar} label="Referência" value={fmtMes(lancamento.data_referencia)} />
          {lancamento.data_vencimento && (
            <DetalheRow icon={Clock} label="Vencimento" value={fmtDate(lancamento.data_vencimento)} />
          )}
          {lancamento.data_pagamento && (
            <DetalheRow
              icon={CheckCircle}
              label="Data do pagamento"
              value={fmtDate(lancamento.data_pagamento)}
              valueClass="text-emerald-700"
            />
          )}
          {lancamento.criado_por_email && (
            <DetalheRow icon={User} label="Criado por" value={lancamento.criado_por_email} />
          )}
        </div>

        {/* Confirmação de pago */}
        {isPago && lancamento.status === 'pago' && (
          <div className="px-6 pt-4 pb-2">
            <div className="flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3">
              <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-emerald-700">
                  {isReceita ? 'Recebimento confirmado' : 'Pagamento confirmado'}
                </p>
                {lancamento.data_pagamento && (
                  <p className="text-xs text-emerald-600 mt-0.5">Em {fmtDate(lancamento.data_pagamento)}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Ação de pagamento */}
        {!isPago && (
          <div className="px-6 pt-4 pb-2 border-t mt-1">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              {isReceita ? 'Registrar recebimento' : 'Registrar pagamento'}
            </p>
            <div className="flex gap-3">
              <div className="flex-1 space-y-1.5">
                <Label className="text-xs text-muted-foreground">Data</Label>
                <Input type="date" value={dataPagamento} onChange={(e) => setDataPagamento(e.target.value)} />
              </div>
              <div className="flex items-end">
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 whitespace-nowrap"
                  onClick={handlePagar}
                  disabled={atualizar.isPending}
                >
                  {atualizar.isPending
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <CheckCircle className="h-4 w-4" />
                  }
                  Confirmar
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex gap-2 px-6 py-4 border-t bg-muted/20 mt-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>Fechar</Button>
          <Button
            variant="outline"
            className="gap-2 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
            onClick={handleExcluir}
            disabled={excluir.isPending}
          >
            {excluir.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Excluir
          </Button>
        </div>

      </DialogContent>
    </Dialog>
  )
}

// ── Modal Nova Assinatura ─────────────────────────────────────────────────────

function ModalNovaAssinatura({
  open,
  assinatura,
  onClose,
}: {
  open: boolean
  assinatura?: ClinitraAssinatura | null
  onClose: () => void
}) {
  const isEdit = !!assinatura
  const [tipo, setTipo] = useState<'receita' | 'despesa'>(assinatura?.tipo ?? 'despesa')
  const [categoria, setCategoria] = useState(assinatura?.categoria ?? '')
  const [nome, setNome] = useState(assinatura?.nome ?? '')
  const [descricao, setDescricao] = useState(assinatura?.descricao ?? '')
  const [valorRaw, setValorRaw] = useState(
    assinatura ? formatMoedaInput(String(Math.round(assinatura.valor * 100))) : ''
  )
  const [dia, setDia] = useState(String(assinatura?.dia_cobranca ?? '1'))
  const [inicio, setInicio] = useState(assinatura?.inicio ?? hojeISO())
  const [fim, setFim] = useState(assinatura?.fim ?? '')

  const criar = useAdminCriarAssinatura()
  const atualizar = useAdminAtualizarAssinatura()
  const isPending = criar.isPending || atualizar.isPending

  function reset() {
    setTipo('despesa'); setCategoria(''); setNome(''); setDescricao('')
    setValorRaw(''); setDia('1'); setInicio(hojeISO()); setFim('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const valor = parseMoeda(valorRaw)
    const diaNum = parseInt(dia, 10)
    if (!nome || !categoria || valor <= 0 || !inicio || diaNum < 1 || diaNum > 28) {
      toast.error('Preencha todos os campos obrigatórios', { description: 'O dia de cobrança deve ser entre 1 e 28.' })
      return
    }
    try {
      if (isEdit && assinatura) {
        const payload: AtualizarAssinaturaPayload = { nome, descricao: descricao || undefined, tipo, categoria, valor, dia_cobranca: diaNum, inicio, fim: fim || undefined }
        await atualizar.mutateAsync({ id: assinatura.id, payload })
        toast.success('Assinatura atualizada')
      } else {
        const payload: CriarAssinaturaPayload = { nome, descricao: descricao || undefined, tipo, categoria, valor, dia_cobranca: diaNum, inicio, fim: fim || undefined }
        await criar.mutateAsync(payload)
        toast.success('Assinatura criada', {
          description: `Lançamentos retroativos gerados a partir de ${new Date(inicio + 'T12:00:00').toLocaleDateString('pt-BR')}.`,
        })
      }
      reset(); onClose()
    } catch {
      toast.error('Erro ao salvar assinatura')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose() } }}>
      <DialogContent className="sm:max-w-2xl gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
              style={{ background: 'linear-gradient(135deg, #0094c8 0%, #04c2fb 60%, #00d5f5 100%)' }}
            >
              <RefreshCw className="h-4 w-4 text-white" />
            </div>
            <DialogTitle className="text-base font-semibold">
              {isEdit ? 'Editar Assinatura' : 'Nova Assinatura'}
            </DialogTitle>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-9rem)]">
          <div className="px-6 py-5 space-y-6">

            {/* Tipo */}
            <div className="grid grid-cols-2 gap-2 rounded-xl border p-1 bg-muted/30">
              {(['despesa', 'receita'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => { setTipo(t); setCategoria('') }}
                  className={cn(
                    'flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all',
                    tipo === t
                      ? t === 'despesa' ? 'bg-red-500 text-white shadow-sm' : 'bg-emerald-500 text-white shadow-sm'
                      : 'text-muted-foreground hover:bg-background hover:text-foreground',
                  )}
                >
                  {t === 'despesa' ? <TrendingDown className="h-4 w-4 shrink-0" /> : <TrendingUp className="h-4 w-4 shrink-0" />}
                  {t === 'despesa' ? 'Custo recorrente' : 'Receita recorrente'}
                </button>
              ))}
            </div>

            {/* Identificação */}
            <div className="space-y-3">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Identificação</p>
              <div className="space-y-1.5">
                <Label>Nome *</Label>
                <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Supabase Pro, Vercel Pro, AWS" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Categoria *</Label>
                  <Select value={categoria} onValueChange={setCategoria}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {categoriasParaTipo(tipo).map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1">
                    Descrição <span className="text-muted-foreground font-normal text-xs">(opcional)</span>
                  </Label>
                  <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Detalhes extras" />
                </div>
              </div>
            </div>

            {/* Cobrança */}
            <div className="space-y-3">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Cobrança</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Valor mensal *</Label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground select-none">R$</span>
                    <Input className="pl-8" value={valorRaw} onChange={(e) => setValorRaw(formatMoedaInput(e.target.value))} placeholder="0,00" inputMode="numeric" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Dia de cobrança *</Label>
                  <Input type="number" min={1} max={28} value={dia} onChange={(e) => setDia(e.target.value)} />
                  <p className="text-[11px] text-muted-foreground">Entre 1 e 28</p>
                </div>
              </div>
            </div>

            {/* Vigência */}
            <div className="space-y-3">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Vigência</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Data de início *</Label>
                  <Input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1">
                    Data de fim <span className="text-muted-foreground font-normal text-xs">(opcional)</span>
                  </Label>
                  <Input type="date" value={fim} onChange={(e) => setFim(e.target.value)} />
                </div>
              </div>
              {!isEdit && inicio && (
                <p className="text-[11px] text-[#04c2fb] bg-[#04c2fb]/8 rounded-lg px-3 py-2">
                  Lançamentos retroativos serão gerados automaticamente a partir da data de início.
                </p>
              )}
            </div>

          </div>

          <div className="flex gap-3 px-6 py-4 border-t bg-muted/20">
            <Button type="button" variant="outline" className="flex-1" onClick={() => { reset(); onClose() }} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1 text-white" style={{ background: 'linear-gradient(135deg, #0094c8 0%, #04c2fb 60%, #00d5f5 100%)' }} disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {isEdit ? 'Salvar alterações' : 'Criar assinatura'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Card Assinatura ───────────────────────────────────────────────────────────

function CardAssinatura({
  assinatura,
  onEdit,
  onToggle,
  onSincronizar,
}: {
  assinatura: ClinitraAssinatura
  onEdit: (a: ClinitraAssinatura) => void
  onToggle: (a: ClinitraAssinatura) => void
  onSincronizar: (a: ClinitraAssinatura) => void
}) {
  const isReceita = assinatura.tipo === 'receita'

  return (
    <Card className={cn(
      'border shadow-sm transition-all hover:shadow-md',
      !assinatura.ativo && 'opacity-55',
    )}>
      <CardContent className="p-4 space-y-3">
        {/* Topo: nome + badge tipo */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{assinatura.nome}</p>
            <p className="text-xs text-muted-foreground truncate mt-0.5">{labelCategoria(assinatura.categoria)}</p>
          </div>
          <span className={cn(
            'shrink-0 inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium',
            isReceita ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200',
          )}>
            {isReceita ? 'Receita' : 'Custo'}
          </span>
        </div>

        {/* Valor + dia */}
        <div className="flex items-center justify-between">
          <p className="text-2xl font-bold tracking-tight">
            {fmt(assinatura.valor)}
            <span className="text-xs text-muted-foreground font-normal ml-1">/mês</span>
          </p>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 rounded-lg px-2 py-1">
            <Calendar className="h-3 w-3 shrink-0" />
            <span>todo dia {assinatura.dia_cobranca}</span>
          </div>
        </div>

        {/* Descrição */}
        {assinatura.descricao && (
          <p className="text-xs text-muted-foreground line-clamp-1">{assinatura.descricao}</p>
        )}

        {/* Período */}
        <div className="text-[11px] text-muted-foreground flex items-center gap-1">
          <span>desde {fmtDate(assinatura.inicio)}</span>
          {assinatura.fim && <><span>·</span><span>até {fmtDate(assinatura.fim)}</span></>}
        </div>

        {/* Rodapé: status + ações */}
        <div className="flex items-center justify-between pt-1 border-t">
          <div className="flex items-center gap-1.5 text-xs">
            <span className={cn('inline-block w-1.5 h-1.5 rounded-full', assinatura.ativo ? 'bg-emerald-500' : 'bg-gray-400')} />
            <span className={assinatura.ativo ? 'text-emerald-700 font-medium' : 'text-muted-foreground'}>
              {assinatura.ativo ? 'Ativa' : 'Inativa'}
            </span>
            {assinatura.total_lancamentos > 0 && (
              <span className="text-muted-foreground">· {assinatura.total_lancamentos} lançamentos</span>
            )}
          </div>
          <div className="flex gap-0.5">
            {assinatura.ativo && (
              <Button size="icon" variant="ghost" className="h-7 w-7 text-[#04c2fb] hover:bg-[#04c2fb]/10" title="Sincronizar lançamentos" onClick={() => onSincronizar(assinatura)}>
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button size="icon" variant="ghost" className="h-7 w-7 hover:bg-muted" onClick={() => onEdit(assinatura)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onToggle(assinatura)}>
              {assinatura.ativo
                ? <ToggleRight className="h-4 w-4 text-emerald-600" />
                : <ToggleLeft className="h-4 w-4 text-gray-400" />}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Página Principal ──────────────────────────────────────────────────────────

export default function AdminFinanceiroPage() {
  const [aba, setAba] = useState<'lancamentos' | 'assinaturas'>('lancamentos')
  const [filtros, setFiltros] = useState<LancamentosFilter>({ mes: mesAtual(), page: 1, page_size: 30 })
  const [modalNovoLancamento, setModalNovoLancamento] = useState(false)
  const [detalheLancamento, setDetalheLancamento] = useState<ClinitraFinanceiro | null>(null)
  const [modalAssinatura, setModalAssinatura] = useState(false)
  const [editarAssinatura, setEditarAssinatura] = useState<ClinitraAssinatura | null>(null)
  const [sortCol, setSortCol] = useState<'data_referencia' | 'valor' | 'descricao' | null>('data_referencia')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'receita' | 'despesa'>('todos')
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'pendente' | 'pago' | 'atrasado' | 'cancelado'>('todos')

  const { data, isLoading } = useAdminLancamentos({
    ...filtros,
    tipo: filtroTipo !== 'todos' ? filtroTipo : undefined,
    status: filtroStatus !== 'todos' ? filtroStatus : undefined,
  })
  const { data: assinaturas, isLoading: loadingAssinaturas } = useAdminAssinaturas()
  const atualizarAssinatura = useAdminAtualizarAssinatura()
  const sincronizarAssinatura = useAdminSincronizarAssinatura()

  const resumo = data?.resumo
  const itens = data?.items ?? []

  const itensSorted = [...itens].sort((a, b) => {
    if (!sortCol) return 0
    let va: string | number = a[sortCol as keyof typeof a] as string | number
    let vb: string | number = b[sortCol as keyof typeof b] as string | number
    if (sortCol === 'valor') { va = Number(va); vb = Number(vb) }
    if (va < vb) return sortDir === 'asc' ? -1 : 1
    if (va > vb) return sortDir === 'asc' ? 1 : -1
    return 0
  })

  function toggleSort(col: typeof sortCol) {
    if (sortCol === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortCol(col); setSortDir('asc') }
  }

  async function handleToggleAssinatura(assinatura: ClinitraAssinatura) {
    try {
      await atualizarAssinatura.mutateAsync({ id: assinatura.id, payload: { ativo: !assinatura.ativo } })
      toast.success(assinatura.ativo ? 'Assinatura desativada' : 'Assinatura reativada')
    } catch {
      toast.error('Erro ao alterar status da assinatura')
    }
  }

  async function handleSincronizarAssinatura(assinatura: ClinitraAssinatura) {
    try {
      const { criados } = await sincronizarAssinatura.mutateAsync(assinatura.id)
      if (criados > 0) {
        toast.success(`${criados} lançamento${criados !== 1 ? 's' : ''} gerado${criados !== 1 ? 's' : ''}`, { description: assinatura.nome })
      } else {
        toast.info('Lançamentos já estão em dia', { description: assinatura.nome })
      }
    } catch {
      toast.error('Erro ao sincronizar lançamentos')
    }
  }

  const assinaturasAtivas = assinaturas?.filter((a) => a.ativo) ?? []
  const assinaturasInativas = assinaturas?.filter((a) => !a.ativo) ?? []
  const custosMensais = assinaturasAtivas.filter(a => a.tipo === 'despesa').reduce((s, a) => s + a.valor, 0)
  const receitaMensalRecorrente = assinaturasAtivas.filter(a => a.tipo === 'receita').reduce((s, a) => s + a.valor, 0)

  return (
    <div className="space-y-6 max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl hidden sm:flex"
            style={{ background: 'linear-gradient(135deg, #0094c8 0%, #04c2fb 60%, #00d5f5 100%)' }}
          >
            <DollarSign className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Financeiro</h1>
            <p className="text-sm text-muted-foreground">Custos e receitas da plataforma Clinitra</p>
          </div>
        </div>
        <Button
          className="shrink-0 text-white gap-1.5 text-sm"
          style={{ background: 'linear-gradient(135deg, #0094c8 0%, #04c2fb 60%, #00d5f5 100%)' }}
          onClick={() => aba === 'lancamentos' ? setModalNovoLancamento(true) : setModalAssinatura(true)}
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">{aba === 'lancamentos' ? 'Novo Lançamento' : 'Nova Assinatura'}</span>
          <span className="sm:hidden">Novo</span>
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KpiCard
          title="Receita do mês"
          value={resumo ? fmt(resumo.receita_mes) : '—'}
          sub="entradas confirmadas"
          icon={TrendingUp}
          iconGradient="linear-gradient(135deg, #059669, #10b981)"
          valueClass="text-emerald-600"
        />
        <KpiCard
          title="Despesas do mês"
          value={resumo ? fmt(resumo.despesa_mes) : '—'}
          sub="saídas do período"
          icon={TrendingDown}
          iconGradient="linear-gradient(135deg, #dc2626, #ef4444)"
          valueClass="text-red-600"
        />
        <KpiCard
          title="Saldo"
          value={resumo ? fmt(resumo.saldo_mes) : '—'}
          sub={resumo && resumo.saldo_mes >= 0 ? 'resultado positivo' : 'resultado negativo'}
          icon={resumo && resumo.saldo_mes >= 0 ? ArrowUpRight : TrendingDown}
          iconGradient={resumo && resumo.saldo_mes >= 0
            ? 'linear-gradient(135deg, #0094c8, #04c2fb)'
            : 'linear-gradient(135deg, #ea580c, #f97316)'}
          valueClass={resumo && resumo.saldo_mes < 0 ? 'text-orange-600' : undefined}
        />
        <KpiCard
          title="A pagar"
          value={resumo ? fmt(resumo.a_pagar) : '—'}
          sub="pendente e atrasado"
          icon={Wallet}
          iconGradient="linear-gradient(135deg, #b45309, #d97706)"
          valueClass={resumo && resumo.a_pagar > 0 ? 'text-amber-700' : undefined}
        />
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-1 p-1 bg-muted/50 rounded-xl border">
          {(['lancamentos', 'assinaturas'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setAba(t)}
              className={cn(
                'px-4 py-1.5 text-sm font-medium rounded-lg transition-all whitespace-nowrap',
                aba === t
                  ? 'bg-white text-foreground shadow-sm border border-border/60'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {t === 'lancamentos' ? 'Lançamentos' : (
                <span className="flex items-center gap-1.5">
                  <RefreshCw className="h-3.5 w-3.5" />
                  Assinaturas
                  {assinaturasAtivas.length > 0 && (
                    <span className="inline-flex items-center justify-center rounded-full bg-[#04c2fb]/15 text-[#04c2fb] text-[10px] font-bold w-4 h-4">
                      {assinaturasAtivas.length}
                    </span>
                  )}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Resumo de assinaturas ativas */}
        {aba === 'assinaturas' && assinaturasAtivas.length > 0 && (
          <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground">
            {receitaMensalRecorrente > 0 && (
              <span className="flex items-center gap-1 text-emerald-700 font-medium">
                <TrendingUp className="h-3 w-3" />
                {fmt(receitaMensalRecorrente)}/mês de receita
              </span>
            )}
            {custosMensais > 0 && (
              <span className="flex items-center gap-1 text-red-600 font-medium">
                <TrendingDown className="h-3 w-3" />
                {fmt(custosMensais)}/mês em custos
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Aba Lançamentos ── */}
      {aba === 'lancamentos' && (
        <div className="space-y-4">

          {/* Filtros */}
          <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-muted/20 p-3">
            <AdminMesPicker
              value={filtros.mes ?? mesAtual()}
              onChange={(v) => setFiltros((f) => ({ ...f, mes: v }))}
            />

            <div className="w-px h-5 bg-border hidden sm:block" />

            {/* Tipo pills */}
            <div className="flex gap-1">
              {([['todos', 'Todos'], ['receita', 'Receita'], ['despesa', 'Despesa']] as const).map(([v, l]) => (
                <button
                  key={v}
                  onClick={() => setFiltroTipo(v)}
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-medium border transition-all',
                    filtroTipo === v
                      ? v === 'receita' ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                        : v === 'despesa' ? 'bg-red-100 text-red-700 border-red-300'
                        : 'bg-foreground text-background border-foreground'
                      : 'bg-background text-muted-foreground border-border hover:border-[#04c2fb]/40',
                  )}
                >
                  {l}
                </button>
              ))}
            </div>

            <div className="w-px h-5 bg-border hidden sm:block" />

            {/* Status pills */}
            <div className="flex gap-1 flex-wrap">
              {([['todos', 'Todos'], ['pendente', 'Pendente'], ['pago', 'Pago'], ['atrasado', 'Atrasado']] as const).map(([v, l]) => {
                const conf = v !== 'todos' ? STATUS_CONFIG[v] : null
                return (
                  <button
                    key={v}
                    onClick={() => setFiltroStatus(v)}
                    className={cn(
                      'px-3 py-1 rounded-full text-xs font-medium border transition-all',
                      filtroStatus === v
                        ? conf ? cn(conf.bg, conf.text, conf.border) : 'bg-foreground text-background border-foreground'
                        : 'bg-background text-muted-foreground border-border hover:border-[#04c2fb]/40',
                    )}
                  >
                    {l}
                  </button>
                )
              })}
            </div>

            <span className="ml-auto text-xs text-muted-foreground">
              {itensSorted.length} registro{itensSorted.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Tabela */}
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">
                      <button className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors" onClick={() => toggleSort('data_referencia')}>
                        Referência <SortIcon col="data_referencia" sortCol={sortCol} sortDir={sortDir} />
                      </button>
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">
                      <button className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors" onClick={() => toggleSort('descricao')}>
                        Descrição <SortIcon col="descricao" sortCol={sortCol} sortDir={sortDir} />
                      </button>
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden md:table-cell">Categoria</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden sm:table-cell">Tipo</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">
                      <button className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors ml-auto" onClick={() => toggleSort('valor')}>
                        Valor <SortIcon col="valor" sortCol={sortCol} sortDir={sortDir} />
                      </button>
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Status</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground hidden lg:table-cell">Origem</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {isLoading ? (
                    [...Array(5)].map((_, i) => (
                      <tr key={i} className="border-b animate-pulse">
                        <td className="px-4 py-3.5"><div className="h-3.5 bg-muted rounded w-16" /></td>
                        <td className="px-4 py-3.5"><div className="h-3.5 bg-muted rounded w-40" /></td>
                        <td className="px-4 py-3.5 hidden md:table-cell"><div className="h-3.5 bg-muted rounded w-24" /></td>
                        <td className="px-4 py-3.5 hidden sm:table-cell"><div className="h-5 bg-muted rounded-full w-16" /></td>
                        <td className="px-4 py-3.5 text-right"><div className="h-3.5 bg-muted rounded w-20 ml-auto" /></td>
                        <td className="px-4 py-3.5"><div className="h-5 bg-muted rounded-full w-18" /></td>
                        <td className="px-4 py-3.5 hidden lg:table-cell"><div className="h-4 bg-muted rounded w-12 mx-auto" /></td>
                      </tr>
                    ))
                  ) : itensSorted.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-16 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div
                            className="flex h-12 w-12 items-center justify-center rounded-2xl opacity-20"
                            style={{ background: 'linear-gradient(135deg, #0094c8, #04c2fb)' }}
                          >
                            <Receipt className="h-6 w-6 text-white" />
                          </div>
                          <p className="text-sm text-muted-foreground">Nenhum lançamento encontrado</p>
                          <Button variant="outline" size="sm" onClick={() => setModalNovoLancamento(true)}>
                            <Plus className="h-3.5 w-3.5 mr-1" /> Novo lançamento
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    itensSorted.map((item) => (
                      <tr
                        key={item.id}
                        className="hover:bg-muted/20 cursor-pointer transition-colors group"
                        onClick={() => setDetalheLancamento(item)}
                      >
                        <td className="px-4 py-3.5">
                          <div className="text-xs font-medium text-gray-700">{fmtMes(item.data_referencia)}</div>
                          {item.data_vencimento && (
                            <div className="text-[10px] text-muted-foreground mt-0.5">vence {fmtDate(item.data_vencimento)}</div>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="font-medium text-gray-900 max-w-[220px] truncate">{item.descricao}</div>
                          {item.assinatura_nome && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <RefreshCw className="h-2.5 w-2.5 text-muted-foreground" />
                              <span className="text-[10px] text-muted-foreground truncate">{item.assinatura_nome}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3.5 hidden md:table-cell text-xs text-muted-foreground">
                          {labelCategoria(item.categoria)}
                        </td>
                        <td className="px-4 py-3.5 hidden sm:table-cell">
                          <span className={cn(
                            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium border',
                            item.tipo === 'despesa'
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200',
                          )}>
                            {item.tipo === 'despesa'
                              ? <TrendingDown className="h-3 w-3" />
                              : <TrendingUp className="h-3 w-3" />}
                            {item.tipo === 'despesa' ? 'Despesa' : 'Receita'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <span className={cn(
                            'font-semibold tabular-nums text-sm',
                            item.tipo === 'despesa' ? 'text-red-600' : 'text-emerald-600',
                          )}>
                            {item.tipo === 'despesa' ? '−' : '+'}{fmt(item.valor)}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <StatusBadge status={item.status} />
                        </td>
                        <td className="px-4 py-3.5 text-center hidden lg:table-cell">
                          {item.assinatura_id
                            ? (
                              <span className="inline-flex items-center gap-1 text-[10px] text-[#04c2fb] bg-[#04c2fb]/8 rounded-full px-2 py-0.5">
                                <RefreshCw className="h-2.5 w-2.5" />
                                Auto
                              </span>
                            )
                            : <span className="text-xs text-muted-foreground/60">Manual</span>
                          }
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Aba Assinaturas ── */}
      {aba === 'assinaturas' && (
        <div className="space-y-6">
          {loadingAssinaturas ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="border shadow-sm animate-pulse">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between">
                      <div className="space-y-1.5">
                        <div className="h-4 bg-muted rounded w-32" />
                        <div className="h-3 bg-muted rounded w-20" />
                      </div>
                      <div className="h-5 bg-muted rounded-full w-14" />
                    </div>
                    <div className="h-7 bg-muted rounded w-28" />
                    <div className="h-px bg-muted" />
                    <div className="flex justify-between">
                      <div className="h-3 bg-muted rounded w-16" />
                      <div className="flex gap-1">
                        <div className="h-7 w-7 bg-muted rounded" />
                        <div className="h-7 w-7 bg-muted rounded" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (assinaturas ?? []).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div
                className="flex h-14 w-14 items-center justify-center rounded-2xl opacity-20"
                style={{ background: 'linear-gradient(135deg, #0094c8, #04c2fb)' }}
              >
                <RefreshCw className="h-7 w-7 text-white" />
              </div>
              <p className="text-sm text-muted-foreground">Nenhuma assinatura cadastrada</p>
              <Button
                className="text-white"
                style={{ background: 'linear-gradient(135deg, #0094c8 0%, #04c2fb 60%, #00d5f5 100%)' }}
                size="sm"
                onClick={() => setModalAssinatura(true)}
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" /> Nova assinatura
              </Button>
            </div>
          ) : (
            <>
              {assinaturasAtivas.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Ativas ({assinaturasAtivas.length})
                    </p>
                    <div className="h-px flex-1 bg-border min-w-[2rem]" />
                    {custosMensais > 0 && (
                      <span className="text-xs text-red-600 font-medium">{fmt(custosMensais)}/mês em custos</span>
                    )}
                    {receitaMensalRecorrente > 0 && (
                      <span className="text-xs text-emerald-600 font-medium">{fmt(receitaMensalRecorrente)}/mês de receita</span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {assinaturasAtivas.map((a) => (
                      <CardAssinatura
                        key={a.id}
                        assinatura={a}
                        onEdit={(as) => { setEditarAssinatura(as); setModalAssinatura(true) }}
                        onToggle={handleToggleAssinatura}
                        onSincronizar={handleSincronizarAssinatura}
                      />
                    ))}
                  </div>
                </div>
              )}

              {assinaturasInativas.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Inativas ({assinaturasInativas.length})
                    </p>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {assinaturasInativas.map((a) => (
                      <CardAssinatura
                        key={a.id}
                        assinatura={a}
                        onEdit={(as) => { setEditarAssinatura(as); setModalAssinatura(true) }}
                        onToggle={handleToggleAssinatura}
                        onSincronizar={handleSincronizarAssinatura}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Modais */}
      <ModalNovoLancamento open={modalNovoLancamento} onClose={() => setModalNovoLancamento(false)} />
      <ModalDetalheLancamento lancamento={detalheLancamento} onClose={() => setDetalheLancamento(null)} />
      <ModalNovaAssinatura
        open={modalAssinatura}
        assinatura={editarAssinatura}
        onClose={() => { setModalAssinatura(false); setEditarAssinatura(null) }}
      />
    </div>
  )
}
