'use client'

import React, { useRef, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Users,
  DollarSign,
  BookOpen,
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  AlertTriangle,
  ArrowLeft,
  RotateCcw,
  ArrowRight,
  FileSpreadsheet,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { apiFetch } from '@/lib/api'
import { toast } from 'sonner'

// ── Tipos ─────────────────────────────────────────────────────────────────────

type Modulo = 'pacientes' | 'financeiro' | 'registros'
type Step = 'upload' | 'preview' | 'result'

interface PreviewRow {
  linha: number
  valido: boolean
  dados: Record<string, unknown>
  erros: string[]
}

interface PreviewResponse {
  rows: PreviewRow[]
  valid_count: number
  error_count: number
  total: number
}

interface ResultadoImport {
  importados: number
  erros: Array<{ indice: number; erro: string }>
}

// ── Configuração dos módulos ───────────────────────────────────────────────────

type ColInfo = { campo: string; desc: string; obrigatorio: boolean }

const MODULOS: Record<Modulo, { label: string; icon: React.ElementType; colunas: string[]; descricao: string; exemplo: string; cor: string; corBg: string; corBorda: string }> = {
  pacientes: {
    label: 'Pacientes',
    icon: Users,
    colunas: ['nome', 'cpf', 'data_nascimento', 'telefone', 'email', 'status', 'responsavel'],
    descricao: 'Importe o cadastro completo dos seus pacientes com dados de contato e informações pessoais.',
    exemplo: 'Nome, CPF, telefone, e-mail...',
    cor: 'text-[#04c2fb]',
    corBg: 'bg-[#04c2fb]/10',
    corBorda: 'border-[#04c2fb]',
  },
  financeiro: {
    label: 'Financeiro',
    icon: DollarSign,
    colunas: ['tipo', 'descricao', 'valor', 'status', 'data_referencia', 'data_pagamento', 'paciente_nome'],
    descricao: 'Traga o histórico de receitas e despesas da clínica, incluindo pagamentos de sessões passadas.',
    exemplo: 'Tipo, valor, status, data de referência...',
    cor: 'text-emerald-600',
    corBg: 'bg-emerald-50',
    corBorda: 'border-emerald-400',
  },
  registros: {
    label: 'Registros de Sessão',
    icon: BookOpen,
    colunas: ['paciente_nome', 'data_sessao', 'tipo_sessao', 'presenca', 'valor_sessao', 'conteudo'],
    descricao: 'Importe anotações e registros de sessões anteriores vinculadas aos seus pacientes.',
    exemplo: 'Paciente, data, presença, anotações...',
    cor: 'text-violet-600',
    corBg: 'bg-violet-50',
    corBorda: 'border-violet-400',
  },
}

const COLUNAS_INFO: Record<Modulo, ColInfo[]> = {
  pacientes: [
    { campo: 'nome', desc: 'Nome completo do paciente', obrigatorio: true },
    { campo: 'cpf', desc: 'CPF com ou sem formatação', obrigatorio: false },
    { campo: 'data_nascimento', desc: 'Data no formato DD/MM/AAAA', obrigatorio: false },
    { campo: 'telefone', desc: 'Telefone com DDD', obrigatorio: false },
    { campo: 'email', desc: 'E-mail válido', obrigatorio: false },
    { campo: 'status', desc: 'Digite "ativo" ou "inativo" (padrão: ativo)', obrigatorio: false },
    { campo: 'responsavel', desc: 'Nome do responsável ou acompanhante', obrigatorio: false },
  ],
  financeiro: [
    { campo: 'tipo', desc: 'Digite "receita" ou "despesa"', obrigatorio: true },
    { campo: 'descricao', desc: 'Descrição do lançamento', obrigatorio: true },
    { campo: 'valor', desc: 'Valor em reais, ex: 200,00 (sem R$)', obrigatorio: true },
    { campo: 'status', desc: '"pendente", "pago", "atrasado" ou "cancelado"', obrigatorio: false },
    { campo: 'data_referencia', desc: 'Mês de competência no formato MM/AAAA, ex: 04/2025 (padrão: mês atual)', obrigatorio: false },
    { campo: 'data_pagamento', desc: 'Data em que o pagamento foi realizado (DD/MM/AAAA)', obrigatorio: false },
    { campo: 'paciente_nome', desc: 'Nome exato do paciente já cadastrado', obrigatorio: false },
  ],
  registros: [
    { campo: 'paciente_nome', desc: 'Nome exato do paciente já cadastrado', obrigatorio: true },
    { campo: 'data_sessao', desc: 'Data da sessão no formato DD/MM/AAAA', obrigatorio: true },
    { campo: 'tipo_sessao', desc: 'Ex: Psicoterapia, Anamnese, Avaliação', obrigatorio: false },
    { campo: 'presenca', desc: 'Digite "sim" ou "não"', obrigatorio: false },
    { campo: 'valor_sessao', desc: 'Valor cobrado, ex: 200,00 (sem R$)', obrigatorio: false },
    { campo: 'conteudo', desc: 'Anotações ou resumo da sessão', obrigatorio: false },
  ],
}

// ── Indicador de progresso ────────────────────────────────────────────────────

const PASSOS = ['Baixar modelo', 'Verificar dados', 'Concluir']
const STEP_INDEX: Record<Step, number> = { upload: 0, preview: 1, result: 2 }

function IndicadorPassos({ step }: { step: Step }) {
  const atual = STEP_INDEX[step]
  return (
    <div className="flex items-center gap-1 sm:gap-2">
      {PASSOS.map((nome, i) => (
        <div key={i} className="flex items-center gap-1 sm:gap-2">
          <div className="flex items-center gap-1.5">
            <div
              className={cn(
                'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-colors',
                i < atual
                  ? 'bg-emerald-500 text-white'
                  : i === atual
                  ? 'bg-[#04c2fb] text-white'
                  : 'bg-slate-100 text-slate-400',
              )}
            >
              {i < atual ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
            </div>
            <span
              className={cn(
                'hidden sm:block text-xs font-medium whitespace-nowrap',
                i === atual ? 'text-slate-800' : 'text-slate-400',
              )}
            >
              {nome}
            </span>
          </div>
          {i < PASSOS.length - 1 && (
            <ArrowRight className="h-3 w-3 shrink-0 text-slate-300" />
          )}
        </div>
      ))}
    </div>
  )
}

// ── Utilitários ───────────────────────────────────────────────────────────────

interface AnaliseErros {
  pacientesNaoEncontrados: string[]
  nomesAmbiguos: string[]
  pacienteNomeAusente: number
  camposAusentes: number
  formatosInvalidos: number
  totalLinhasComErro: number
}

function analisarErros(rows: PreviewRow[]): AnaliseErros {
  const pacientes = new Set<string>()
  const ambiguos = new Set<string>()
  let pacienteNomeAusente = 0
  let ausentes = 0
  let invalidos = 0

  for (const row of rows) {
    if (row.valido) continue
    let temAusente = false
    let temInvalido = false
    let temNomeAusente = false
    for (const e of row.erros) {
      const m = e.match(/^Paciente '(.+)' não encontrado/)
      if (m) pacientes.add(m[1])
      const a = e.match(/^Nome ambíguo: \d+ pacientes com nome '(.+)'/)
      if (a) ambiguos.add(a[1])
      if (e.includes('paciente_nome') && e.includes('obrigatório')) { temNomeAusente = true; continue }
      if (e.includes('obrigatório')) temAusente = true
      if (e.includes('inválid') || e.includes('negativo') || e.includes('longo')) temInvalido = true
    }
    if (temNomeAusente) pacienteNomeAusente++
    if (temAusente) ausentes++
    if (temInvalido) invalidos++
  }

  return {
    pacientesNaoEncontrados: Array.from(pacientes),
    nomesAmbiguos: Array.from(ambiguos),
    pacienteNomeAusente,
    camposAusentes: ausentes,
    formatosInvalidos: invalidos,
    totalLinhasComErro: rows.filter((r) => !r.valido).length,
  }
}

function resumirErros(erros: string[]): string {
  if (erros.length === 0) return ''
  const rotulos = erros.map((e) => {
    if (e.startsWith('Paciente') && e.includes('não encontrado')) return 'Paciente não encontrado'
    if (e.startsWith('Nome ambíguo')) return 'Nome duplicado na plataforma'
    if (e.includes('paciente_nome') && e.includes('obrigatório')) return 'Nome do paciente ausente'
    if (e.includes('nome é obrigatório')) return 'Nome ausente'
    if (e.includes('nome muito longo')) return 'Nome muito longo'
    if (e.includes('CPF inválido')) return 'CPF inválido'
    if (e.includes('data_nascimento')) return 'Data de nascimento inválida'
    if (e.includes('email inválido')) return 'E-mail inválido'
    if (e.includes('data_sessao') && e.includes('obrigatório')) return 'Data da sessão ausente'
    if (e.includes('data_sessao') && e.includes('inválid')) return 'Data da sessão inválida'
    if (e.includes('data_pagamento')) return 'Data de pagamento inválida'
    if (e.includes('valor_sessao') && e.includes('negativo')) return 'Valor negativo'
    if (e.includes('valor_sessao') && e.includes('inválid')) return 'Valor inválido'
    if (e.includes('valor') && e.includes('negativo')) return 'Valor negativo'
    if (e.includes('valor') && e.includes('inválid')) return 'Valor inválido'
    if (e.includes('tipo inválido')) return 'Tipo inválido'
    if (e.includes('descricao') && e.includes('obrigatório')) return 'Descrição ausente'
    if (e.includes('status inválido')) return 'Status inválido'
    return e
  })
  return [...new Set(rotulos)].join(', ')
}

function exibirValor(coluna: string, valor: unknown): string {
  if (valor === null || valor === undefined || valor === '') return ''
  // Datas ISO → DD/MM/AAAA
  if ((coluna === 'data_sessao' || coluna === 'data_nascimento' || coluna === 'data_pagamento' || coluna === 'data_referencia') && typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}/.test(valor)) {
    const [y, m, d] = valor.split('T')[0].split('-')
    return `${d}/${m}/${y}`
  }
  // Booleano de presença
  if (coluna === 'presenca' && typeof valor === 'boolean') {
    return valor ? 'sim' : 'não'
  }
  // Valores monetários
  if ((coluna === 'valor' || coluna === 'valor_sessao') && typeof valor === 'string') {
    const n = parseFloat(valor)
    if (!isNaN(n)) return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }
  return String(valor)
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function ConfiguracoesDadosPage() {
  const [modulo, setModulo] = useState<Modulo>('pacientes')
  const [step, setStep] = useState<Step>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<PreviewResponse | null>(null)
  const [resultado, setResultado] = useState<ResultadoImport | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const { label: moduloLabel, colunas } = MODULOS[modulo]
  const colunasInfo = COLUNAS_INFO[modulo]
  function selecionarModulo(m: Modulo) {
    setModulo(m)
    resetar()
  }

  function resetar() {
    setStep('upload')
    setFile(null)
    setPreview(null)
    setResultado(null)
    setDragging(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  function handleFile(f: File) {
    const ext = f.name.split('.').pop()?.toLowerCase()
    if (ext !== 'csv' && ext !== 'xlsx') {
      toast.error('Formato não aceito', { description: 'Envie um arquivo .xlsx (Excel) ou .csv.' })
      return
    }
    setFile(f)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) handleFile(f)
  }

  async function handleBaixarModelo() {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/import/${modulo}/template`,
        { headers: { Authorization: `Bearer ${await getToken()}` } }
      )
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `modelo_${modulo}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Modelo baixado', { description: 'Preencha e volte para enviar o arquivo.' })
    } catch {
      toast.error('Erro ao baixar modelo', { description: 'Verifique se o servidor está funcionando.' })
    }
  }

  async function handleAnalisar() {
    if (!file) return
    setLoading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const data = await apiFetchForm<PreviewResponse>(`/api/v1/import/${modulo}/preview`, form)
      setPreview(data)
      setStep('preview')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Não foi possível analisar o arquivo.'
      toast.error('Erro ao analisar', { description: msg })
    } finally {
      setLoading(false)
    }
  }

  async function handleImportar() {
    if (!preview) return
    const rowsValidas = preview.rows.filter((r) => r.valido).map((r) => r.dados)
    if (rowsValidas.length === 0) return

    setLoading(true)
    try {
      const data = await apiFetch<ResultadoImport>(`/api/v1/import/${modulo}/confirm`, {
        method: 'POST',
        body: JSON.stringify({ rows: rowsValidas }),
      })
      setResultado(data)
      setStep('result')
      toast.success(`${data.importados} ${moduloLabel.toLowerCase()} importado${data.importados !== 1 ? 's' : ''} com sucesso`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao importar.'
      toast.error('Falha na importação', { description: msg })
    } finally {
      setLoading(false)
    }
  }

  const analise: AnaliseErros =
    step === 'preview' && preview
      ? analisarErros(preview.rows)
      : { pacientesNaoEncontrados: [], nomesAmbiguos: [], pacienteNomeAusente: 0, camposAusentes: 0, formatosInvalidos: 0, totalLinhasComErro: 0 }

  return (
    <div className="space-y-5">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">Importação de Dados</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Traga seus dados históricos para o Clinitra em poucos passos.
          </p>
        </div>
      </div>

      {/* Seleção de módulo */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">O que você quer importar?</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(Object.entries(MODULOS) as [Modulo, (typeof MODULOS)[Modulo]][]).map(([key, cfg]) => {
            const Icon = cfg.icon
            const ativo = modulo === key
            return (
              <button
                key={key}
                onClick={() => selecionarModulo(key)}
                className={cn(
                  'group relative flex flex-col items-start gap-3 rounded-xl border-2 p-4 text-left transition-all duration-200',
                  ativo
                    ? cn('shadow-md', cfg.corBorda, cfg.corBg)
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm',
                )}
              >
                {/* Indicador de selecionado */}
                {ativo && (
                  <span className={cn('absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full', cfg.corBorda, 'border-2 bg-white')}>
                    <CheckCircle2 className={cn('h-3 w-3', cfg.cor)} />
                  </span>
                )}

                {/* Ícone */}
                <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg transition-colors', ativo ? cfg.corBg : 'bg-slate-100 group-hover:bg-slate-200')}>
                  <Icon className={cn('h-5 w-5', ativo ? cfg.cor : 'text-slate-500')} />
                </div>

                {/* Texto */}
                <div className="space-y-1 pr-6">
                  <p className={cn('text-sm font-bold', ativo ? cfg.cor : 'text-slate-700')}>{cfg.label}</p>
                  <p className="text-xs text-slate-500 leading-relaxed">{cfg.descricao}</p>
                  <p className={cn('text-[10px] font-medium mt-1', ativo ? cfg.cor : 'text-slate-400')}>{cfg.exemplo}</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Etapa 1: Upload ─────────────────────────────────────────────────────── */}
      {step === 'upload' && (
        <div className="space-y-4">

          {/* Passo 1: Baixar modelo */}
          <Card>
            <CardContent className="pt-5 pb-4 space-y-4">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#04c2fb] text-[11px] font-bold text-white">1</span>
                <p className="text-sm font-semibold text-slate-800">Baixe o modelo e preencha no Excel</p>
              </div>

              <p className="text-xs text-slate-500 pl-8">
                O modelo já tem os campos certos e exemplos de preenchimento. Abra no Excel ou Google Sheets, preencha com seus dados e salve.
              </p>

              <div className="pl-8">
                <Button
                  onClick={handleBaixarModelo}
                  className="gap-2 text-white hover:brightness-110 transition-all"
                  style={{ background: 'linear-gradient(135deg, #0094c8 0%, #04c2fb 60%, #00d5f5 100%)' }}
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Baixar planilha modelo (.xlsx)
                </Button>
              </div>

              {/* Referência de campos */}
              <div className="pl-8 space-y-2">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Campos da planilha</p>
                <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 items-center">
                  {colunasInfo.map((col) => (
                    <React.Fragment key={col.campo}>
                      <Badge
                        variant={col.obrigatorio ? 'default' : 'secondary'}
                        className={cn(
                          'text-[10px] px-1.5 py-0 font-mono',
                          col.obrigatorio
                            ? 'bg-[#04c2fb]/15 text-[#0094c8] border-0'
                            : 'text-slate-500',
                        )}
                      >
                        {col.campo}
                      </Badge>
                      <span className="text-xs text-slate-500">
                        {col.desc}
                        {col.obrigatorio && (
                          <span className="ml-1 text-[#04c2fb] font-medium">obrigatório</span>
                        )}
                      </span>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Passo 2: Enviar arquivo */}
          <Card>
            <CardContent className="pt-5 pb-4 space-y-4">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[11px] font-bold text-slate-500">2</span>
                <p className="text-sm font-semibold text-slate-800">Envie o arquivo preenchido</p>
              </div>

              <p className="text-xs text-slate-500 pl-8">
                Arraste o arquivo aqui ou clique para selecionar. Aceita <span className="font-medium text-slate-600">.xlsx</span> e <span className="font-medium text-slate-600">.csv</span>.
              </p>

              {/* Zona de drop */}
              <div className="pl-8">
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => !loading && inputRef.current?.click()}
                  className={cn(
                    'relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 transition-colors',
                    dragging
                      ? 'border-[#04c2fb] bg-[#04c2fb]/5'
                      : file
                      ? 'border-emerald-300 bg-emerald-50'
                      : 'border-slate-200 hover:border-[#04c2fb]/50 hover:bg-slate-50',
                    loading && 'pointer-events-none opacity-60',
                  )}
                >
                  <input
                    ref={inputRef}
                    type="file"
                    accept=".csv,.xlsx"
                    className="hidden"
                    onChange={handleChange}
                  />
                  {file ? (
                    <div className="flex items-center gap-2 text-sm text-slate-700">
                      <FileText className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span className="font-medium truncate max-w-[200px] sm:max-w-none">{file.name}</span>
                      <span className="text-xs text-slate-400 shrink-0">
                        ({(file.size / 1024).toFixed(1)} KB)
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); setFile(null); if (inputRef.current) inputRef.current.value = '' }}
                        className="ml-1 rounded p-0.5 hover:bg-slate-200 shrink-0"
                      >
                        <X className="h-3.5 w-3.5 text-slate-400" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-6 w-6 text-slate-300" />
                      <p className="text-xs text-slate-400 text-center">
                        Clique aqui ou arraste o arquivo para esta área
                      </p>
                    </>
                  )}
                </div>
              </div>

              <div className="pl-8">
                <Button
                  disabled={!file || loading}
                  onClick={handleAnalisar}
                  className="w-full sm:w-auto gap-2 text-white hover:brightness-110 active:scale-95 transition-all"
                  style={{ background: 'linear-gradient(135deg, #0094c8 0%, #04c2fb 60%, #00d5f5 100%)' }}
                >
                  {loading ? (
                    <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Verificando arquivo...</>
                  ) : (
                    <><FileText className="h-3.5 w-3.5" /> Verificar arquivo</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Etapa 2: Preview ───────────────────────────────────────────────────── */}
      {step === 'preview' && preview && (
        <div className="space-y-4">

          {/* Resumo */}
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold text-slate-800">
                    Encontramos {preview.total} {preview.total === 1 ? 'registro' : 'registros'} no arquivo
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="bg-emerald-100 text-emerald-700 border-0 gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      {preview.valid_count} {preview.valid_count === 1 ? 'pronto para importar' : 'prontos para importar'}
                    </Badge>
                    {preview.error_count > 0 && (
                      <Badge className="bg-red-100 text-red-700 border-0 gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {preview.error_count} com problema
                      </Badge>
                    )}
                  </div>
                  {preview.error_count > 0 && (
                    <p className="text-xs text-slate-500 pt-0.5">
                      As linhas com problema serão ignoradas. Corrija no arquivo e reimporte se quiser incluí-las.
                    </p>
                  )}
                </div>
                <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs shrink-0" onClick={resetar}>
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Trocar arquivo
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Aviso de problemas encontrados */}
          {analise.totalLinhasComErro > 0 && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-4 space-y-4">
              {/* Cabeçalho */}
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                <p className="text-sm font-semibold text-amber-800">
                  {analise.totalLinhasComErro} {analise.totalLinhasComErro === 1 ? 'linha com problema' : 'linhas com problema'} encontradas
                </p>
              </div>

              <div className="space-y-3">
                {/* Pacientes não encontrados no banco */}
                {analise.pacientesNaoEncontrados.length > 0 && (
                  <div className="rounded-md bg-amber-100/60 border border-amber-200 px-3 py-2.5 space-y-2">
                    <p className="text-xs font-semibold text-amber-900">
                      Paciente{analise.pacientesNaoEncontrados.length > 1 ? 's' : ''} não encontrado{analise.pacientesNaoEncontrados.length > 1 ? 's' : ''} no sistema
                    </p>
                    <p className="text-xs text-amber-700">
                      Os nomes abaixo estão no arquivo mas não correspondem a nenhum paciente cadastrado na plataforma. Verifique se o nome foi digitado corretamente ou cadastre o paciente antes de importar.
                    </p>
                    <ul className="pl-3 space-y-0.5">
                      {analise.pacientesNaoEncontrados.map((nome) => (
                        <li key={nome} className="text-xs font-medium text-amber-800 list-disc">
                          {nome}
                        </li>
                      ))}
                    </ul>
                    <p className="text-xs text-amber-700">
                      Importe primeiro na aba{' '}
                      <button
                        onClick={() => selecionarModulo('pacientes')}
                        className="font-semibold underline underline-offset-2 hover:text-amber-900"
                      >
                        Pacientes
                      </button>{' '}
                      e depois volte para importar {moduloLabel.toLowerCase()}.
                    </p>
                  </div>
                )}

                {/* paciente_nome vazio */}
                {analise.pacienteNomeAusente > 0 && (
                  <div className="rounded-md bg-amber-100/60 border border-amber-200 px-3 py-2.5 space-y-1">
                    <p className="text-xs font-semibold text-amber-900">
                      Nome do paciente não preenchido ({analise.pacienteNomeAusente} {analise.pacienteNomeAusente === 1 ? 'linha' : 'linhas'})
                    </p>
                    <p className="text-xs text-amber-700">
                      A coluna <span className="font-mono font-medium">paciente_nome</span> é obrigatória e está vazia nessas linhas. Preencha o nome do paciente no arquivo e reimporte.
                    </p>
                  </div>
                )}

                {/* Nomes ambíguos */}
                {analise.nomesAmbiguos.length > 0 && (
                  <div className="rounded-md bg-amber-100/60 border border-amber-200 px-3 py-2.5 space-y-2">
                    <p className="text-xs font-semibold text-amber-900">
                      Nome com mais de um paciente cadastrado
                    </p>
                    <p className="text-xs text-amber-700">
                      Os nomes abaixo correspondem a mais de um paciente no sistema. Use um nome que identifique o paciente de forma única.
                    </p>
                    <ul className="pl-3 space-y-0.5">
                      {analise.nomesAmbiguos.map((nome) => (
                        <li key={nome} className="text-xs font-medium text-amber-800 list-disc">
                          {nome}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Outros campos obrigatórios ausentes */}
                {analise.camposAusentes > 0 && (
                  <div className="rounded-md bg-amber-100/60 border border-amber-200 px-3 py-2.5 space-y-1">
                    <p className="text-xs font-semibold text-amber-900">
                      Campos obrigatórios vazios ({analise.camposAusentes} {analise.camposAusentes === 1 ? 'linha' : 'linhas'})
                    </p>
                    <p className="text-xs text-amber-700">
                      Algumas linhas estão sem informações que são necessárias para a importação. Passe o mouse sobre o ícone de erro na tabela abaixo para ver qual campo está faltando em cada linha, corrija no arquivo e reimporte.
                    </p>
                  </div>
                )}

                {/* Dados com formato inválido */}
                {analise.formatosInvalidos > 0 && (
                  <div className="rounded-md bg-amber-100/60 border border-amber-200 px-3 py-2.5 space-y-1">
                    <p className="text-xs font-semibold text-amber-900">
                      Dados fora do formato esperado ({analise.formatosInvalidos} {analise.formatosInvalidos === 1 ? 'linha' : 'linhas'})
                    </p>
                    <p className="text-xs text-amber-700">
                      Alguns valores estão em formato incorreto. Confira os pontos mais comuns: datas devem estar no formato <span className="font-mono font-medium">DD/MM/AAAA</span>, valores monetários devem ser numéricos (ex: <span className="font-mono font-medium">200,00</span>), e campos como tipo, status e presença aceitam apenas as opções listadas na planilha modelo.
                    </p>
                  </div>
                )}
              </div>

              <p className="text-xs text-amber-600">
                As linhas com problema serão ignoradas na importação. Corrija o arquivo e reimporte para incluí-las.
              </p>
            </div>
          )}

          {/* Tabela de preview */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto rounded-lg">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="px-3 py-2 text-left text-slate-500 font-medium w-10">Linha</th>
                      <th className="px-3 py-2 text-left text-slate-500 font-medium w-10"></th>
                      {colunas.map((c) => (
                        <th key={c} className="px-3 py-2 text-left text-slate-500 font-medium whitespace-nowrap font-mono">
                          {c}
                        </th>
                      ))}
                      <th className="px-3 py-2 text-left text-slate-500 font-medium">Problema encontrado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.map((row) => (
                      <tr
                        key={row.linha}
                        className={cn(
                          'border-b border-slate-100 last:border-0',
                          row.valido ? 'bg-white' : 'bg-red-50',
                        )}
                      >
                        <td className="px-3 py-2 text-slate-400">{row.linha}</td>
                        <td className="px-3 py-2">
                          {row.valido ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                          ) : (
                            <AlertCircle className="h-3.5 w-3.5 text-red-400" />
                          )}
                        </td>
                        {colunas.map((c) => (
                          <td key={c} className="px-3 py-2 text-slate-700 whitespace-nowrap max-w-[160px] truncate">
                            {exibirValor(c, row.dados[c])}
                          </td>
                        ))}
                        <td className="px-3 py-2 text-red-600 text-xs min-w-[140px]">
                          {!row.valido && resumirErros(row.erros)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Ação */}
          <Button
            disabled={preview.valid_count === 0 || loading}
            onClick={handleImportar}
            className="w-full gap-2 text-white hover:brightness-110 active:scale-95 transition-all"
            style={{ background: 'linear-gradient(135deg, #0094c8 0%, #04c2fb 60%, #00d5f5 100%)' }}
          >
            {loading ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Importando...</>
            ) : (
              <><Upload className="h-3.5 w-3.5" /> Importar {preview.valid_count} {preview.valid_count === 1 ? 'registro' : 'registros'}</>
            )}
          </Button>
        </div>
      )}

      {/* Etapa 3: Resultado ─────────────────────────────────────────────────── */}
      {step === 'result' && resultado && (
        <Card>
          <CardContent className="py-10 flex flex-col items-center gap-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <div>
              <p className="text-base font-semibold text-slate-800">
                {resultado.importados} {moduloLabel.toLowerCase()} importado{resultado.importados !== 1 ? 's' : ''} com sucesso!
              </p>
              {resultado.erros.length > 0 ? (
                <p className="text-xs text-slate-500 mt-1">
                  {resultado.erros.length} {resultado.erros.length === 1 ? 'linha foi ignorada' : 'linhas foram ignoradas'} por erro no conteúdo.
                </p>
              ) : (
                <p className="text-xs text-slate-500 mt-1">
                  Todos os registros foram importados sem problemas.
                </p>
              )}
            </div>

            {resultado.erros.length > 0 && (
              <div className="w-full max-w-md rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-left space-y-1">
                <p className="text-xs font-semibold text-red-700">Linhas com erro:</p>
                {resultado.erros.map((e, i) => (
                  <p key={i} className="text-[10px] text-red-600">
                    Linha {e.indice + 1}: {e.erro}
                  </p>
                ))}
              </div>
            )}

            <Button variant="outline" size="sm" onClick={resetar} className="gap-1.5 text-xs">
              <RotateCcw className="h-3.5 w-3.5" />
              Nova importação
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ── Helpers de API ────────────────────────────────────────────────────────────

async function getToken(): Promise<string | undefined> {
  const { createClient } = await import('@/lib/supabase')
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token
}

async function apiFetchForm<T>(path: string, form: FormData): Promise<T> {
  const token = await getToken()
  const API_URL = process.env.NEXT_PUBLIC_API_URL
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  })
  if (!res.ok) {
    const text = await res.text()
    let detail = text
    try {
      detail = JSON.parse(text)?.detail ?? text
    } catch {}
    throw new Error(detail)
  }
  return res.json()
}
