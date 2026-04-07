'use client'

import { useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Users,
  DollarSign,
  BookOpen,
  Upload,
  Download,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  AlertTriangle,
  ArrowLeft,
  RotateCcw,
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

const MODULOS: Record<Modulo, { label: string; icon: React.ElementType; colunas: string[] }> = {
  pacientes: {
    label: 'Pacientes',
    icon: Users,
    colunas: ['nome', 'cpf', 'data_nascimento', 'telefone', 'email'],
  },
  financeiro: {
    label: 'Financeiro',
    icon: DollarSign,
    colunas: ['tipo', 'descricao', 'valor', 'status', 'data_vencimento', 'paciente_nome'],
  },
  registros: {
    label: 'Registros',
    icon: BookOpen,
    colunas: ['paciente_nome', 'data_sessao', 'tipo_sessao', 'presenca', 'valor_sessao', 'conteudo'],
  },
}

const AVISO_DEPENDENCIA: Record<string, string> = {
  financeiro: 'Importe os pacientes primeiro. Lançamentos vinculados a paciente inexistente serão rejeitados.',
  registros: 'Importe os pacientes primeiro. Registros sem paciente correspondente na plataforma serão rejeitados.',
}

// ── Utilitários ───────────────────────────────────────────────────────────────

function nomesPacientesNaoEncontrados(rows: PreviewRow[]): string[] {
  const nomes = new Set<string>()
  for (const row of rows) {
    for (const erro of row.erros) {
      const m = erro.match(/^Paciente '(.+)' não encontrado/)
      if (m) nomes.add(m[1])
    }
  }
  return Array.from(nomes)
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

  const { label: moduloLabel, icon: ModuloIcon, colunas } = MODULOS[modulo]
  const aviso = AVISO_DEPENDENCIA[modulo]

  // Trocar módulo volta para upload
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
      toast.error('Formato inválido', { description: 'Apenas arquivos .csv ou .xlsx são aceitos.' })
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
        {
          headers: { Authorization: `Bearer ${await getToken()}` },
        }
      )
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `modelo_${modulo}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Erro ao baixar modelo', { description: 'Verifique se o backend está rodando.' })
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
      const msg = err instanceof Error ? err.message : 'Erro ao analisar arquivo.'
      toast.error('Falha na análise', { description: msg })
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
      toast.success(
        `${data.importados} ${moduloLabel.toLowerCase()} importado${data.importados !== 1 ? 's' : ''}`,
      )
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao importar.'
      toast.error('Falha na importação', { description: msg })
    } finally {
      setLoading(false)
    }
  }

  const pacientesNaoEncontrados =
    step === 'preview' && preview ? nomesPacientesNaoEncontrados(preview.rows) : []

  return (
    <div className="space-y-5">
      {/* Cabeçalho */}
      <div>
        <h2 className="text-sm font-semibold text-slate-800">Importação de Dados</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Importe dados históricos para o Clinitra via arquivos CSV ou Excel. Baixe o modelo de cada
          módulo para garantir o formato correto.
        </p>
      </div>

      {/* Tabs de módulo */}
      <div className="flex gap-1 border-b border-slate-200 overflow-x-auto">
        {(Object.entries(MODULOS) as [Modulo, (typeof MODULOS)[Modulo]][]).map(([key, cfg]) => {
          const Icon = cfg.icon
          return (
            <button
              key={key}
              onClick={() => selecionarModulo(key)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 whitespace-nowrap transition-colors',
                modulo === key
                  ? 'border-[#04c2fb] text-[#04c2fb]'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {cfg.label}
            </button>
          )
        })}
      </div>

      {/* Etapa 1: Upload */}
      {step === 'upload' && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#04c2fb]/10">
                  <ModuloIcon className="h-4 w-4 text-[#04c2fb]" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold">{moduloLabel}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Importe dados de {moduloLabel.toLowerCase()} a partir de planilha
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 text-xs text-slate-500 hover:text-slate-800 shrink-0"
                onClick={handleBaixarModelo}
              >
                <Download className="h-3.5 w-3.5" />
                Baixar modelo
              </Button>
            </div>

            {/* Campos do módulo */}
            <div className="flex flex-wrap gap-1 pt-1">
              {colunas.map((c) => (
                <Badge key={c} variant="secondary" className="text-[10px] px-1.5 py-0 font-mono">
                  {c}
                </Badge>
              ))}
            </div>

            {/* Aviso de dependência */}
            {aviso && (
              <div className="flex items-start gap-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-2 mt-2">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-800">{aviso}</p>
              </div>
            )}
          </CardHeader>

          <CardContent className="space-y-3">
            {/* Zona de drop */}
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
                  ? 'border-slate-300 bg-slate-50'
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
                  <FileText className="h-4 w-4 text-[#04c2fb] shrink-0" />
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
                    Arraste um arquivo{' '}
                    <span className="font-medium text-slate-600">.csv</span> ou{' '}
                    <span className="font-medium text-slate-600">.xlsx</span> ou clique para selecionar
                  </p>
                </>
              )}
            </div>

            <Button
              disabled={!file || loading}
              onClick={handleAnalisar}
              className="w-full text-white hover:brightness-110 active:scale-95 transition-all"
              style={{ background: 'linear-gradient(135deg, #0094c8 0%, #04c2fb 60%, #00d5f5 100%)' }}
            >
              {loading ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Analisando...</>
              ) : (
                <><FileText className="h-3.5 w-3.5 mr-1.5" /> Analisar arquivo</>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Etapa 2: Preview */}
      {step === 'preview' && preview && (
        <div className="space-y-4">
          {/* Resumo */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-slate-700">
                <span className="font-semibold">{preview.total}</span> linha{preview.total !== 1 ? 's' : ''} encontrada{preview.total !== 1 ? 's' : ''}
              </span>
              <Badge className="bg-emerald-100 text-emerald-700 border-0">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {preview.valid_count} válida{preview.valid_count !== 1 ? 's' : ''}
              </Badge>
              {preview.error_count > 0 && (
                <Badge className="bg-red-100 text-red-700 border-0">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {preview.error_count} com erro
                </Badge>
              )}
            </div>
            <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" onClick={resetar}>
              <ArrowLeft className="h-3.5 w-3.5" />
              Trocar arquivo
            </Button>
          </div>

          {/* Aviso de pacientes não encontrados */}
          {pacientesNaoEncontrados.length > 0 && (
            <div className="rounded-md bg-amber-50 border border-amber-200 px-4 py-3 space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                <p className="text-xs font-semibold text-amber-800">
                  {pacientesNaoEncontrados.length} paciente{pacientesNaoEncontrados.length !== 1 ? 's' : ''} não encontrado{pacientesNaoEncontrados.length !== 1 ? 's' : ''} na plataforma
                </p>
              </div>
              <ul className="space-y-0.5 pl-6">
                {pacientesNaoEncontrados.map((nome) => (
                  <li key={nome} className="text-xs text-amber-700 list-disc">
                    {nome}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-amber-700 pl-0">
                Importe esses pacientes primeiro na aba{' '}
                <button
                  onClick={() => selecionarModulo('pacientes')}
                  className="font-semibold underline underline-offset-2 hover:text-amber-900"
                >
                  Pacientes
                </button>{' '}
                e depois retorne para importar {moduloLabel.toLowerCase()}.
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
                      <th className="px-3 py-2 text-left text-slate-500 font-medium w-10">#</th>
                      <th className="px-3 py-2 text-left text-slate-500 font-medium w-10"></th>
                      {colunas.map((c) => (
                        <th key={c} className="px-3 py-2 text-left text-slate-500 font-medium whitespace-nowrap">
                          {c}
                        </th>
                      ))}
                      <th className="px-3 py-2 text-left text-slate-500 font-medium">erros</th>
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
                            {String(row.dados[c] ?? '')}
                          </td>
                        ))}
                        <td className="px-3 py-2 text-red-600 text-[10px] min-w-[160px]">
                          {row.erros.join('; ')}
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
            className="w-full text-white hover:brightness-110 active:scale-95 transition-all"
            style={{ background: 'linear-gradient(135deg, #0094c8 0%, #04c2fb 60%, #00d5f5 100%)' }}
          >
            {loading ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Importando...</>
            ) : (
              <><Upload className="h-3.5 w-3.5 mr-1.5" /> Importar {preview.valid_count} válida{preview.valid_count !== 1 ? 's' : ''}</>
            )}
          </Button>
        </div>
      )}

      {/* Etapa 3: Resultado */}
      {step === 'result' && resultado && (
        <Card>
          <CardContent className="py-8 flex flex-col items-center gap-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 className="h-7 w-7 text-emerald-600" />
            </div>
            <div>
              <p className="text-base font-semibold text-slate-800">
                {resultado.importados} {moduloLabel.toLowerCase()} importado{resultado.importados !== 1 ? 's' : ''} com sucesso
              </p>
              {resultado.erros.length > 0 && (
                <p className="text-xs text-slate-500 mt-1">
                  {resultado.erros.length} linha{resultado.erros.length !== 1 ? 's' : ''} com falha durante a inserção
                </p>
              )}
            </div>

            {resultado.erros.length > 0 && (
              <div className="w-full max-w-md rounded-md bg-red-50 border border-red-200 px-4 py-3 text-left space-y-1">
                <p className="text-xs font-semibold text-red-700">Falhas na inserção:</p>
                {resultado.erros.map((e, i) => (
                  <p key={i} className="text-[10px] text-red-600">
                    Linha {e.indice + 1}: {e.erro}
                  </p>
                ))}
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={resetar}
              className="gap-1.5 text-xs"
            >
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
