'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import type { DateRange } from 'react-day-picker'
import { TrendingUp, TrendingDown, Clock, AlertCircle, Plus, X, ArrowUpDown, ArrowUp, ArrowDown, CheckCircle, Loader2, Receipt, User, CalendarDays, Banknote, Info, FileText, Trash2, QrCode, CreditCard, ArrowLeftRight, Building2, ChevronDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ConfirmDiscard } from '@/components/confirm-discard'
import { ModalPortal } from '@/components/modal-portal'
import { DatePicker } from '@/components/ui/date-picker'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import { toast } from 'sonner'
import { useTransacoes, useCriarTransacao, useAtualizarTransacao, useExcluirTransacao } from '@/hooks/use-financeiro'
import { usePacientes } from '@/hooks/use-pacientes'
import type { Financeiro, FormaPagamento } from '@/types'

import type { LucideIcon } from 'lucide-react'

const FORMAS_PAGAMENTO: { value: FormaPagamento; label: string; short: string; Icon: LucideIcon }[] = [
  { value: 'pix',            label: 'Pix',               short: 'Pix',          Icon: QrCode },
  { value: 'cartao_credito', label: 'Cartão de crédito', short: 'Crédito',      Icon: CreditCard },
  { value: 'cartao_debito',  label: 'Cartão de débito',  short: 'Débito',       Icon: CreditCard },
  { value: 'dinheiro',       label: 'Dinheiro',          short: 'Dinheiro',     Icon: Banknote },
  { value: 'transferencia',  label: 'Transferência',     short: 'Transferência', Icon: ArrowLeftRight },
  { value: 'convenio',       label: 'Convênio',          short: 'Convênio',     Icon: Building2 },
]

function labelForma(forma?: FormaPagamento) {
  return FORMAS_PAGAMENTO.find(f => f.value === forma)?.label ?? '-'
}

