'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Users, Plus, X, ArrowUpDown, ArrowUp, ArrowDown, Search, Loader2 } from 'lucide-react'
import { cn, hoje } from '@/lib/utils'
import { usePacientes, useCriarPaciente } from '@/hooks/use-pacientes'
import { usePacotes } from '@/hooks/use-planos'
import type { Paciente as ApiPaciente } from '@/types'
import { ConfirmDiscard } from '@/components/confirm-discard'
import { ModalPortal } from '@/components/modal-portal'
import { DatePicker } from '@/components/ui/date-picker'
import { BirthdatePicker } from '@/components/ui/birthdate-picker'
import { toast } from 'sonner'

type Paciente = {
  id: string  // UUID
  ativo: boolean
  nome: string
  dataNascimento: string
  responsavel: string
  dataAnamnese: string
  dataInicio: string
  pacoteId: string | null
  cobranca: 'por_atendimento' | 'mensal' | null
  cpf?: string
  endereco?: string
  cidade?: string
  estado?: string
}


type FormState = {
  nome: string
  responsavel: string
  dataNascimento: string
  dataAnamnese: string
  dataInicio: string
  cpf: string
  cep: string
  logradouro: string
  numero: string
  complemento: string
  bairro: string
  cidade: string
  estado: string
}

function formInicial(): FormState {
  const h = hoje()
  return {
    nome: '', responsavel: '', dataNascimento: h, dataAnamnese: h,
    dataInicio: h, cpf: '', cep: '', logradouro: '', numero: '',
    complemento: '', bairro: '', cidade: '', estado: '',
  }
}

type SortKey = 'nome' | 'responsavel' | 'dataNascimento' | 'ativo' | 'dataInicio' | 'pacoteId' | 'cobranca'
type SortDir = 'asc' | 'desc'

function parseDateBR(d: string | null): number {
  if (!d || d === '-' || d === '—') return 0
  const [day, month, year] = d.split('/')
  return new Date(`${year}-${month}-${day}`).getTime()
}

