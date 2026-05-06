'use client'

import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, Clock, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { format, isToday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { FieldRenderer } from '@/components/formularios/field-renderer'
import { useSalvarRespostas } from '@/hooks/use-formularios-paciente'
import { cn } from '@/lib/utils'
import type { FormularioSchema, TipoCampo } from '@/types'

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
  const salvarMutation = useSalvarRespostas(pacienteId, docId)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isDirtyRef = useRef(false)
  const toastSalvoRef = useRef(false)

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
      {/* Indicador de último save — topo, sempre visível ao abrir o formulário */}
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

      {/* Campos do formulário */}
      {schema.secoes.map(secao => (
        <div key={secao.id} className="rounded-xl border border-gray-100 bg-white p-4 sm:p-6 space-y-4">
          <h3 className="text-sm font-semibold text-gray-800 pb-2 border-b border-gray-100">{secao.titulo}</h3>
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
      ))}

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
