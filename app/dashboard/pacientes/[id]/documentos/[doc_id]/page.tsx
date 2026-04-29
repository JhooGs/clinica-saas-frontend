'use client'

import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, User } from 'lucide-react'
import { DocumentoRenderer } from '@/components/documentos/documento-renderer'
import { useDocumento } from '@/hooks/use-documentos-paciente'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function DocumentoPacientePage() {
  const { id: pacienteId, doc_id: docId } = useParams<{ id: string; doc_id: string }>()
  const router = useRouter()

  const { data: doc, isLoading } = useDocumento(pacienteId, docId)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-[#04c2fb]" />
      </div>
    )
  }

  if (!doc) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-gray-400">
        Documento não encontrado.
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50/50">

      {/* Barra superior fixa */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push(`/dashboard/documentos`)}
            className="rounded-lg p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900 truncate">{doc.nome}</p>
            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] font-medium rounded-full px-2 py-0.5 ${
                  doc.status === 'finalizado'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-amber-100 text-amber-700'
                }`}
              >
                {doc.status === 'finalizado' ? 'Finalizado' : 'Rascunho'}
              </span>
              <span className="text-[10px] text-gray-400">
                {format(new Date(doc.criado_em), "dd 'de' MMM, yyyy", { locale: ptBR })}
              </span>
            </div>
          </div>

          {/* Atalho para o perfil do paciente */}
          <button
            type="button"
            onClick={() => router.push(`/dashboard/pacientes/${pacienteId}`)}
            className="shrink-0 flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50 hover:border-gray-300 transition-colors"
          >
            <User className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Ver paciente</span>
          </button>
        </div>
      </div>

      {/* Conteúdo centralizado */}
      <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-6">
        {doc.schema_snapshot ? (
          <DocumentoRenderer
            pacienteId={pacienteId}
            docId={docId}
            schema={doc.schema_snapshot}
            respostasIniciais={(doc.respostas as Record<string, unknown>) ?? {}}
            readonly={doc.status === 'finalizado'}
            onFinalizar={() => router.push('/dashboard/documentos')}
          />
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm">
            <p className="text-sm text-gray-500">
              Este documento é um anexo avulso. Use o campo abaixo para associar um arquivo.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
