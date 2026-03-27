'use client'

import { useState, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Users, Plus, X, ArrowUpDown, ArrowUp, ArrowDown, Search, History, AlertTriangle, Pause } from 'lucide-react'
import { cn, hoje } from '@/lib/utils'
import { registrosIniciais } from '@/lib/mock-registros'
import { ConfirmDiscard } from '@/components/confirm-discard'
import { ModalPortal } from '@/components/modal-portal'
import { DatePicker } from '@/components/ui/date-picker'
import { toast } from 'sonner'

type Paciente = {
  id: number
  ativo: boolean
  nome: string
  dataNascimento: string
  responsavel: string
  dataAnamnese: string
  valorSessao: string
  gratuito: boolean
  gratuitoInicio: string
  gratuitoFim: string
  dataInicio: string
  dataFim: string | null
}

const pacientesIniciais: Paciente[] = [
  { id: 1,  ativo: true,  nome: 'Bernardo Antonio L.F.',      dataNascimento: '15/10/2019', responsavel: 'Bruna e Maikal',       dataAnamnese: '19/05/2023', valorSessao: 'R$ 120,00', gratuito: false, gratuitoInicio: '-', gratuitoFim: '-',         dataInicio: '25/05/2023', dataFim: null         },
  { id: 2,  ativo: true,  nome: 'Angelo Gustavo P. Holub',    dataNascimento: '24/03/2017', responsavel: 'Cristiane e Anderson', dataAnamnese: '15/02/2024', valorSessao: 'R$ 100,00', gratuito: true,  gratuitoInicio: '16/02/2024', gratuitoFim: '16/05/2024', dataInicio: '16/02/2024', dataFim: null         },
  { id: 3,  ativo: true,  nome: 'Lorenzo de Souza Bueno',     dataNascimento: '15/04/2017', responsavel: 'Micheli e Marcelo',   dataAnamnese: '09/05/2024', valorSessao: 'R$ 150,00', gratuito: false, gratuitoInicio: '-', gratuitoFim: '-',         dataInicio: '16/05/2024', dataFim: null         },
  { id: 4,  ativo: false, nome: 'Gabriel Fernandes B.C.',     dataNascimento: '10/08/2019', responsavel: 'Aline',               dataAnamnese: '19/05/2023', valorSessao: 'R$ 80,00',  gratuito: false, gratuitoInicio: '-', gratuitoFim: '-',         dataInicio: '25/05/2023', dataFim: '08/03/2024' },
  { id: 5,  ativo: true,  nome: 'Pietro Bizinelli Amorim',    dataNascimento: '17/03/2016', responsavel: 'Giovana e Marco',     dataAnamnese: '13/09/2024', valorSessao: 'R$ 150,00', gratuito: false, gratuitoInicio: '-', gratuitoFim: '-',         dataInicio: '20/09/2024', dataFim: null         },
  { id: 6,  ativo: true,  nome: 'Rafaela de Souza Bueno',     dataNascimento: '26/11/2013', responsavel: 'Micheli e Marcelo',   dataAnamnese: '16/10/2024', valorSessao: 'R$ 120,00', gratuito: false, gratuitoInicio: '-', gratuitoFim: '-',         dataInicio: '03/10/2024', dataFim: null         },
  { id: 7,  ativo: true,  nome: 'Vinícius Augusto Padilha',   dataNascimento: '09/08/2012', responsavel: 'Rosilane',            dataAnamnese: '17/02/2025', valorSessao: 'R$ 160,00', gratuito: false, gratuitoInicio: '-', gratuitoFim: '-',         dataInicio: '28/02/2025', dataFim: null         },
  { id: 8,  ativo: true,  nome: 'Moysés Costa de Almeida',    dataNascimento: '23/07/2010', responsavel: 'Renata e Marcos',     dataAnamnese: '17/02/2025', valorSessao: 'R$ 160,00', gratuito: false, gratuitoInicio: '-', gratuitoFim: '-',         dataInicio: '28/02/2025', dataFim: null         },
  { id: 9,  ativo: true,  nome: 'Isadora Furman',             dataNascimento: '11/12/2019', responsavel: 'Louise e Rafael',     dataAnamnese: '20/05/2025', valorSessao: 'R$ 160,00', gratuito: false, gratuitoInicio: '-', gratuitoFim: '-',         dataInicio: '28/05/2025', dataFim: null         },
  { id: 10, ativo: false, nome: 'Arthur Henrique',            dataNascimento: '23/03/2022', responsavel: 'Jaqueline e Bernardo', dataAnamnese: '14/02/2025', valorSessao: 'R$ 160,00', gratuito: false, gratuitoInicio: '-', gratuitoFim: '-',        dataInicio: '18/02/2025', dataFim: '26/03/2025' },
  { id: 11, ativo: true,  nome: 'Felipe Konik Pertele',       dataNascimento: '05/07/2015', responsavel: 'Fernanda e Konik',     dataAnamnese: '10/01/2026', valorSessao: '',            gratuito: true,  gratuitoInicio: '10/01/2026', gratuitoFim: '10/03/2026', dataInicio: '10/01/2026', dataFim: null         },
]

