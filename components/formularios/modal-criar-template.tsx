'use client'

import { useRef, useState } from 'react'
import { Loader2, Pencil, Sparkles, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { ModalPortal } from '@/components/modal-portal'
import { useExtrairTemplateIA } from '@/hooks/use-templates'
import type { FormularioSchema } from '@/types'

interface ModalCriarTemplateProps {
  onManual: () => void
  onIASuccess: (schema: FormularioSchema, arquivoNome: string) => void
  onFechar: () => void
  planoFree?: boolean
}

export function ModalCriarTemplate({
  onManual,
  onIASuccess,
  onFechar,
  planoFree = false,
}: ModalCriarTemplateProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [arrastando, setArrastando] = useState(false)

  const extrair = useExtrairTemplateIA()

  async function processarArquivo(file: File) {
    const allowed = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    if (!allowed.includes(file.type)) {
      toast.error('Formato inválido', { description: 'Envie um arquivo PDF ou Word (.docx).' })
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Arquivo grande demais', { description: 'O limite é 5 MB.' })
      return
    }

    try {
      const result = await extrair.mutateAsync(file)
      onIASuccess(result.schema as FormularioSchema, result.arquivo_nome)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Tente novamente.'
      toast.error('Erro ao processar o arquivo', { description: msg })
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

  const carregando = extrair.isPending

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center p-4"
        style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
        onClick={carregando ? undefined : onFechar}
      >
        <div
          className="w-full max-w-sm rounded-2xl border border-white/30 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
          style={{ backdropFilter: 'blur(24px)', backgroundColor: 'rgba(255,255,255,0.97)' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-6 pb-4">
            <h2 className="text-base font-semibold text-gray-900">Novo template</h2>
            {!carregando && (
              <button
                onClick={onFechar}
                className="rounded-lg p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="px-6 pb-6 space-y-3">
            {/* Manual */}
            <button
              type="button"
              onClick={onManual}
              disabled={carregando}
              className="w-full flex items-start gap-4 rounded-xl border border-gray-200 p-4 text-left hover:border-[#04c2fb] hover:bg-[#04c2fb]/5 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 group-hover:bg-[#04c2fb]/10 transition-colors">
                <Pencil className="h-5 w-5 text-gray-500 group-hover:text-[#04c2fb] transition-colors" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Construir manualmente</p>
                <p className="text-xs text-gray-500 mt-0.5">Crie seções e campos usando o editor visual.</p>
              </div>
            </button>

            {/* IA */}
            {planoFree ? (
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
            ) : carregando ? (
              <div className="w-full flex items-center gap-4 rounded-xl border border-[#04c2fb]/40 bg-[#04c2fb]/5 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#04c2fb]/10">
                  <Loader2 className="h-5 w-5 text-[#04c2fb] animate-spin" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Processando...</p>
                  <p className="text-xs text-gray-500 mt-0.5">A IA está lendo o documento.</p>
                </div>
              </div>
            ) : (
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
                    {arrastando ? 'Solte o arquivo aqui' : 'Suba um PDF ou Word, uma IA extrairá a estrutura do formulário.'}
                  </p>
                </div>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
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
