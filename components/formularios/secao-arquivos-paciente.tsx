'use client'

import { useRef, useState } from 'react'
import { Paperclip, Upload, Loader2, FileText, Image as ImageIcon, Trash2, Download } from 'lucide-react'
import { toast } from 'sonner'
import { useFormulariosPaciente, useCriarFormulario, useDeletarFormulario } from '@/hooks/use-formularios-paciente'
import { uploadAnexoPaciente } from '@/lib/formularios-storage'
import { isVideoFile } from '@/lib/registro-storage'
import { createClient } from '@/lib/supabase'
import { ConfirmDelete } from '@/components/confirm-delete'

const MAX_MB = 10

function iconeArquivo(url: string) {
  const ext = url.split('.').pop()?.toLowerCase() ?? ''
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic'].includes(ext)) return ImageIcon
  return FileText
}

interface SecaoArquivosPacienteProps {
  pacienteId: string
  readOnly?: boolean
}

export function SecaoArquivosPaciente({ pacienteId, readOnly = false }: SecaoArquivosPacienteProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; nome: string } | null>(null)

  const { data: arquivos = [] } = useFormulariosPaciente(pacienteId, undefined, 'arquivo')
  const criarMutation = useCriarFormulario(pacienteId)
  const deletarMutation = useDeletarFormulario(pacienteId)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!inputRef.current) inputRef.current!.value = ''
    if (!file) return

    if (isVideoFile(file)) {
      toast.error('Formato não permitido', { description: 'Vídeos não podem ser anexados. Use imagens, PDF, MP3 ou documentos.' })
      return
    }

    if (file.size > MAX_MB * 1024 * 1024) {
      toast.error(`Arquivo muito grande`, { description: `Máximo ${MAX_MB} MB por arquivo.` })
      return
    }

    setUploading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const clinicaId = (user?.user_metadata?.clinica_id as string) ?? 'sem-clinica'
      const tempId = crypto.randomUUID()

      const url = await uploadAnexoPaciente(file, clinicaId, pacienteId, tempId)

      criarMutation.mutate(
        { nome: file.name, arquivo_anexo_url: url },
        {
          onSuccess: () => toast.success('Arquivo enviado'),
          onError: () => toast.error('Erro ao salvar arquivo'),
        },
      )
    } catch {
      toast.error('Erro ao enviar arquivo')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const handleDeletar = () => {
    if (!confirmDelete) return
    deletarMutation.mutate(confirmDelete.id, {
      onSuccess: () => {
        toast.success(`"${confirmDelete.nome}" removido`)
        setConfirmDelete(null)
      },
      onError: () => toast.error('Erro ao remover arquivo'),
    })
  }

  return (
    <div className="p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
          <Paperclip className="h-4 w-4 text-[#04c2fb]" />
          Arquivos
        </h2>
        {!readOnly && (
          <>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors disabled:opacity-50"
            >
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              Enviar arquivo
            </button>
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.mp3,.gif,.txt"
              onChange={handleFileChange}
            />
          </>
        )}
      </div>

      {arquivos.length === 0 ? (
        readOnly ? (
          <div className="rounded-xl border border-dashed border-gray-200 py-8 text-center">
            <Paperclip className="mx-auto h-8 w-8 text-gray-300 mb-2" />
            <p className="text-sm text-gray-400">Nenhum arquivo.</p>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="w-full flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 py-8 text-center hover:border-[#04c2fb]/40 hover:bg-[#04c2fb]/5 transition-all disabled:opacity-50"
          >
            <Upload className="h-7 w-7 text-gray-300 mb-2" />
            <p className="text-sm text-gray-400">Envie fotos, documentos e registros antigos</p>
            <p className="text-xs text-gray-300 mt-1">PDF, imagens, Word, Excel, MP3 — até {MAX_MB} MB</p>
          </button>
        )
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {arquivos.map(arq => {
            const Icone = iconeArquivo(arq.arquivo_anexo_url ?? '')
            return (
              <div
                key={arq.id}
                className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 group"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                  <Icone className="h-4.5 w-4.5 text-gray-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">{arq.nome}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(arq.criado_em).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity">
                  {arq.arquivo_anexo_url && (
                    <a
                      href={arq.arquivo_anexo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg p-1.5 text-gray-400 hover:text-[#04c2fb] hover:bg-[#04c2fb]/10 transition-colors"
                      title="Abrir arquivo"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                  )}
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => setConfirmDelete({ id: arq.id, nome: arq.nome })}
                      className="rounded-lg p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      title="Remover"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {confirmDelete && (
        <ConfirmDelete
          titulo={`Remover "${confirmDelete.nome}"?`}
          descricao="O arquivo será removido do perfil do paciente."
          textoBotaoConfirmar="Remover arquivo"
          isLoading={deletarMutation.isPending}
          onConfirmar={handleDeletar}
          onCancelar={() => setConfirmDelete(null)}
        />
      )}
    </div>
  )
}