type FormState = {
  nome: string
  responsavel: string
  dataNascimento: string
  dataAnamnese: string
  valorSessao: string
  gratuito: boolean
  gratuitoInicio: string
  gratuitoFim: string
  dataInicio: string
  dataFim: string
  ativo: boolean
}

function formInicial(): FormState {
  const h = hoje()
  return {
    nome: '', responsavel: '', dataNascimento: h, dataAnamnese: h,
    valorSessao: '', gratuito: false, gratuitoInicio: h, gratuitoFim: '',
    dataInicio: h, dataFim: '', ativo: true,
  }
}

type SortKey = 'nome' | 'responsavel' | 'dataNascimento' | 'valorSessao' | 'ativo' | 'dataInicio' | 'dataFim'
type SortDir = 'asc' | 'desc'

function parseDateBR(d: string | null): number {
  if (!d || d === '-' || d === '—') return 0
  const [day, month, year] = d.split('/')
  return new Date(`${year}-${month}-${day}`).getTime()
}

function parseValor(v: string): number {
  if (!v || v === '-') return 0
  return parseFloat(v.replace(/[^\d,]/g, '').replace(',', '.'))
}

function isGratuitoVigenteBR(gratuito: boolean, inicio: string, fim: string): boolean {
  if (!gratuito) return false
  if (!inicio || inicio === '-' || inicio === '—') return true
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  if (inicio && inicio !== '-' && inicio !== '—') {
    const [d, m, y] = inicio.split('/')
    const di = new Date(+y, +m - 1, +d)
    if (hoje < di) return false
  }
  if (fim && fim !== '-' && fim !== '—') {
    const [d, m, y] = fim.split('/')
    const df = new Date(+y, +m - 1, +d)
    if (hoje > df) return false
  }
  return true
}

function isGratuitoVigenteISO(gratuito: boolean, inicio: string, fim: string): boolean {
  if (!gratuito) return false
  if (!inicio) return true
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  if (inicio) {
    const d = new Date(inicio + 'T00:00:00')
    if (hoje < d) return false
  }
  if (fim) {
    const d = new Date(fim + 'T00:00:00')
    if (hoje > d) return false
  }
  return true
}

/** Gratuidade expirou (data fim ja passou) */
function gratuidadeExpirouBR(gratuito: boolean, gratuitoFim: string): boolean {
  if (!gratuito) return false
  if (!gratuitoFim || gratuitoFim === '-' || gratuitoFim === '—') return false
  const [d, m, y] = gratuitoFim.split('/')
  const fim = new Date(+y, +m - 1, +d, 23, 59, 59)
  return new Date() > fim
}

/** Paciente pausado: ativo + gratuidade expirou + sem valor de sessao definido */
function isPacientePausado(p: Paciente): boolean {
  if (!p.ativo) return false
  if (!gratuidadeExpirouBR(p.gratuito, p.gratuitoFim)) return false
  const val = p.valorSessao.replace(/[^\d]/g, '')
  return !val || val === '0' || val === '00' || val === '000'
}

function formatValorBRL(raw: string): string {
  // Remove tudo exceto dígitos e vírgula
  let limpo = raw.replace(/[^\d,]/g, '')
  if (!limpo) return ''
  // Troca vírgula por ponto para parsing
  const num = parseFloat(limpo.replace(',', '.'))
  if (isNaN(num)) return raw
  // Formata com 2 casas decimais e prefixo R$
  const formatted = num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return `R$ ${formatted}`
}

