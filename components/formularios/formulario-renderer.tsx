'use client'

import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, ChevronDown, ChevronsUpDown, Clock, Loader2, MinusCircle, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { format, isToday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { FieldRenderer } from '@/components/formularios/field-renderer'
import { useSalvarRespostas } from '@/hooks/use-formularios-paciente'
import { cn } from '@/lib/utils'
import type { FormularioSchema, Secao, TipoCampo } from '@/types'

interface FormularioRendererProps {
  pacienteId: string
  docId: string
  schema: FormularioSchema
  respostasIniciais: Record<string, unknown>
  readonly?: boolean
  onFinalizar?: () => void
  /** ISO string do `atualizado_em` do backend — usado como valor inicial do indicador */
  ultimoSalvoEm?: string
}

const TIPOS_NAO_PREENCHAVEIS: TipoCampo[] = ['secao', 'texto_informativo']

function valorVazio(tipo: TipoCampo, valor: unknown): boolean {
  if (TIPOS_NAO_PREENCHAVEIS.includes(tipo)) return false
  if (tipo === 'escala') return false
  if (valor === undefined || valor === null) return true
  if (typeof valor === 'string') return valor.trim() === ''
  if (Array.isArray(valor)) return valor.length === 0
  if (typeof valor === 'number') return isNaN(valor)
  return false
}

function formatarTimestamp(data: Date): string {
  if (isToday(data)) {
    return `Rascunho salvo às ${format(data, 'HH:mm')}`
  }
  return `Rascunho salvo em ${format(data, "dd/MM 'às' HH:mm", { locale: ptBR })}`
}

type SecaoStatus = 'completa' | 'incompleta' | 'parcial' | 'vazia'

function getSecaoStatus(secao: Secao, respostas: Record<string, unknown>): SecaoStatus {
  const camposPreenchaveis = secao.campos.filter(c => !TIPOS_NAO_PREENCHAVEIS.includes(c.tipo))
  if (camposPreenchaveis.length === 0) return 'vazia'

  const temObrigatorioVazio = camposPreenchaveis.some(
    c => c.obrigatorio && valorVazio(c.tipo, respostas[c.id]),
  )
  if (temObrigatorioVazio) return 'incompleta'

  const temOpcionalVazio = camposPreenchaveis.some(
    c => !c.obrigatorio && valorVazio(c.tipo, respostas[c.id]),
  )
  if (temOpcionalVazio) return 'parcial'

  return 'completa'
}

function SecaoBadge({ status }: { status: SecaoStatus }) {
  if (status === 'vazia') return null

  const config = {
    completa: {
      className: 'bg-green-50 border-green-200 text-green-700',
      icon: <CheckCircle2 className="h-3 w-3 shrink-0" />,
      label: 'Completa',
    },
    incompleta: {
      className: 'bg-red-50 border-red-200 text-red-600',
      icon: <XCircle className="h-3 w-3 shrink-0" />,
      label: 'Pendente',
    },
    parcial: {
      className: 'bg-amber-50 border-amber-200 text-amber-700',
      icon: <MinusCircle className="h-3 w-3 shrink-0" />,
      label: 'Parcial',
    },
  }[status]

  return (
    <span
      className={cn(
        'flex items-center gap-1 shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold',
        config.className,
      )}
    >
      {config.icon}
      {config.label}
    </span>
  )
}

export function FormularioRenderer({
  pacienteId,
  docId,
  schema,
  respostasIniciais,
  readonly = false,
  onFinalizar,
  ultimoSalvoEm,
}: FormularioRendererProps) {
  const [respostas, setRespostas] = useState<Record<string, unknown>>(respostasIniciais)
  const [camposComErro, setCamposComErro] = useState<Set<string>>(new Set())
  const [ultimoSalvo, setUltimoSalvo] = useState<Date | null>(
    ultimoSalvoEm ? new Date(ultimoSalvoEm) : null,
  )
  const [salvando, setSalvando] = useState(false)
  const [colapsadas, setColapsadas] = useState<Set<string>>(
    () => new Set(schema.secoes.map(s => s.id)),
  )
  const salvarMutation = useSalvarRespostas(pacienteId, docId)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isDirtyRef = useRef(false)
  const toastSalvoRef = useRef(false)

  const todasColapsadas =
    schema.secoes.length > 0 && colapsadas.size === schema.secoes.length

  const toggleColapsada = (id: string) => {
    setColapsadas(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const alternarTodasSecoes = () => {
    if (todasColapsadas) {
      setColapsadas(new Set())
    } else {
      setColapsadas(new Set(schema.secoes.map(s => s.id)))
    }
  }

  const handleChange = (campoId: string, valor: unknown) => {
    if (readonly) return
    const novas = { ...respostas, [campoId]: valor }
    setRespostas(novas)
    isDirtyRef.current = true

    if (camposComErro.has(campoId)) {
      setCamposComErro(prev => {
        const next = new Set(prev)
        next.delete(campoId)
        return next
      })
    }

    setSalvando(true)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      salvarMutation.mutate(
        { respostas: novas },
        {
          onSuccess: () => {
            setSalvando(false)
            setUltimoSalvo(new Date())
            if (!toastSalvoRef.current) {
              toast.info('Rascunho salvo automaticamente', { id: `formulario-autosave-${docId}`, duration: 2000 })
              toastSalvoRef.current = true
            }
          },
          onError: () => {
            setSalvando(false)
            toast.error('Erro ao salvar rascunho')
          },
        },
      )
      isDirtyRef.current = false
    }, 1000)
  }

  const handleFinalizar = () => {
    const invalidos = new Set<string>()
    const labelsInvalidos: string[] = []

    for (const secao of schema.secoes) {
      for (const campo of secao.campos) {
        if (campo.obrigatorio && valorVazio(campo.tipo, respostas[campo.id])) {
          invalidos.add(campo.id)
          labelsInvalidos.push(campo.label || 'Campo sem nome')
        }
      }
    }

    if (invalidos.size > 0) {
      setCamposComErro(invalidos)

      // Auto-expandir seções que têm campos com erro
      const secoesComErro = new Set<string>()
      for (const secao of schema.secoes) {
        for (const campo of secao.campos) {
          if (invalidos.has(campo.id)) secoesComErro.add(secao.id)
        }
      }
      setColapsadas(prev => {
        const next = new Set(prev)
        for (const id of secoesComErro) next.delete(id)
        return next
      })

      const lista = labelsInvalidos.slice(0, 3).join(', ')
      const sufixo = labelsInvalidos.length > 3 ? ` e mais ${labelsInvalidos.length - 3}` : ''
      toast.error('Preencha os campos obrigatórios', {
        description: `${lista}${sufixo}`,
        duration: 5000,
      })
      return
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)
    salvarMutation.mutate(
      { respostas, status: 'finalizado' },
      {
        onSuccess: () => {
          toast.success('Formulário finalizado')
          onFinalizar?.()
        },
        onError: () => toast.error('Erro ao finalizar formulário'),
      },
    )
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  return (
    <div className="space-y-4">
      {/* Indicador de último save */}
      {!readonly && (
        <div
          className={cn(
            'flex items-center gap-2 rounded-xl px-4 py-3 text-xs font-medium border transition-all',
            salvando
              ? 'bg-[#04c2fb]/8 border-[#04c2fb]/25 text-[#04c2fb]'
              : ultimoSalvo
                ? 'bg-emerald-50 border-emerald-150 text-emerald-700'
                : 'bg-gray-50 border-gray-100 text-gray-400',
          )}
        >
          {salvando ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
              Salvando rascunho…
            </>
          ) : ultimoSalvo ? (
            <>
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              {formatarTimestamp(ultimoSalvo)}
            </>
          ) : (
            <>
              <Clock className="h-3.5 w-3.5 shrink-0" />
              Nenhuma alteração salva ainda
            </>
          )}
        </div>
      )}

      {/* Toolbar de colapso — visível apenas com 2+ seções */}
      {schema.secoes.length > 1 && (
        <div className="flex justify-start">
          <button
            type="button"
            onClick={alternarTodasSecoes}
            className="flex items-center gap-1.5 text-xs rounded-lg border border-gray-200 px-3 py-1.5 text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
          >
            <ChevronsUpDown className="h-3.5 w-3.5" />
            {todasColapsadas ? 'Expandir todas' : 'Recolher todas'}
          </button>
        </div>
      )}

      {/* Seções do formulário */}
      {schema.secoes.map(secao => {
        const colapsada = colapsadas.has(secao.id)
        const status = getSecaoStatus(secao, respostas)

        return (
          <div
            key={secao.id}
            className={cn(
              'rounded-xl border overflow-hidden transition-colors',
              colapsada ? 'border-[#04c2fb]/40 bg-white' : 'border-gray-200 bg-gray-50/50',
            )}
          >
            {/* Cabeçalho clicável */}
            <div
              className={cn(
                'flex items-center gap-2 px-3 py-2.5 cursor-pointer select-none transition-colors',
                colapsada
                  ? 'bg-[#04c2fb]/5'
                  : 'bg-transparent hover:bg-gray-100/60 border-b border-gray-200',
              )}
              onClick={() => toggleColapsada(secao.id)}
            >
              {/* Botão quadrado com chevron — mesmo estilo do editor */}
              <span
                className={cn(
                  'flex items-center justify-center h-6 w-6 rounded-md border shrink-0 transition-all',
                  colapsada
                    ? 'border-[#04c2fb] bg-[#04c2fb]/10 text-[#04c2fb]'
                    : 'border-gray-200 bg-white text-gray-400',
                )}
              >
                <ChevronDown
                  className={cn(
                    'h-3.5 w-3.5 transition-transform duration-200',
                    colapsada && '-rotate-90',
                  )}
                />
              </span>

              <h3 className="flex-1 min-w-0 truncate text-sm font-medium text-gray-800">
                {secao.titulo}
              </h3>

              <SecaoBadge status={status} />
            </div>

            {/* Campos — ocultos quando colapsada */}
            {!colapsada && (
              <div className="p-3 sm:px-5 sm:py-4 space-y-4">
                {secao.campos.map(campo => (
                  <FieldRenderer
                    key={campo.id}
                    campo={campo}
                    valor={respostas[campo.id]}
                    onChange={v => handleChange(campo.id, v)}
                    readonly={readonly}
                    comErro={camposComErro.has(campo.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )
      })}

      {!readonly && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleFinalizar}
            disabled={salvarMutation.isPending}
            className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium text-white transition-all hover:brightness-110 disabled:opacity-70"
            style={{ background: 'linear-gradient(135deg, #0094c8 0%, #04c2fb 60%, #00d5f5 100%)' }}
          >
            {salvarMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Finalizar formulário
          </button>
        </div>
      )}
    </div>
  )
}
