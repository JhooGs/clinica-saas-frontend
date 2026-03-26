'use client'

import { useRef, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Users, DollarSign, Upload, Download, FileText, CheckCircle2, AlertCircle, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type ImportStatus = 'idle' | 'ready' | 'loading' | 'success' | 'error'

interface ImportState {
  file: File | null
  status: ImportStatus
  message: string
}

const TEMPLATES = {
  pacientes: {
    filename: 'modelo_pacientes.csv',
    headers: ['nome', 'cpf', 'data_nascimento', 'telefone', 'email'],
  },
  financeiro: {
    filename: 'modelo_financeiro.csv',
    headers: ['tipo', 'descricao', 'valor', 'status', 'data_vencimento'],
  },
}

function downloadTemplate(type: keyof typeof TEMPLATES) {
  const { filename, headers } = TEMPLATES[type]
  const blob = new Blob([headers.join(',') + '\n'], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

interface ImportCardProps {
  type: keyof typeof TEMPLATES
  title: string
  description: string
  icon: React.ElementType
  fields: string[]
}

function ImportCard({ type, title, description, icon: Icon, fields }: ImportCardProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [state, setState] = useState<ImportState>({ file: null, status: 'idle', message: '' })

  function handleFile(file: File) {
    if (!file.name.endsWith('.csv')) {
      setState({ file: null, status: 'error', message: 'Apenas arquivos .csv são aceitos.' })
      return
    }
    setState({ file, status: 'ready', message: '' })
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  function clearFile() {
    setState({ file: null, status: 'idle', message: '' })
    if (inputRef.current) inputRef.current.value = ''
  }

  async function handleImport() {
    if (!state.file) return
    setState((s) => ({ ...s, status: 'loading', message: '' }))
    // TODO: integrar com API — por ora simula latência
    await new Promise((r) => setTimeout(r, 1500))
    setState({ file: null, status: 'success', message: `${state.file.name} importado com sucesso.` })
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#04c2fb]/10">
              <Icon className="h-4 w-4 text-[#04c2fb]" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">{title}</CardTitle>
              <CardDescription className="text-xs mt-0.5">{description}</CardDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-xs text-slate-500 hover:text-slate-800"
            onClick={() => downloadTemplate(type)}
          >
            <Download className="h-3.5 w-3.5" />
            Baixar modelo
          </Button>
        </div>
        <div className="flex flex-wrap gap-1 pt-1">
          {fields.map((f) => (
            <Badge key={f} variant="secondary" className="text-[10px] px-1.5 py-0 font-mono">
              {f}
            </Badge>
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Zona de drop */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => state.status !== 'loading' && inputRef.current?.click()}
          className={cn(
            'relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 transition-colors',
            dragging
              ? 'border-[#04c2fb] bg-[#04c2fb]/5'
              : state.file
              ? 'border-slate-300 bg-slate-50'
              : 'border-slate-200 hover:border-[#04c2fb]/50 hover:bg-slate-50',
            state.status === 'loading' && 'pointer-events-none opacity-60'
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleChange}
          />
          {state.file ? (
            <div className="flex items-center gap-2 text-sm text-slate-700">
              <FileText className="h-4 w-4 text-[#04c2fb]" />
              <span className="font-medium">{state.file.name}</span>
              <span className="text-xs text-slate-400">
                ({(state.file.size / 1024).toFixed(1)} KB)
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); clearFile() }}
                className="ml-1 rounded p-0.5 hover:bg-slate-200"
              >
                <X className="h-3.5 w-3.5 text-slate-400" />
              </button>
            </div>
          ) : (
            <>
              <Upload className="h-6 w-6 text-slate-300" />
              <p className="text-xs text-slate-400">
                Arraste um arquivo <span className="font-medium text-slate-600">.csv</span> ou clique para selecionar
              </p>
            </>
          )}
        </div>

        {/* Feedback */}
        {state.status === 'error' && (
          <p className="flex items-center gap-1.5 text-xs text-red-500">
            <AlertCircle className="h-3.5 w-3.5" /> {state.message}
          </p>
        )}
        {state.status === 'success' && (
          <p className="flex items-center gap-1.5 text-xs text-emerald-600">
            <CheckCircle2 className="h-3.5 w-3.5" /> {state.message}
          </p>
        )}

        <Button
          size="sm"
          disabled={!state.file || state.status === 'loading'}
          onClick={handleImport}
          className="w-full text-white hover:brightness-110 active:scale-95 transition-all"
          style={{ background: 'linear-gradient(135deg, #0094c8 0%, #04c2fb 60%, #00d5f5 100%)' }}
        >
          {state.status === 'loading' ? (
            <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Importando...</>
          ) : (
            <><Upload className="h-3.5 w-3.5 mr-1.5" /> Importar</>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}

export default function ConfiguracoesDadosPage() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-sm font-semibold text-slate-800">Importação de Dados</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Importe dados existentes para o Clinitra via arquivos CSV. Baixe o modelo de cada entidade para garantir o formato correto.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ImportCard
          type="pacientes"
          title="Pacientes"
          description="Importe a lista de pacientes da clínica"
          icon={Users}
          fields={['nome', 'cpf', 'data_nascimento', 'telefone', 'email']}
        />
        <ImportCard
          type="financeiro"
          title="Financeiro"
          description="Importe lançamentos financeiros"
          icon={DollarSign}
          fields={['tipo', 'descricao', 'valor', 'status', 'data_vencimento']}
        />
      </div>
    </div>
  )
}