function FormaPagamentoDropdown({
  value,
  onChange,
}: {
  value: FormaPagamento
  onChange: (v: FormaPagamento) => void
}) {
  const [aberto, setAberto] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const selecionado = FORMAS_PAGAMENTO.find(f => f.value === value) ?? FORMAS_PAGAMENTO[0]

  useEffect(() => {
    function handleFora(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAberto(false)
      }
    }
    document.addEventListener('mousedown', handleFora)
    return () => document.removeEventListener('mousedown', handleFora)
  }, [])

  return (
    <div className="relative" ref={containerRef}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setAberto(a => !a)}
        className={cn(
          'w-full flex items-center gap-2.5 rounded-lg border bg-white/80 px-3 py-2 text-sm transition-all',
          aberto
            ? 'border-[#04c2fb]/60 ring-2 ring-[#04c2fb]/40'
            : 'border-gray-200 hover:border-[#04c2fb]/30'
        )}
      >
        <selecionado.Icon className="h-4 w-4 text-[#04c2fb] shrink-0" />
        <span className="flex-1 text-left font-medium text-gray-800">{selecionado.label}</span>
        <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform duration-150', aberto && 'rotate-180')} />
      </button>

      {/* Dropdown */}
      {aberto && (
        <div
          className="absolute left-0 right-0 top-full z-20 mt-1 rounded-lg border border-gray-200 shadow-lg overflow-hidden"
          style={{ backdropFilter: 'blur(12px)', backgroundColor: 'rgba(255,255,255,0.97)' }}
        >
          <div className="py-1">
            {FORMAS_PAGAMENTO.map(fp => {
              const ativo = value === fp.value
              return (
                <button
                  key={fp.value}
                  type="button"
                  onMouseDown={e => { e.preventDefault(); onChange(fp.value); setAberto(false) }}
                  className={cn(
                    'w-full px-3 py-2 text-left text-sm transition-colors flex items-center gap-2.5',
                    ativo
                      ? 'bg-[#04c2fb]/8 text-[#04c2fb] font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  )}
                >
                  <fp.Icon className={cn('h-4 w-4 shrink-0', ativo ? 'text-[#04c2fb]' : 'text-muted-foreground')} />
                  <span className="flex-1">{fp.label}</span>
                  {ativo && <Check className="h-3.5 w-3.5 text-[#04c2fb] shrink-0" />}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function hoje() {
  return new Date().toISOString().slice(0, 10)
}

type SortKey = 'criado_em' | 'descricao' | 'tipo' | 'valor' | 'status'
type SortDir = 'asc' | 'desc'

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 text-gray-300" />
  return sortDir === 'asc'
    ? <ArrowUp className="h-3 w-3 text-[#04c2fb]" />
    : <ArrowDown className="h-3 w-3 text-[#04c2fb]" />
}

function numParaBRL(v: number | string): string {
  const str = Number(v).toFixed(2)
  const dot = str.indexOf('.')
  const intFormatted = str.slice(0, dot).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${intFormatted},${str.slice(dot + 1)}`
}

function formatBRL(v: number) {
  return `R$ ${numParaBRL(v)}`
}

function formatValor(v: number) {
  return numParaBRL(v)
}

function formatData(iso: string | undefined) {
  if (!iso) return '-'
  // Data pura (YYYY-MM-DD): construir como data local para evitar deslocamento UTC
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y, m, d] = iso.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString('pt-BR')
  }
  // Datetime: backend grava em UTC sem 'Z' — adiciona Z para o browser converter corretamente para BRT
  const utc = iso.endsWith('Z') || iso.includes('+') ? iso : iso + 'Z'
  return new Date(utc).toLocaleDateString('pt-BR')
}

function statusLabel(status: Financeiro['status']) {
  switch (status) {
    case 'pago':     return 'Pago'
    case 'pendente': return 'Pendente'
    case 'atrasado': return 'Atrasado'
    case 'cancelado': return 'Cancelado'
  }
}

function statusClasses(status: Financeiro['status']) {
  switch (status) {
    case 'pago':     return 'bg-green-50 text-green-700'
    case 'pendente': return 'bg-amber-50 text-amber-700'
    case 'atrasado': return 'bg-red-50 text-red-600'
    case 'cancelado': return 'bg-gray-100 text-gray-500'
  }
}

function statusDotClasses(status: Financeiro['status']) {
  switch (status) {
    case 'pago':     return 'bg-green-500'
    case 'pendente': return 'bg-amber-500'
    case 'atrasado': return 'bg-red-500'
    case 'cancelado': return 'bg-gray-400'
  }
}

function TrashCanButton({ onClick }: { onClick: (e: React.MouseEvent) => void }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title="Excluir despesa"
      className={cn(
        'rounded-lg p-1.5 transition-colors',
        hovered ? 'text-red-500 bg-red-50' : 'text-muted-foreground hover:bg-gray-100'
      )}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ overflow: 'visible' }}>
        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
        <line x1="10" x2="10" y1="11" y2="17" />
        <line x1="14" x2="14" y1="11" y2="17" />
        <g style={{
          transformOrigin: '3px 6px',
          transform: hovered ? 'rotate(-35deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s ease',
        }}>
          <path d="M3 6h18" />
          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
        </g>
      </svg>
    </button>
  )
}

function ModalDetalheTransacao({
  transacao,
  onFechar,
}: {
  transacao: Financeiro
  onFechar: () => void
}) {
  const [dataPagamento, setDataPagamento] = useState(hoje())
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('pix')
  const atualizarTransacao = useAtualizarTransacao()

  const eReceita = transacao.tipo === 'receita'
  const jaPago = transacao.status === 'pago'

  const heroLabel = eReceita
    ? (jaPago ? 'Valor recebido' : 'A receber')
    : 'Valor da despesa'

  async function darBaixa() {
    try {
      await atualizarTransacao.mutateAsync({
        id: transacao.id,
        payload: { status: 'pago', data_pagamento: dataPagamento, forma_pagamento: formaPagamento },
      })
      toast.success('Recebimento registrado', { description: `Pago em ${formatData(dataPagamento)}.` })
      onFechar()
    } catch {
      toast.error('Erro ao registrar pagamento', { description: 'Tente novamente.' })
    }
  }

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
        onClick={onFechar}
      >
        <div
          className="w-full max-w-md rounded-2xl border border-white/30 shadow-2xl"
          style={{ backdropFilter: 'blur(20px)', backgroundColor: 'rgba(255,255,255,0.97)' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <div className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                eReceita ? 'bg-emerald-100' : 'bg-red-100'
              )}>
                <Receipt className={cn('h-4 w-4', eReceita ? 'text-emerald-600' : 'text-red-500')} />
              </div>
              <div>
                <h2 className="text-sm font-semibold tracking-tight leading-tight">{transacao.descricao}</h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {transacao.paciente_nome ?? (eReceita ? 'Receita' : 'Despesa')}
                </p>
              </div>
            </div>
            <button onClick={onFechar} className="rounded-lg p-1.5 text-muted-foreground hover:bg-gray-100 transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Hero */}
          <div className={cn(
            'px-6 py-5 flex items-center justify-between',
            eReceita ? 'bg-gradient-to-br from-emerald-50 to-teal-50/40' : 'bg-gradient-to-br from-red-50 to-rose-50/40'
          )}>
            <div>
              <p className="text-[11px] font-medium text-muted-foreground mb-1">{heroLabel}</p>
              <p className={cn('text-3xl font-bold tracking-tight tabular-nums', eReceita ? 'text-emerald-600' : 'text-red-500')}>
                {eReceita ? '+' : '−'} R$ {formatValor(transacao.valor)}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium', statusClasses(transacao.status))}>
                <span className={cn('h-1.5 w-1.5 rounded-full', statusDotClasses(transacao.status))} />
                {statusLabel(transacao.status)}
              </span>
              {transacao.registro_id && (
                <span className="inline-flex items-center rounded-full bg-violet-50 text-violet-700 px-2.5 py-1 text-xs font-medium">
                  Sessão
                </span>
              )}
            </div>
          </div>

          {/* Detalhes */}
          <div className="px-6 divide-y divide-gray-50">
            {transacao.paciente_nome && (
              <div className="flex items-center justify-between py-2.5">
                <span className="text-xs text-muted-foreground flex items-center gap-2"><User className="h-3.5 w-3.5" /> Paciente</span>
                <span className="text-sm font-medium text-gray-800">{transacao.paciente_nome}</span>
              </div>
            )}
            {transacao.tipo_sessao && (
              <div className="flex items-center justify-between py-2.5">
                <span className="text-xs text-muted-foreground flex items-center gap-2"><Banknote className="h-3.5 w-3.5" /> Tipo de atendimento</span>
                <span className="text-sm font-medium text-gray-800">{transacao.tipo_sessao}</span>
              </div>
            )}
            {transacao.data_sessao && (
              <div className="flex items-center justify-between py-2.5">
                <span className="text-xs text-muted-foreground flex items-center gap-2"><CalendarDays className="h-3.5 w-3.5" /> Data da sessão</span>
                <span className="text-sm text-gray-700">{formatData(transacao.data_sessao)}</span>
              </div>
            )}
            <div className="flex items-center justify-between py-2.5">
              <span className="text-xs text-muted-foreground flex items-center gap-2"><CalendarDays className="h-3.5 w-3.5" /> Criado em</span>
              <span className="text-sm text-gray-700">{formatData(transacao.criado_em)}</span>
            </div>
            {transacao.data_vencimento && (
              <div className="flex items-center justify-between py-2.5">
                <span className="text-xs text-muted-foreground flex items-center gap-2"><Clock className="h-3.5 w-3.5" /> Vencimento</span>
                <span className="text-sm text-gray-700">{formatData(transacao.data_vencimento)}</span>
              </div>
            )}
            {transacao.forma_pagamento && (
              <div className="flex items-center justify-between py-2.5">
                <span className="text-xs text-muted-foreground flex items-center gap-2"><Banknote className="h-3.5 w-3.5" /> Meio de pagamento</span>
                <span className="text-sm font-medium text-gray-800">{labelForma(transacao.forma_pagamento)}</span>
              </div>
            )}
          </div>

          {/* Seção de pagamento — apenas para receitas não canceladas */}
          {eReceita && transacao.status !== 'cancelado' && (
            <div className="px-6 pt-4 pb-5 border-t border-gray-100 mt-1">
              {jaPago ? (
                /* Já pago */
                <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3.5 flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                    <CheckCircle className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-emerald-700">Recebimento confirmado</p>
                    {transacao.data_pagamento && (
                      <p className="text-xs text-emerald-600 mt-0.5">
                        Em {formatData(transacao.data_pagamento)}
                        {transacao.forma_pagamento && ` via ${labelForma(transacao.forma_pagamento)}`}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                /* Pendente ou atrasado — form de baixa */
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-px flex-1 bg-gray-100" />
                    <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Registrar recebimento</span>
                    <div className="h-px flex-1 bg-gray-100" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Data do recebimento</label>
                      <DatePicker value={dataPagamento} onChange={v => setDataPagamento(v)} placeholder="Selecionar data" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Forma de pagamento</label>
                      <FormaPagamentoDropdown value={formaPagamento} onChange={setFormaPagamento} />
                    </div>
                  </div>
                  <button
                    onClick={darBaixa}
                    disabled={atualizarTransacao.isPending}
                    className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
                    style={{ background: 'linear-gradient(135deg, #0094c8 0%, #04c2fb 60%, #00d5f5 100%)' }}
                  >
                    {atualizarTransacao.isPending
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <CheckCircle className="h-4 w-4" />
                    }
                    Confirmar recebimento
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Rodapé */}
          <div className="flex justify-end px-6 py-3 border-t border-gray-100">
            <button onClick={onFechar} className="rounded-xl border px-5 py-2 text-sm font-medium text-muted-foreground hover:bg-gray-50 transition-colors">
              Fechar
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  )
}

function ModalExclusaoTransacao({
  transacao,
  onConfirmar,
  onCancelar,
}: {
  transacao: Financeiro
  onConfirmar: () => void
  onCancelar: () => void
}) {
  const titulo = transacao.tipo === 'receita' ? 'Excluir receita' : 'Excluir despesa'
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backdropFilter: 'blur(5px)', background: 'rgba(0,0,0,0.22)' }}
      onClick={e => { if (e.target === e.currentTarget) onCancelar() }}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-white/60 shadow-2xl"
        style={{ background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(24px)' }}
      >
        <div className="px-6 pt-6 pb-5 space-y-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 border border-red-100">
              <Trash2 className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">{titulo}</h2>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                Tem certeza que deseja excluir{' '}
                <span className="font-semibold text-gray-800">&ldquo;{transacao.descricao}&rdquo;</span>?{' '}
                Esta ação não pode ser desfeita.
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
              <Trash2 className="h-3.5 w-3.5" /> Excluir
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const STORAGE_KEY_VENCIMENTO = 'clinitra:dia_vencimento'

function calcularVencimentoPadrao(): { iso: string; display: string; dia: number } | null {
  if (typeof window === 'undefined') return null
  const stored = localStorage.getItem(STORAGE_KEY_VENCIMENTO)
  if (!stored) return null
  const dia = Number(stored)
  if (!dia || isNaN(dia)) return null

  const hoje = new Date()
  const candidato = new Date(hoje.getFullYear(), hoje.getMonth(), dia)
  const alvo = candidato > hoje ? candidato : new Date(hoje.getFullYear(), hoje.getMonth() + 1, dia)

  return {
    iso: alvo.toISOString().slice(0, 10),
    display: alvo.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }),
    dia,
  }
}

function formatarMoeda(raw: string) {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return ''
  return numParaBRL(parseInt(digits, 10) / 100)
}

function ModalNovaTransacao({
  onFechar,
}: {
  onFechar: () => void
}) {
  const [form, setForm] = useState({
    tipo: 'receita' as 'receita' | 'despesa',
    descricao: '',
    valor: '',
    formaPagamento: 'pix' as FormaPagamento,
    atreladoPaciente: false,
    pacienteId: '',
    pacienteBusca: '',
  })
  const [pacienteDropdownAberto, setPacienteDropdownAberto] = useState(false)
  const pacienteContainerRef = useRef<HTMLDivElement>(null)
  const [confirmarSair, setConfirmarSair] = useState(false)
  const criarTransacao = useCriarTransacao()
  const { data: pacientesData } = usePacientes({ ativo: true, page_size: 500 })
  const pacientesDisponiveis = pacientesData?.items ?? []

  useEffect(() => {
    function handleFora(e: MouseEvent) {
      if (pacienteContainerRef.current && !pacienteContainerRef.current.contains(e.target as Node)) {
        setPacienteDropdownAberto(false)
      }
    }
    document.addEventListener('mousedown', handleFora)
    return () => document.removeEventListener('mousedown', handleFora)
  }, [])

  const vencimentoPadrao = useMemo(() => calcularVencimentoPadrao(), [])

  function f(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function handleValorChange(e: React.ChangeEvent<HTMLInputElement>) {
    f('valor', formatarMoeda(e.target.value))
  }

  const temDados = form.descricao !== '' || form.valor !== '' || form.pacienteId !== ''

  function tentarFechar() {
    if (temDados) setConfirmarSair(true)
    else onFechar()
  }

  async function salvar() {
    if (!form.descricao.trim() || !form.valor) return
    const digits = form.valor.replace(/\D/g, '')
    const valorNum = parseInt(digits, 10) / 100
    if (!valorNum || isNaN(valorNum)) {
      toast.error('Valor inválido')
      return
    }
    try {
      await criarTransacao.mutateAsync({
        tipo: form.tipo,
        descricao: form.descricao.trim(),
        valor: valorNum,
        forma_pagamento: form.formaPagamento,
        data_vencimento: vencimentoPadrao?.iso,
        paciente_id: form.atreladoPaciente && form.pacienteId ? form.pacienteId : undefined,
      })
      toast.success('Transação registrada', {
        description: `${form.tipo === 'receita' ? 'Entrada' : 'Saída'} de ${formatBRL(valorNum)} adicionada.`,
      })
      onFechar()
    } catch {
      toast.error('Erro ao salvar transação', { description: 'Tente novamente.' })
    }
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
        className="w-full max-w-md rounded-2xl border border-white/30 shadow-2xl"
        style={{ backdropFilter: 'blur(20px)', backgroundColor: 'rgba(255,255,255,0.95)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-[#04c2fb]" />
            <h2 className="text-base font-semibold tracking-tight">Nova Transação</h2>
          </div>
          <button
            onClick={tentarFechar}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-gray-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Tipo — toggle segmentado */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tipo</label>
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-gray-100/80 p-1">
              {(['receita', 'despesa'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => f('tipo', t)}
                  className={cn(
                    'flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition-all duration-150',
                    form.tipo === t
                      ? t === 'receita'
                        ? 'bg-white text-emerald-700 shadow-sm'
                        : 'bg-white text-red-600 shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {t === 'receita'
                    ? <TrendingUp className="h-3.5 w-3.5" />
                    : <TrendingDown className="h-3.5 w-3.5" />
                  }
                  {t === 'receita' ? 'Entrada' : 'Saída'}
                </button>
              ))}
            </div>
          </div>

          {/* Atrelado a um paciente */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => {
                const novoValor = !form.atreladoPaciente
                setForm(prev => ({
                  ...prev,
                  atreladoPaciente: novoValor,
                  pacienteId: novoValor ? prev.pacienteId : '',
                  pacienteBusca: novoValor ? prev.pacienteBusca : '',
                }))
                if (!novoValor) setPacienteDropdownAberto(false)
              }}
              className="flex items-center gap-2.5 w-full group"
            >
              <div className={cn(
                'relative w-9 h-5 rounded-full transition-colors duration-200 shrink-0',
                form.atreladoPaciente ? 'bg-[#04c2fb]' : 'bg-gray-200'
              )}>
                <span className={cn(
                  'absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200',
                  form.atreladoPaciente ? 'translate-x-4' : 'translate-x-0'
                )} />
              </div>
              <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors">
                Atrelado a um paciente
              </span>
            </button>

            {form.atreladoPaciente && (
              <div ref={pacienteContainerRef} className="relative">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  <input
                    value={form.pacienteBusca}
                    onChange={e => {
                      setForm(prev => ({ ...prev, pacienteBusca: e.target.value, pacienteId: '' }))
                      setPacienteDropdownAberto(true)
                    }}
                    onFocus={() => setPacienteDropdownAberto(true)}
                    placeholder="Buscar paciente..."
                    className="w-full rounded-lg border bg-white/80 pl-9 pr-8 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#04c2fb]/40"
                  />
                  {form.pacienteBusca && (
                    <button
                      type="button"
                      onClick={() => {
                        setForm(prev => ({ ...prev, pacienteId: '', pacienteBusca: '' }))
                        setPacienteDropdownAberto(false)
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-gray-700"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                {pacienteDropdownAberto && (
                  <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg max-h-44 overflow-y-auto">
                    {pacientesDisponiveis
                      .filter(p => p.nome.toLowerCase().includes(form.pacienteBusca.toLowerCase()))
                      .slice(0, 20)
                      .map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onMouseDown={e => {
                            e.preventDefault()
                            setForm(prev => ({ ...prev, pacienteId: p.id, pacienteBusca: p.nome }))
                            setPacienteDropdownAberto(false)
                          }}
                          className={cn(
                            'flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-gray-50 transition-colors',
                            form.pacienteId === p.id && 'bg-[#04c2fb]/5 font-medium text-[#04c2fb]'
                          )}
                        >
                          <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          {p.nome}
                        </button>
                      ))
                    }
                    {pacientesDisponiveis.filter(p => p.nome.toLowerCase().includes(form.pacienteBusca.toLowerCase())).length === 0 && (
                      <p className="px-3 py-2 text-xs italic text-muted-foreground">Nenhum paciente encontrado</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Descrição */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Descrição</label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <input
                value={form.descricao}
                onChange={e => f('descricao', e.target.value)}
                placeholder="Ex: Sessão com João Silva"
                className="w-full rounded-lg border bg-white/80 pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#04c2fb]/40"
              />
            </div>
          </div>

          {/* Valor */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Valor</label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-sm text-gray-400 select-none">
                R$
              </span>
              <input
                value={form.valor}
                onChange={handleValorChange}
                placeholder="0,00"
                inputMode="numeric"
                className="w-full rounded-xl border border-gray-200 pl-10 pr-4 py-2.5 text-sm bg-white/70 focus:outline-none focus:ring-2 focus:ring-[#04c2fb]/30 focus:border-[#04c2fb]/60 transition-all"
              />
            </div>
          </div>

          {/* Forma de pagamento */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Forma de pagamento</label>
            <FormaPagamentoDropdown
              value={form.formaPagamento}
              onChange={v => f('formaPagamento', v)}
            />
          </div>

          {/* Vencimento — somente leitura, vem das configurações */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Vencimento</label>
            {vencimentoPadrao ? (
              <div className="rounded-xl border border-[#04c2fb]/25 bg-[#04c2fb]/5 px-4 py-3 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-3.5 w-3.5 text-[#04c2fb] shrink-0" />
                    <span className="text-sm font-medium text-gray-800">{vencimentoPadrao.display}</span>
                  </div>
                  <span
                    className="text-[11px] font-semibold text-white px-2 py-0.5 rounded-full"
                    style={{ background: 'linear-gradient(135deg, #0094c8 0%, #04c2fb 60%, #00d5f5 100%)' }}
                  >
                    dia {vencimentoPadrao.dia}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Info className="h-3 w-3 shrink-0" />
                  Definido em Configurações → Financeiro. Não editável aqui.
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-2">
                <Info className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-amber-700">Nenhuma data configurada</p>
                  <p className="text-[11px] text-amber-600 mt-0.5">
                    Defina o dia de vencimento padrão em Configurações → Financeiro.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
          <button
            onClick={tentarFechar}
            className="rounded-lg border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-gray-100 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={salvar}
            disabled={criarTransacao.isPending || !form.descricao.trim() || !form.valor}
            className="rounded-lg px-5 py-2 text-sm font-medium text-white transition-colors hover:brightness-110 disabled:opacity-50 flex items-center gap-2"
            style={{ background: 'linear-gradient(135deg, #0094c8 0%, #04c2fb 60%, #00d5f5 100%)' }}
          >
            {criarTransacao.isPending
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <CheckCircle className="h-3.5 w-3.5" />
            }
            Salvar
          </button>
        </div>
      </div>
    </div>
    </ModalPortal>
  )
}

export default function FinanceiroPage() {
  const [abrirModal, setAbrirModal] = useState(false)
  const [transacaoSelecionada, setTransacaoSelecionada] = useState<Financeiro | null>(null)
  const [excluindoTransacao, setExcluindoTransacao] = useState<Financeiro | null>(null)
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'receita' | 'despesa'>('todos')
  const [filtroPeriodo, setFiltroPeriodo] = useState<DateRange | undefined>(undefined)
  const [sortKey, setSortKey] = useState<SortKey>('criado_em')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const { data, isLoading } = useTransacoes()
  const excluirTransacao = useExcluirTransacao()

  async function confirmarExclusao() {
    if (!excluindoTransacao) return
    try {
      await excluirTransacao.mutateAsync(excluindoTransacao.id)
      const label = excluindoTransacao.tipo === 'receita' ? 'Receita excluída' : 'Despesa excluída'
      toast.success(label, { description: excluindoTransacao.descricao })
      setExcluindoTransacao(null)
    } catch {
      toast.error('Erro ao excluir', { description: 'Tente novamente.' })
    }
  }

  const transacoes = useMemo(() => data?.items ?? [], [data])
  const resumo = data?.resumo

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const filtroInicio = filtroPeriodo?.from
  const filtroFim    = filtroPeriodo?.to

  const lista = useMemo(() => {
    const filtered = transacoes.filter(t => {
      if (filtroTipo !== 'todos' && t.tipo !== filtroTipo) return false
      if (filtroInicio || filtroFim) {
        const iso = t.criado_em.endsWith('Z') || t.criado_em.includes('+') ? t.criado_em : t.criado_em + 'Z'
        const dt = new Date(iso)
        if (filtroInicio && dt < filtroInicio) return false
        if (filtroFim   && dt > filtroFim)    return false
      }
      return true
    })

    return [...filtered].sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case 'criado_em': {
          const toUtc = (s: string) => new Date(s.endsWith('Z') || s.includes('+') ? s : s + 'Z').getTime()
          cmp = toUtc(a.criado_em) - toUtc(b.criado_em)
          break
        }
        case 'descricao':
          cmp = a.descricao.localeCompare(b.descricao, 'pt-BR')
          break
        case 'tipo':
          cmp = a.tipo.localeCompare(b.tipo)
          break
        case 'valor':
          cmp = a.valor - b.valor
          break
        case 'status':
          cmp = a.status.localeCompare(b.status)
          break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [transacoes, filtroTipo, filtroInicio, filtroFim, sortKey, sortDir])

  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {abrirModal && <ModalNovaTransacao onFechar={() => setAbrirModal(false)} />}
      {transacaoSelecionada && (
        <ModalDetalheTransacao
          transacao={transacaoSelecionada}
          onFechar={() => setTransacaoSelecionada(null)}
        />
      )}
      {excluindoTransacao && (
        <ModalExclusaoTransacao
          transacao={excluindoTransacao}
          onConfirmar={confirmarExclusao}
          onCancelar={() => setExcluindoTransacao(null)}
        />
      )}

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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-card p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Receita do Mês</p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-emerald-600">{formatBRL(resumo?.receita_mes ?? 0)}</p>
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
              <p className="mt-2 text-2xl font-bold tracking-tight text-red-500">{formatBRL(resumo?.despesa_mes ?? 0)}</p>
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
              <p className="mt-2 text-2xl font-bold tracking-tight text-amber-600">{formatBRL(resumo?.a_receber ?? 0)}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">dentro do prazo</p>
            </div>
            <div className="rounded-lg p-2.5 bg-amber-500/10">
              <Clock className="h-4 w-4 text-amber-500" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Atrasado</p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-red-600">{formatBRL(resumo?.atrasado ?? 0)}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">prazo expirado</p>
            </div>
            <div className="rounded-lg p-2.5 bg-red-500/10">
              <AlertCircle className="h-4 w-4 text-red-500" />
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
                <th onClick={() => handleSort('criado_em')} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors">
                  <span className="inline-flex items-center gap-1.5">Data <SortIcon col="criado_em" sortKey={sortKey} sortDir={sortDir} /></span>
                </th>
                <th onClick={() => handleSort('descricao')} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors">
                  <span className="inline-flex items-center gap-1.5">Descrição <SortIcon col="descricao" sortKey={sortKey} sortDir={sortDir} /></span>
                </th>
                <th onClick={() => handleSort('tipo')} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors">
                  <span className="inline-flex items-center gap-1.5">Tipo <SortIcon col="tipo" sortKey={sortKey} sortDir={sortDir} /></span>
                </th>
                <th onClick={() => handleSort('valor')} className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors">
                  <span className="inline-flex items-center gap-1.5 justify-end">Valor <SortIcon col="valor" sortKey={sortKey} sortDir={sortDir} /></span>
                </th>
                <th onClick={() => handleSort('status')} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors">
                  <span className="inline-flex items-center gap-1.5">Status <SortIcon col="status" sortKey={sortKey} sortDir={sortDir} /></span>
                </th>
                <th className="w-20 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-[#04c2fb]" />
                  </td>
                </tr>
              )}
              {!isLoading && lista.map(t => (
                <tr
                  key={t.id}
                  onClick={() => setTransacaoSelecionada(t)}
                  className="group hover:bg-muted/20 transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                    <div>{formatData(t.criado_em)}</div>
                    {t.data_pagamento && (
                      <div className="text-[11px] text-green-600">pago {formatData(t.data_pagamento)}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-800">
                    <div className="flex items-center gap-1.5">
                      {t.descricao}
                      {t.registro_id && (
                        <span className="inline-flex items-center rounded-full bg-violet-50 text-violet-600 px-1.5 py-0.5 text-[10px] font-medium">Sessão</span>
                      )}
                    </div>
                    {t.paciente_nome && (
                      <div className="text-[11px] text-muted-foreground">{t.paciente_nome}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
                      t.tipo === 'receita' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                    )}>
                      {t.tipo === 'receita' ? '↑ Entrada' : '↓ Saída'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className={cn(
                      'inline-flex items-baseline gap-1 font-semibold tabular-nums',
                      t.tipo === 'receita' ? 'text-emerald-600' : 'text-red-500'
                    )}>
                      <span className="text-[11px] font-normal opacity-70">
                        {t.tipo === 'receita' ? '+' : '−'} R$
                      </span>
                      {formatValor(t.valor)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
                      statusClasses(t.status)
                    )}>
                      <span className={cn('h-1.5 w-1.5 rounded-full', statusDotClasses(t.status))} />
                      {statusLabel(t.status)}
                    </span>
                  </td>
                  <td className="w-14 px-4 py-3 text-center">
                    <TrashCanButton onClick={e => { e.stopPropagation(); setExcluindoTransacao(t) }} />
                  </td>
                </tr>
              ))}
              {!isLoading && lista.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
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
