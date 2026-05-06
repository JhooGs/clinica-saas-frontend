'use client'

import { useRef, useState, useEffect } from 'react'
import { Pencil, Sparkles, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { ModalPortal } from '@/components/modal-portal'
import { useExtrairTemplateIA } from '@/hooks/use-templates'
import type { FormularioSchema } from '@/types'

const ETAPAS = [
  'Lendo o documento...',
  'Identificando perguntas e campos...',
  'Organizando as seções...',
  'Estruturando o formulário...',
  'Finalizando...',
]

interface ModalCriarTemplateProps {
  onManual: () => void
  onIASuccess: (schema: FormularioSchema, arquivoNome: string) => void
  onFechar: () => void
  planoSemIA?: boolean
}

export function ModalCriarTemplate({
  onManual,
  onIASuccess,
  onFechar,
  planoSemIA = false,
}: ModalCriarTemplateProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [arrastando, setArrastando] = useState(false)
  const [etapaIdx, setEtapaIdx] = useState(0)

  const extrair = useExtrairTemplateIA()
  const carregando = extrair.isPending

  useEffect(() => {
    if (!carregando) return
    const id = setInterval(() => {
      setEtapaIdx(i => Math.min(i + 1, ETAPAS.length - 1))
    }, 4000)
    return () => {
      clearInterval(id)
      setEtapaIdx(0)
    }
  }, [carregando])

  async function processarArquivo(file: File) {
    const allowed = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
      'text/plain',
    ]
    if (!allowed.includes(file.type)) {
      toast.error('Formato inválido', {
        description: 'Envie um arquivo PDF, Word (.docx), Excel (.xlsx), CSV ou TXT.',
        duration: Infinity,
      })
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Arquivo grande demais', { description: 'O limite é 5 MB.', duration: Infinity })
      return
    }

    try {
      const result = await extrair.mutateAsync(file)
      onIASuccess(result.schema as FormularioSchema, result.arquivo_nome)
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'Tente novamente.'
      try {
        const parsed = JSON.parse(raw)
        const detail = parsed?.detail
        if (detail?.error === 'feature_gate') {
          if (detail?.feature === 'FEATURE_AI_FORMS_QUOTA') {
            toast.error('Cota de IA esgotada', {
              description: `Você usou ${detail.quota_usado} de ${detail.quota_limite} gerações deste mês.`,
              duration: Infinity,
            })
          } else {
            toast.error('Recurso indisponível no seu plano', {
              description: 'A geração por IA está disponível a partir do plano Clínica.',
              duration: Infinity,
            })
          }
          return
        }
        const msg = typeof detail === 'string' ? detail : raw
        toast.error('Erro ao processar o arquivo', { description: msg, duration: Infinity })
      } catch {
        toast.error('Erro ao processar o arquivo', { description: raw, duration: Infinity })
      }
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) processarArquivo(file)
    e.target.value = ''
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setArrastando(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processarArquivo(file)
  }

  if (carregando) {
    return (
      <ModalPortal>
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)' }}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-white/20 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300"
            style={{ backgroundColor: 'rgba(255,255,255,0.98)', backdropFilter: 'blur(24px)' }}
          >
            {/* Barra de progresso animada no topo */}
            <div className="h-1 w-full overflow-hidden bg-gray-100">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${((etapaIdx + 1) / ETAPAS.length) * 100}%`,
                  background: 'linear-gradient(90deg, #0094c8 0%, #04c2fb 60%, #00d5f5 100%)',
                  transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              />
            </div>

            <div className="px-8 py-10 flex flex-col items-center text-center gap-7">

              {/* Ícone pulsante */}
              <div className="relative flex items-center justify-center">
                <span
                  className="absolute h-24 w-24 rounded-full opacity-20"
                  style={{
                    background: 'radial-gradient(circle, #04c2fb 0%, transparent 70%)',
                    animation: 'ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite',
                  }}
                />
                <span
                  className="absolute h-16 w-16 rounded-full opacity-30"
                  style={{
                    background: 'radial-gradient(circle, #04c2fb 0%, transparent 70%)',
                    animation: 'ping 1.8s cubic-bezier(0, 0, 0.2, 1) 0.4s infinite',
                  }}
                />
                <div
                  className="relative flex h-20 w-20 items-center justify-center rounded-2xl border border-[#04c2fb]/20"
                  style={{
                    background: 'linear-gradient(135deg, rgba(4,194,251,0.12) 0%, rgba(0,148,200,0.08) 100%)',
                  }}
                >
                  <Sparkles className="h-9 w-9 text-[#04c2fb]" strokeWidth={1.5} />
                </div>
              </div>

              {/* Texto principal */}
              <div className="space-y-2.5">
                <h2 className="text-base font-semibold text-gray-900">Gerando template com IA</h2>
                <p
                  key={etapaIdx}
                  className="text-sm text-[#04c2fb] font-medium animate-in fade-in slide-in-from-bottom-2 duration-500"
                >
                  {ETAPAS[etapaIdx]}
                </p>
              </div>

              {/* Dots animados com stagger */}
              <div className="flex items-center gap-2">
                {[0, 1, 2, 3].map(i => (
                  <div
                    key={i}
                    className="h-1.5 w-1.5 rounded-full bg-[#04c2fb] animate-bounce"
                    style={{ animationDelay: `${i * 0.18}s` }}
                  />
                ))}
              </div>

              {/* Rodapé informativo */}
              <p className="text-xs text-gray-400 leading-relaxed max-w-[220px]">
                A IA está analisando o documento. Isso pode levar alguns segundos.
              </p>
            </div>
          </div>
        </div>
      </ModalPortal>
    )
  }

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center p-4"
        style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
        onClick={onFechar}
      >
        <div
          className="w-full max-w-sm rounded-2xl border border-white/30 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
          style={{ backdropFilter: 'blur(24px)', backgroundColor: 'rgba(255,255,255,0.97)' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-6 pb-4">
            <h2 className="text-base font-semibold text-gray-900">Novo template</h2>
            <button
              onClick={onFechar}
              className="rounded-lg p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="px-6 pb-6 space-y-3">

            {/* Manual */}
            <button
              type="button"
              onClick={onManual}
              className="w-full flex items-start gap-4 rounded-xl border border-gray-200 p-4 text-left hover:border-[#04c2fb] hover:bg-[#04c2fb]/5 transition-all group"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 group-hover:bg-[#04c2fb]/10 transition-colors">
                <Pencil className="h-5 w-5 text-gray-500 group-hover:text-[#04c2fb] transition-colors" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Construir manualmente</p>
                <p className="text-xs text-gray-500 mt-0.5">Crie seções e campos usando o editor visual.</p>
              </div>
            </button>

            {/* IA — bloqueado por plano */}
            {planoSemIA ? (
              <div className="w-full flex items-start gap-4 rounded-xl border border-gray-100 p-4 opacity-60 cursor-not-allowed">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100">
                  <Sparkles className="h-5 w-5 text-gray-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900">Gerar com IA</p>
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                      CLÍNICA
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">Disponível nos planos Clínica e Clínica Pro.</p>
                </div>
              </div>
            ) : (
              /* IA — upload */
              <div
                onDragOver={e => { e.preventDefault(); setArrastando(true) }}
                onDragLeave={() => setArrastando(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                className={`w-full flex items-start gap-4 rounded-xl border p-4 text-left cursor-pointer transition-all group ${
                  arrastando
                    ? 'border-[#04c2fb] bg-[#04c2fb]/5'
                    : 'border-gray-200 hover:border-[#04c2fb] hover:bg-[#04c2fb]/5'
                }`}
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
                  arrastando ? 'bg-[#04c2fb]/10' : 'bg-gray-100 group-hover:bg-[#04c2fb]/10'
                }`}>
                  {arrastando
                    ? <Upload className="h-5 w-5 text-[#04c2fb]" />
                    : <Sparkles className="h-5 w-5 text-gray-500 group-hover:text-[#04c2fb] transition-colors" />
                  }
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Gerar com IA</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {arrastando
                      ? 'Solte o arquivo aqui'
                      : 'Formatos aceitos: PDF, Word, Excel, CSV ou TXT. A IA extrai perguntas e campos e monta o formulário automaticamente.'
                    }
                  </p>
                </div>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".pdf,.docx,.xlsx,.csv,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,text/plain"
                  className="hidden"
                  onChange={handleInputChange}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </ModalPortal>
  )
}