function maskCPF(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

function maskCEP(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 8)
  if (d.length <= 5) return d
  return `${d.slice(0, 5)}-${d.slice(5)}`
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
  const [buscandoCEP, setBuscandoCEP] = useState(false)
  const ehAdultoAnteriorRef = useRef<boolean | null>(null)

  const ehAdulto = useMemo(() => {
    if (!form.dataNascimento) return false
    const nasc = new Date(form.dataNascimento)
    if (isNaN(nasc.getTime())) return false
    const agora = new Date()
    const aniversarioEsteAno = new Date(agora.getFullYear(), nasc.getMonth(), nasc.getDate())
    const idade = agora.getFullYear() - nasc.getFullYear() - (agora < aniversarioEsteAno ? 1 : 0)
    return idade >= 18
  }, [form.dataNascimento])

  // Limpa campos do modo anterior ao alternar menor/adulto
  useEffect(() => {
    if (ehAdultoAnteriorRef.current === null) {
      ehAdultoAnteriorRef.current = ehAdulto
      return
    }
    if (ehAdultoAnteriorRef.current === ehAdulto) return
    ehAdultoAnteriorRef.current = ehAdulto
    if (ehAdulto) {
      setForm(prev => ({ ...prev, responsavel: '' }))
    } else {
      setForm(prev => ({ ...prev, cpf: '', cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '' }))
    }
  }, [ehAdulto])

  function f(field: keyof FormState, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function handleCPF(v: string) {
    f('cpf', maskCPF(v))
  }

  async function handleCEP(v: string) {
    const masked = maskCEP(v)
    f('cep', masked)
    const digits = masked.replace(/\D/g, '')
    if (digits.length !== 8) return
    setBuscandoCEP(true)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
      const data = await res.json()
      if (data.erro) {
        toast.error('CEP não encontrado')
      } else {
        setForm(prev => ({
          ...prev,
          logradouro: data.logradouro ?? '',
          bairro:     data.bairro     ?? '',
          cidade:     data.localidade ?? '',
          estado:     data.uf         ?? '',
        }))
      }
    } catch {
      toast.error('Erro ao buscar CEP')
    } finally {
      setBuscandoCEP(false)
    }
  }

  const camposObrigatorios: { key: keyof FormState; label: string }[] = ehAdulto
    ? [
        { key: 'nome',           label: 'Nome completo'   },
        { key: 'dataNascimento', label: 'Data de Nascimento' },
        { key: 'dataAnamnese',   label: 'Data da Anamnese' },
        { key: 'dataInicio',     label: 'Data de Início'  },
        { key: 'cpf',            label: 'CPF'             },
        { key: 'cep',            label: 'CEP'             },
      ]
    : [
        { key: 'nome',           label: 'Nome completo'   },
        { key: 'responsavel',    label: 'Responsável'     },
        { key: 'dataNascimento', label: 'Data de Nascimento' },
        { key: 'dataAnamnese',   label: 'Data da Anamnese' },
        { key: 'dataInicio',     label: 'Data de Início'  },
      ]

  function campoVazio(key: keyof FormState): boolean {
    return form[key].trim() === ''
  }

  function erroVisivel(key: keyof FormState): boolean {
    return tentouSalvar && campoVazio(key) && camposObrigatorios.some(c => c.key === key)
  }

  const formularioValido = camposObrigatorios.every(c => !campoVazio(c.key))

  const temDados = form.nome.trim() !== '' || form.responsavel.trim() !== '' || form.cpf.trim() !== ''

  const camposFaltando = tentouSalvar
    ? camposObrigatorios.filter(c => campoVazio(c.key)).map(c => c.label)
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
          className="w-full max-w-2xl rounded-2xl border border-white/30 shadow-2xl flex flex-col max-h-[90vh]"
          style={{ backdropFilter: 'blur(20px)', backgroundColor: 'rgba(255,255,255,0.92)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
            <div>
              <h2 className="text-base font-semibold tracking-tight">Novo Paciente</h2>
              {ehAdulto && (
                <p className="text-[11px] text-[#0094c8] mt-0.5 font-medium">Paciente adulto</p>
              )}
            </div>
            <button
              onClick={tentarFechar}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-gray-100 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body — scrollável */}
          <div className="px-6 py-5 space-y-4 overflow-y-auto">

            {/* Campos base */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {/* Nome — sempre */}
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

              {/* Data de Nascimento — sempre (primeiro para acionar lógica menor/adulto) */}
              <div className="space-y-1">
                <label className={cn('text-xs font-medium', erroVisivel('dataNascimento') ? 'text-red-500' : 'text-muted-foreground')}>
                  Data de Nascimento <span className="text-red-400">*</span>
                </label>
                <BirthdatePicker
                  value={form.dataNascimento}
                  onChange={v => f('dataNascimento', v)}
                  hasError={erroVisivel('dataNascimento')}
                />
              </div>

              {/* Responsável — apenas menor */}
              {!ehAdulto && (
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
              )}

              {/* CPF — apenas adulto */}
              {ehAdulto && (
                <div className="space-y-1">
                  <label className={cn('text-xs font-medium', erroVisivel('cpf') ? 'text-red-500' : 'text-muted-foreground')}>
                    CPF <span className="text-red-400">*</span>
                  </label>
                  <input
                    value={form.cpf}
                    onChange={e => handleCPF(e.target.value)}
                    placeholder="000.000.000-00"
                    inputMode="numeric"
                    className={cn(inputBase, erroVisivel('cpf') ? inputErro : inputOk)}
                  />
                </div>
              )}

              {/* Data da Anamnese */}
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

              {/* Data de Início */}
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
            </div>

            {/* Seção de endereço — apenas adulto */}
            {ehAdulto && (
              <div className="space-y-3">
                <div className="flex items-center gap-3 pt-1">
                  <div className="h-px flex-1 bg-gray-200" />
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Endereço</span>
                  <div className="h-px flex-1 bg-gray-200" />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {/* CEP */}
                  <div className="space-y-1">
                    <label className={cn('text-xs font-medium', erroVisivel('cep') ? 'text-red-500' : 'text-muted-foreground')}>
                      CEP <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <input
                        value={form.cep}
                        onChange={e => handleCEP(e.target.value)}
                        placeholder="00000-000"
                        inputMode="numeric"
                        className={cn(inputBase, erroVisivel('cep') ? inputErro : inputOk, buscandoCEP && 'pr-9')}
                      />
                      {buscandoCEP && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#04c2fb] animate-spin" />
                      )}
                    </div>
                  </div>

                  {/* Número */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Número</label>
                    <input
                      value={form.numero}
                      onChange={e => f('numero', e.target.value)}
                      placeholder="Ex: 123"
                      className={cn(inputBase, inputOk)}
                    />
                  </div>

                  {/* Logradouro */}
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-medium text-muted-foreground">Logradouro</label>
                    <input
                      value={form.logradouro}
                      onChange={e => f('logradouro', e.target.value)}
                      placeholder="Rua, Avenida..."
                      className={cn(inputBase, inputOk)}
                    />
                  </div>

                  {/* Bairro */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Bairro</label>
                    <input
                      value={form.bairro}
                      onChange={e => f('bairro', e.target.value)}
                      placeholder="Bairro"
                      className={cn(inputBase, inputOk)}
                    />
                  </div>

                  {/* Cidade + UF */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1 col-span-2">
                      <label className="text-xs font-medium text-muted-foreground">Cidade</label>
                      <input
                        value={form.cidade}
                        onChange={e => f('cidade', e.target.value)}
                        placeholder="Cidade"
                        className={cn(inputBase, inputOk)}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">UF</label>
                      <input
                        value={form.estado}
                        onChange={e => f('estado', e.target.value.toUpperCase().slice(0, 2))}
                        placeholder="PR"
                        maxLength={2}
                        className={cn(inputBase, inputOk, 'uppercase')}
                      />
                    </div>
                  </div>

                  {/* Complemento */}
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-medium text-muted-foreground">Complemento</label>
                    <input
                      value={form.complemento}
                      onChange={e => f('complemento', e.target.value)}
                      placeholder="Apto, sala, bloco..."
                      className={cn(inputBase, inputOk)}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Mensagem de erro */}
          {tentouSalvar && camposFaltando.length > 0 && (
            <div className="mx-6 mb-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 shrink-0">
              <p className="text-xs font-semibold text-red-600">
                Preencha os campos obrigatórios para continuar:
              </p>
              <p className="text-xs text-red-500 mt-1">
                {camposFaltando.join(' · ')}
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100 shrink-0">
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
  { key: 'nome',        label: 'Nome'        },
  { key: 'responsavel', label: 'Responsável' },
  { key: 'ativo',       label: 'Status'      },
  { key: 'dataInicio',  label: 'Data Início' },
  { key: 'pacoteId',    label: 'Plano'       },
  { key: 'cobranca',    label: 'Cobrança'    },
]

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 text-gray-300" />
  return sortDir === 'asc'
    ? <ArrowUp className="h-3 w-3 text-[#04c2fb]" />
    : <ArrowDown className="h-3 w-3 text-[#04c2fb]" />
}

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

function _fmtIso(iso: string | null | undefined): string {
  if (!iso) return '-'
  const [y, m, d] = iso.split('T')[0].split('-')
  return `${d}/${m}/${y}`
}

function apiParaLocal(p: ApiPaciente): Paciente {
  const extras = (p.dados_extras ?? {}) as Record<string, unknown>
  return {
    id: String(p.id),
    ativo: p.ativo,
    nome: p.nome,
    dataNascimento: _fmtIso(p.data_nascimento),
    responsavel: (extras.responsavel as string) || '-',
    dataAnamnese: _fmtIso(extras.data_anamnese as string | undefined),
    dataInicio: _fmtIso(extras.data_inicio as string | undefined),
    pacoteId: (p.plano_atendimento?.pacoteId as string | null) ?? (extras.pacote_id as string | null) ?? null,
    cobranca: (p.plano_atendimento?.cobranca as 'por_atendimento' | 'mensal' | null) ?? (extras.cobranca as 'por_atendimento' | 'mensal' | null) ?? null,
    ...(p.cpf && { cpf: p.cpf }),
  }
}

export default function PacientesPage() {
  const router = useRouter()
  const { data: pacotesData } = usePacotes()
  const [abrirModal, setAbrirModal] = useState(false)
  const [filtroAtivo, setFiltroAtivo] = useState<'todos' | 'ativos' | 'inativos'>('ativos')
  const [sortKey, setSortKey] = useState<SortKey>('nome')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [busca, setBusca] = useState('')
  const inputBuscaRef = useRef<HTMLInputElement>(null)
  const criarPaciente = useCriarPaciente()

  const { data: apiData, isLoading, isError } = usePacientes()
  const pacientes: Paciente[] = (apiData?.items ?? []).map(apiParaLocal)

  const totalAtivos = pacientes.filter(p => p.ativo).length

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
      if (filtroAtivo === 'ativos')   return p.ativo
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
        case 'ativo':
          cmp = (a.ativo === b.ativo) ? 0 : a.ativo ? -1 : 1
          break
        case 'pacoteId':
          cmp = (a.pacoteId ?? '').localeCompare(b.pacoteId ?? '', 'pt-BR')
          break
        case 'cobranca':
          cmp = (a.cobranca ?? '').localeCompare(b.cobranca ?? '', 'pt-BR')
          break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [pacientes, filtroAtivo, sortKey, sortDir, busca])

  function salvar(form: FormState) {
    const temEndereco = [form.logradouro, form.bairro, form.cidade].some(Boolean)
    criarPaciente.mutate(
      {
        nome: form.nome,
        ...(form.cpf && { cpf: form.cpf }),
        ...(form.dataNascimento && { data_nascimento: form.dataNascimento }),
        dados_extras: {
          ...(form.responsavel && { responsavel: form.responsavel }),
          ...(form.dataAnamnese && { data_anamnese: form.dataAnamnese }),
          ...(form.dataInicio && { data_inicio: form.dataInicio }),
        },
        ...(temEndereco && {
          endereco: {
            ...(form.cep && { cep: form.cep }),
            ...(form.logradouro && { logradouro: form.logradouro }),
            ...(form.numero && { numero: form.numero }),
            ...(form.complemento && { complemento: form.complemento }),
            ...(form.bairro && { bairro: form.bairro }),
            ...(form.cidade && { cidade: form.cidade }),
            ...(form.estado && { estado: form.estado }),
          },
        }),
      },
      {
        onSuccess: () => {
          setAbrirModal(false)
          toast.success('Paciente cadastrado', { description: `${form.nome} foi adicionado com sucesso.` })
        },
        onError: (err) => {
          toast.error('Erro ao cadastrar paciente', { description: err.message })
        },
      }
    )
  }


  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 max-w-7xl mx-auto">
        <p className="text-sm font-medium text-muted-foreground">Erro ao carregar pacientes. Tente recarregar a página.</p>
      </div>
    )
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

      {/* Card contador */}
      <div className="max-w-xs">
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
      </div>

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
          {(['todos', 'ativos', 'inativos'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFiltroAtivo(f)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors inline-flex items-center gap-1.5',
                filtroAtivo === f
                  ? 'text-white'
                  : 'border bg-background text-muted-foreground hover:bg-muted'
              )}
              style={filtroAtivo === f ? { background: 'linear-gradient(135deg, #0094c8 0%, #04c2fb 60%, #00d5f5 100%)' } : undefined}
            >
              {f === 'todos' ? 'Todos' : f === 'ativos' ? 'Ativos' : 'Inativos'}
            </button>
          ))}

          <span className="text-xs text-muted-foreground ml-2">
            {lista.length} paciente(s)
            {busca.trim() && <span className="text-[#0094c8] font-medium"> · &ldquo;{busca.trim()}&rdquo;</span>}
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
                    <SortIcon col="nome" sortKey={sortKey} sortDir={sortDir} />
                  </span>
                </th>
                {/* Colunas sortáveis (desktop) */}
                {colunas.filter(c => c.key !== 'nome').map(col => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className="hidden md:table-cell px-4 py-3 text-left text-xs font-semibold text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      {col.label}
                      <SortIcon col={col.key} sortKey={sortKey} sortDir={sortDir} />
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center">
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Carregando pacientes...</span>
                    </div>
                  </td>
                </tr>
              )}
              {!isLoading && lista.map(p => (
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
                      <span className={cn(
                        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
                        p.ativo ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                      )}>
                        <span className={cn('h-1.5 w-1.5 rounded-full', p.ativo ? 'bg-green-500' : 'bg-gray-400')} />
                        {p.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                      <span className="text-[11px] text-muted-foreground">{p.responsavel}</span>
                    </div>
                  </td>
                  {/* Colunas apenas desktop */}
                  <td className="hidden md:table-cell px-4 py-3 text-muted-foreground">{p.responsavel}</td>
                  <td className="hidden md:table-cell px-4 py-3">
                    <span className={cn(
                      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
                      p.ativo ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                    )}>
                      <span className={cn('h-1.5 w-1.5 rounded-full', p.ativo ? 'bg-green-500' : 'bg-gray-400')} />
                      {p.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="hidden md:table-cell px-4 py-3 text-muted-foreground">{p.dataInicio}</td>
                  {/* Plano de atendimento */}
                  <td className="hidden md:table-cell px-4 py-3">
                    {p.pacoteId
                      ? <span className="inline-flex items-center rounded-md bg-[#04c2fb]/10 px-2 py-0.5 text-[11px] font-medium text-[#0094c8] ring-1 ring-inset ring-[#04c2fb]/20">
                          {pacotesData?.items.find(pk => pk.id === p.pacoteId)?.nome ?? p.pacoteId}
                        </span>
                      : <span className="text-[11px] text-muted-foreground/50">Sem plano</span>
                    }
                  </td>
                  {/* Tipo de cobranca */}
                  <td className="hidden md:table-cell px-4 py-3">
                    {p.cobranca === 'por_atendimento' && (
                      <span className="inline-flex items-center rounded-md bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-700 ring-1 ring-inset ring-violet-200">
                        Por sessao
                      </span>
                    )}
                    {p.cobranca === 'mensal' && (
                      <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
                        Mensalidade
                      </span>
                    )}
                    {!p.cobranca && (
                      <span className="text-[11px] text-muted-foreground/50">-</span>
                    )}
                  </td>
                </tr>
              ))}
              {!isLoading && lista.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
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