function ModalNovoPaciente({
  onSalvar,
  onFechar,
}: {
  onSalvar: (f: FormState) => void
  onFechar: () => void
}) {
  const [form, setForm] = useState<FormState>(formInicial)
  const [confirmarSair, setConfirmarSair] = useState(false)
  const [tentouSalvar, setTentouSalvar] = useState(false)

  function f(field: string, value: string | boolean) {
    setForm(prev => {
      const next = { ...prev, [field]: value }
      if (field === 'ativo' && value === true) next.dataFim = ''
      if (field === 'gratuito' && value === false) {
        next.gratuitoInicio = ''
        next.gratuitoFim = ''
      }
      return next
    })
  }

  const camposObrigatorios: { key: keyof FormState; label: string }[] = [
    { key: 'nome', label: 'Nome completo' },
    { key: 'responsavel', label: 'Responsável' },
    { key: 'dataNascimento', label: 'Data de Nascimento' },
    { key: 'dataAnamnese', label: 'Data da Anamnese' },
    { key: 'valorSessao', label: 'Valor da Sessão' },
    { key: 'dataInicio', label: 'Data de Início' },
  ]

  const gratuitoVigente = isGratuitoVigenteISO(form.gratuito, form.gratuitoInicio, form.gratuitoFim)

  function valorNumerico(raw: string): number {
    const limpo = raw.replace(/[^\d,]/g, '').replace(',', '.')
    return limpo ? parseFloat(limpo) : 0
  }

  const valorInsuficiente = !gratuitoVigente && form.valorSessao.trim() !== '' && valorNumerico(form.valorSessao) < 1

  function campoVazio(key: keyof FormState): boolean {
    if (key === 'valorSessao' && gratuitoVigente) return false
    const v = form[key]
    if (typeof v === 'string') return v.trim() === ''
    return false
  }

  function erroValorSessao(): boolean {
    if (!tentouSalvar) return false
    if (gratuitoVigente) return false
    if (form.valorSessao.trim() === '') return true
    return valorInsuficiente
  }

  function erroVisivel(key: keyof FormState): boolean {
    if (key === 'valorSessao') return erroValorSessao()
    return tentouSalvar && campoVazio(key)
  }

  const dataFimObrigatoria = !form.ativo
  const formularioValido =
    camposObrigatorios.every(c => !campoVazio(c.key)) &&
    (!dataFimObrigatoria || form.dataFim.trim() !== '') &&
    !valorInsuficiente

  const temDados = Object.entries(form).some(([k, v]) =>
    k !== 'ativo' && k !== 'gratuito' && typeof v === 'string' && v !== ''
  )

  const camposFaltando = tentouSalvar
    ? [
        ...camposObrigatorios.filter(c => campoVazio(c.key)).map(c => c.label),
        ...(dataFimObrigatoria && form.dataFim.trim() === '' ? ['Data de Fim'] : []),
        ...(valorInsuficiente ? ['Valor da Sessão deve ser no mínimo R$ 1,00'] : []),
      ]
    : []

  function tentarSalvar() {
    setTentouSalvar(true)
    if (formularioValido) onSalvar(form)
  }

  function tentarFechar() {
    if (temDados) setConfirmarSair(true)
    else onFechar()
  }

  const inputBase = 'w-full rounded-lg border px-3 py-2 text-sm transition-all focus:outline-none focus:ring-2'
  const inputOk = 'border-gray-200 bg-white/80 focus:ring-[#04c2fb]/40'
  const inputErro = 'border-red-300 bg-red-50/50 focus:ring-red-400/40'

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
        className="w-full max-w-2xl rounded-2xl border border-white/30 shadow-2xl"
        style={{ backdropFilter: 'blur(20px)', backgroundColor: 'rgba(255,255,255,0.92)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold tracking-tight">Novo Paciente</h2>
          <button
            onClick={tentarFechar}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-gray-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <label className={cn('text-xs font-medium', erroVisivel('nome') ? 'text-red-500' : 'text-muted-foreground')}>
                Nome completo <span className="text-red-400">*</span>
              </label>
              <input
                value={form.nome}
                onChange={e => f('nome', e.target.value)}
                placeholder="Nome do paciente"
                className={cn(inputBase, erroVisivel('nome') ? inputErro : inputOk)}
              />
            </div>
            <div className="space-y-1">
              <label className={cn('text-xs font-medium', erroVisivel('responsavel') ? 'text-red-500' : 'text-muted-foreground')}>
                Responsável <span className="text-red-400">*</span>
              </label>
              <input
                value={form.responsavel}
                onChange={e => f('responsavel', e.target.value)}
                placeholder="Nome do responsável"
                className={cn(inputBase, erroVisivel('responsavel') ? inputErro : inputOk)}
              />
            </div>
            <div className="space-y-1">
              <label className={cn('text-xs font-medium', erroVisivel('dataNascimento') ? 'text-red-500' : 'text-muted-foreground')}>
                Data de Nascimento <span className="text-red-400">*</span>
              </label>
              <DatePicker
                value={form.dataNascimento}
                onChange={v => f('dataNascimento', v)}
                placeholder="Selecionar data"
                hasError={erroVisivel('dataNascimento')}
                variant="birthdate"
              />
            </div>
            <div className="space-y-1">
              <label className={cn('text-xs font-medium', erroVisivel('dataAnamnese') ? 'text-red-500' : 'text-muted-foreground')}>
                Data da Anamnese <span className="text-red-400">*</span>
              </label>
              <DatePicker
                value={form.dataAnamnese}
                onChange={v => f('dataAnamnese', v)}
                placeholder="Selecionar data"
                hasError={erroVisivel('dataAnamnese')}
              />
            </div>
            <div className="space-y-1">
              <label className={cn('text-xs font-medium', erroVisivel('valorSessao') ? 'text-red-500' : 'text-muted-foreground')}>
                Valor da Sessão <span className="text-red-400">*</span>
              </label>
              <input
                value={gratuitoVigente ? 'R$ 0,00' : form.valorSessao}
                onChange={e => f('valorSessao', e.target.value)}
                onBlur={() => {
                  if (form.valorSessao.trim()) f('valorSessao', formatValorBRL(form.valorSessao))
                }}
                disabled={gratuitoVigente}
                placeholder="R$ 0,00"
                className={cn(inputBase, gratuitoVigente ? 'opacity-50 cursor-not-allowed' : '', erroVisivel('valorSessao') ? inputErro : inputOk)}
              />
              {gratuitoVigente ? (
                <p className="text-[11px] text-muted-foreground">Valor zerado durante o período gratuito</p>
              ) : tentouSalvar && valorInsuficiente ? (
                <p className="text-[11px] text-red-500">Valor mínimo: R$ 1,00</p>
              ) : null}
            </div>
            <div className="space-y-1">
              <label className={cn('text-xs font-medium', erroVisivel('dataInicio') ? 'text-red-500' : 'text-muted-foreground')}>
                Data de Início <span className="text-red-400">*</span>
              </label>
              <DatePicker
                value={form.dataInicio}
                onChange={v => f('dataInicio', v)}
                placeholder="Selecionar data"
                hasError={erroVisivel('dataInicio')}
              />
            </div>

            {/* Gratuito checkbox */}
            <div className="space-y-3 sm:col-span-2">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <div
                  className={cn(
                    'flex h-5 w-5 items-center justify-center rounded border-2 transition-colors',
                    form.gratuito
                      ? 'border-[#04c2fb] bg-[#04c2fb]'
                      : 'border-gray-300 bg-white hover:border-gray-400'
                  )}
                  onClick={() => f('gratuito', !form.gratuito)}
                >
                  {form.gratuito && (
                    <svg viewBox="0 0 12 10" className="h-3 w-3 text-white" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 5l3 3 7-7" />
                    </svg>
                  )}
                </div>
                <span className="text-sm font-medium text-gray-700">Período gratuito</span>
              </label>

              {form.gratuito && (
                <div className="grid grid-cols-2 gap-3 pl-7">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Início período gratuito</label>
                    <DatePicker
                      value={form.gratuitoInicio}
                      onChange={v => f('gratuitoInicio', v)}
                      placeholder="Selecionar data"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Fim período gratuito</label>
                    <DatePicker
                      value={form.gratuitoFim}
                      onChange={v => f('gratuitoFim', v)}
                      placeholder="Selecionar data"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Status + Data Fim condicional */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <button
                type="button"
                onClick={() => f('ativo', !form.ativo)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                  form.ativo ? 'border-green-200 bg-green-50 text-green-700' : 'border-gray-200 bg-gray-50 text-gray-500'
                )}
              >
                <span className={cn('h-2 w-2 rounded-full', form.ativo ? 'bg-green-500' : 'bg-gray-400')} />
                {form.ativo ? 'Ativo' : 'Inativo'}
              </button>
            </div>
            {!form.ativo && (
              <div className="space-y-1">
                <label className={cn('text-xs font-medium', tentouSalvar && form.dataFim.trim() === '' ? 'text-red-500' : 'text-muted-foreground')}>
                  Data de Fim <span className="text-red-400">*</span>
                </label>
                <DatePicker
                  value={form.dataFim}
                  onChange={v => f('dataFim', v)}
                  placeholder="Selecionar data"
                  hasError={tentouSalvar && form.dataFim.trim() === ''}
                />
              </div>
            )}
          </div>
        </div>

        {/* Mensagem de erro */}
        {tentouSalvar && camposFaltando.length > 0 && (
          <div className="mx-6 mb-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
            <p className="text-xs font-semibold text-red-600">
              Preencha os campos obrigatórios para continuar:
            </p>
            <p className="text-xs text-red-500 mt-1">
              {camposFaltando.join(' · ')}
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
          <button
            onClick={tentarFechar}
            className="rounded-lg border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-gray-100 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={tentarSalvar}
            className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors hover:brightness-110"
            style={{ background: 'linear-gradient(135deg, #0094c8 0%, #04c2fb 60%, #00d5f5 100%)' }}
          >
            Salvar Paciente
          </button>
        </div>
      </div>
    </div>
    </ModalPortal>
  )
}

const colunas: { key: SortKey; label: string }[] = [
  { key: 'nome',           label: 'Nome'          },
  { key: 'responsavel',    label: 'Responsável'   },
  { key: 'dataNascimento', label: 'Dt. Nascimento' },
  { key: 'valorSessao',    label: 'Valor/Sessão'  },
  { key: 'ativo',          label: 'Status'        },
  { key: 'dataInicio',     label: 'Data Início'   },
  { key: 'dataFim',        label: 'Data Fim'      },
]

function HighlightMatch({ texto, busca }: { texto: string; busca: string }) {
  if (!busca.trim()) return <>{texto}</>
  const regex = new RegExp(`(${busca.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  const partes = texto.split(regex)
  return (
    <>
      {partes.map((parte, i) =>
        regex.test(parte) ? (
          <mark key={i} className="bg-[#04c2fb]/20 text-[#0094c8] rounded-sm px-0.5 font-semibold not-italic">
            {parte}
          </mark>
        ) : (
          <span key={i}>{parte}</span>
        )
      )}
    </>
  )
}

function StatusBadge({ paciente }: { paciente: Paciente }) {
  const pausado = isPacientePausado(paciente)
  if (pausado) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-medium text-amber-600">
        <Pause className="h-2.5 w-2.5" />
        Pausado
      </span>
    )
  }
  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
      paciente.ativo ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
    )}>
      <span className={cn('h-1.5 w-1.5 rounded-full', paciente.ativo ? 'bg-green-500' : 'bg-gray-400')} />
      {paciente.ativo ? 'Ativo' : 'Inativo'}
    </span>
  )
}

export default function PacientesPage() {
  const router = useRouter()
  const [pacientes, setPacientes] = useState<Paciente[]>(pacientesIniciais)
  const [abrirModal, setAbrirModal] = useState(false)
  const [filtroAtivo, setFiltroAtivo] = useState<'todos' | 'ativos' | 'pausados' | 'inativos'>('ativos')
  const [sortKey, setSortKey] = useState<SortKey>('nome')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [busca, setBusca] = useState('')
  const inputBuscaRef = useRef<HTMLInputElement>(null)

  const totalAtivos = pacientes.filter(p => p.ativo).length
  const totalPausados = pacientes.filter(p => isPacientePausado(p)).length
  const totalAtendidos = new Set(registrosIniciais.map(r => r.paciente)).size

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    const filtered = pacientes.filter(p => {
      if (filtroAtivo === 'ativos')   return p.ativo && !isPacientePausado(p)
      if (filtroAtivo === 'pausados') return isPacientePausado(p)
      if (filtroAtivo === 'inativos') return !p.ativo
      return true
    }).filter(p =>
      !termo || p.nome.toLowerCase().includes(termo)
    )

    return [...filtered].sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case 'nome':
        case 'responsavel':
          cmp = a[sortKey].localeCompare(b[sortKey], 'pt-BR')
          break
        case 'dataNascimento':
        case 'dataInicio':
          cmp = parseDateBR(a[sortKey]) - parseDateBR(b[sortKey])
          break
        case 'dataFim':
          cmp = parseDateBR(a.dataFim) - parseDateBR(b.dataFim)
          break
        case 'valorSessao':
          cmp = parseValor(a.valorSessao) - parseValor(b.valorSessao)
          break
        case 'ativo':
          cmp = (a.ativo === b.ativo) ? 0 : a.ativo ? -1 : 1
          break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [pacientes, filtroAtivo, sortKey, sortDir, busca])

  function salvar(form: FormState) {
    const fmt = (v: string) => v ? new Date(v).toLocaleDateString('pt-BR') : '-'
    const novo: Paciente = {
      id: Date.now(),
      ativo: form.ativo,
      nome: form.nome,
      dataNascimento: fmt(form.dataNascimento),
      responsavel: form.responsavel || '-',
      dataAnamnese: fmt(form.dataAnamnese),
      valorSessao: form.valorSessao ? formatValorBRL(form.valorSessao) : '-',
      gratuito: form.gratuito,
      gratuitoInicio: form.gratuito ? fmt(form.gratuitoInicio) : '-',
      gratuitoFim: form.gratuito ? fmt(form.gratuitoFim) : '-',
      dataInicio: fmt(form.dataInicio),
      dataFim: !form.ativo && form.dataFim ? fmt(form.dataFim) : null,
    }
    setPacientes(prev => [novo, ...prev])
    setAbrirModal(false)
    toast.success('Paciente cadastrado', { description: `${form.nome} foi adicionado com sucesso.` })
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 text-gray-300" />
    return sortDir === 'asc'
      ? <ArrowUp className="h-3 w-3 text-[#04c2fb]" />
      : <ArrowDown className="h-3 w-3 text-[#04c2fb]" />
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {abrirModal && <ModalNovoPaciente onSalvar={salvar} onFechar={() => setAbrirModal(false)} />}

      {/* Cabeçalho */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Pacientes</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gerencie os pacientes da clínica</p>
        </div>
        <button
          onClick={() => setAbrirModal(true)}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors hover:brightness-110"
          style={{ background: 'linear-gradient(135deg, #0094c8 0%, #04c2fb 60%, #00d5f5 100%)' }}
        >
          <Plus className="h-4 w-4" />
          Novo Paciente
        </button>
      </div>

      {/* Cards contadores */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total de Pacientes Ativos</p>
              <p className="mt-2 text-2xl font-bold tracking-tight">{totalAtivos}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">pacientes ativos</p>
            </div>
            <div className="rounded-lg p-2.5 bg-blue-500/10">
              <Users className="h-4 w-4 text-blue-500" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Pacientes Atendidos</p>
              <p className="mt-2 text-2xl font-bold tracking-tight">{totalAtendidos}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">ao longo do histórico</p>
            </div>
            <div className="rounded-lg p-2.5 bg-violet-500/10">
              <History className="h-4 w-4 text-violet-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Alerta de pacientes pausados */}
      {totalPausados > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 sm:px-5 sm:py-3.5 flex items-start gap-3">
          <div className="rounded-lg p-2 bg-amber-100 shrink-0 mt-0.5">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800">
              {totalPausados} paciente{totalPausados > 1 ? 's' : ''} pausado{totalPausados > 1 ? 's' : ''}
            </p>
            <p className="text-xs text-amber-600 mt-0.5 leading-relaxed">
              {totalPausados > 1
                ? 'O periodo gratuito desses pacientes expirou e nenhum valor de sessao foi definido. Nenhum agendamento pode ser criado ate que os valores sejam configurados. Caso o paciente não continue o tratamento desative ele.'
                : 'O periodo gratuito deste paciente expirou e nenhum valor de sessao foi definido. Nenhum agendamento pode ser criado ate que o valor seja configurado. Caso o paciente não continue o tratamento desative ele.'
              }
            </p>
          </div>
        </div>
      )}

      {/* Pesquisa + Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Campo de pesquisa */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            ref={inputBuscaRef}
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Pesquisar por nome..."
            className="w-full rounded-lg border border-gray-200 bg-white/80 pl-9 pr-9 py-2 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#04c2fb]/40 focus:border-[#04c2fb]/60 placeholder:text-muted-foreground/60"
          />
          {busca && (
            <button
              onClick={() => { setBusca(''); inputBuscaRef.current?.focus() }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-gray-100 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Filtros de status */}
        <div className="flex items-center gap-2 flex-wrap">
          {(['todos', 'ativos', 'pausados', 'inativos'] as const).filter(f => f !== 'pausados' || totalPausados > 0).map(f => (
            <button
              key={f}
              onClick={() => setFiltroAtivo(f)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors inline-flex items-center gap-1.5',
                filtroAtivo === f
                  ? 'text-white'
                  : f === 'pausados' && totalPausados > 0
                    ? 'border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                    : 'border bg-background text-muted-foreground hover:bg-muted'
              )}
              style={filtroAtivo === f ? { background: f === 'pausados' ? 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)' : 'linear-gradient(135deg, #0094c8 0%, #04c2fb 60%, #00d5f5 100%)' } : undefined}
            >
              {f === 'todos' ? 'Todos' : f === 'ativos' ? 'Ativos' : f === 'pausados' ? 'Pausados' : 'Inativos'}
              {f === 'pausados' && totalPausados > 0 && (
                <span className={cn(
                  'flex items-center justify-center h-4 min-w-4 rounded-full text-[10px] font-bold px-1',
                  filtroAtivo === 'pausados' ? 'bg-white/30 text-white' : 'bg-amber-500 text-white',
                )}>
                  {totalPausados}
                </span>
              )}
            </button>
          ))}

          <span className="text-xs text-muted-foreground ml-2">
            {lista.length} paciente(s)
            {busca.trim() && <span className="text-[#0094c8] font-medium"> · "{busca.trim()}"</span>}
          </span>
        </div>
      </div>

      {/* Tabela */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                {/* Nome — sempre visível */}
                <th
                  onClick={() => handleSort('nome')}
                  className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors"
                >
                  <span className="inline-flex items-center gap-1.5">
                    Nome
                    <SortIcon col="nome" />
                  </span>
                </th>
                {/* Colunas apenas desktop */}
                {colunas.filter(c => c.key !== 'nome').map(col => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className="hidden md:table-cell px-4 py-3 text-left text-xs font-semibold text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      {col.label}
                      <SortIcon col={col.key} />
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {lista.map(p => (
                <tr
                  key={p.id}
                  onClick={() => router.push(`/dashboard/pacientes/${p.id}`)}
                  className="hover:bg-muted/20 transition-colors cursor-pointer"
                >
                  {/* Nome — com info extra no mobile */}
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-800">
                      <HighlightMatch texto={p.nome} busca={busca} />
                    </div>
                    <div className="flex items-center gap-2 mt-1 md:hidden">
                      <StatusBadge paciente={p} />
                      <span className="text-[11px] text-muted-foreground">{p.responsavel}</span>
                    </div>
                  </td>
                  {/* Colunas apenas desktop */}
                  <td className="hidden md:table-cell px-4 py-3 text-muted-foreground">{p.responsavel}</td>
                  <td className="hidden md:table-cell px-4 py-3 text-muted-foreground">{p.dataNascimento}</td>
                  <td className="hidden md:table-cell px-4 py-3 font-medium">{isGratuitoVigenteBR(p.gratuito, p.gratuitoInicio, p.gratuitoFim) ? 'R$ 0,00' : p.valorSessao}</td>
                  <td className="hidden md:table-cell px-4 py-3">
                    <StatusBadge paciente={p} />
                  </td>
                  <td className="hidden md:table-cell px-4 py-3 text-muted-foreground">{p.dataInicio}</td>
                  <td className="hidden md:table-cell px-4 py-3 text-muted-foreground">{p.dataFim ?? '—'}</td>
                </tr>
              ))}
              {lista.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Search className="h-8 w-8 text-muted-foreground/30" />
                      <p className="text-sm font-medium text-muted-foreground">
                        {busca.trim()
                          ? <>Nenhum paciente encontrado para <span className="text-[#0094c8] font-semibold">&ldquo;{busca.trim()}&rdquo;</span></>
                          : 'Nenhum paciente encontrado.'}
                      </p>
                      {busca.trim() && (
                        <button
                          onClick={() => setBusca('')}
                          className="text-xs text-[#04c2fb] hover:underline mt-1"
                        >
                          Limpar pesquisa
                        </button>
                      )}
                    </div>
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
