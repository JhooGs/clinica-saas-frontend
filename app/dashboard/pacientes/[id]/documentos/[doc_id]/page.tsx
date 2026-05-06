'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AlertTriangle, ArrowLeft, Loader2, Pencil, ShieldAlert, User } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { DocumentoRenderer } from '@/components/documentos/documento-renderer'
import { ModalPortal } from '@/components/modal-portal'
import { useDocumento, useSalvarRespostas } from '@/hooks/use-documentos-paciente'

export default function DocumentoPacientePage() {
  const { id: pacienteId, doc_id: docId } = useParams<{ id: string; doc_id: string }>()
  const router = useRouter()

  const { data: doc, isLoading } = useDocumento(pacienteId, docId)
  const [modoEdicao, setModoEdicao] = useState(false)
  const [confirmandoEdicao, setConfirmandoEdicao] = useState(false)
  const reabrirMutation = useSalvarRespostas(pacienteId, docId)

  function handleConfirmarEdicao() {
    reabrirMutation.mutate(
      { status: 'rascunho' },
      {
        onSuccess: () => {
          setConfirmandoEdicao(false)
          setModoEdicao(true)
          toast.info('Documento reaberto para edição', {
            description: 'As alterações serão registradas na auditoria.',
          })
        },
        onError: () => toast.error('Erro ao reabrir documento'),
      },
    )
  }

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

  const isFinalizado = doc.status === 'finalizado'
  const isReadonly = isFinalizado && !modoEdicao

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
                  isFinalizado && !modoEdicao
                    ? 'bg-green-100 text-green-700'
                    : 'bg-amber-100 text-amber-700'
                }`}
              >
                {isFinalizado && !modoEdicao ? 'Finalizado' : 'Rascunho'}
              </span>
              <span className="text-[10px] text-gray-400">
                {format(new Date(doc.criado_em), "dd 'de' MMM, yyyy", { locale: ptBR })}
              </span>
            </div>
          </div>

          {/* Botão de editar (somente quando finalizado e não em modo edição) */}
          {isFinalizado && !modoEdicao && (
            <button
              type="button"
              onClick={() => setConfirmandoEdicao(true)}
              className="shrink-0 flex items-center gap-1.5 rounded-xl border border-[#04c2fb]/40 bg-[#04c2fb]/5 px-3 py-1.5 text-xs font-medium text-[#04c2fb] hover:bg-[#04c2fb]/10 hover:border-[#04c2fb]/60 transition-colors"
            >
              <Pencil className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Editar</span>
            </button>
          )}

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
      <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-6 space-y-4">

        {/* Banner de aviso ao editar documento finalizado */}
        {modoEdicao && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-500" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-amber-800">Editando documento finalizado</p>
              <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                Esta edição será registrada no log de auditoria da clínica com data, hora e responsável.
              </p>
            </div>
          </div>
        )}

        {doc.schema_snapshot ? (
          <DocumentoRenderer
            pacienteId={pacienteId}
            docId={docId}
            schema={doc.schema_snapshot}
            respostasIniciais={(doc.respostas as Record<string, unknown>) ?? {}}
            readonly={isReadonly}
            ultimoSalvoEm={doc.atualizado_em?.toString()}
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

      {/* Modal de confirmação para editar documento finalizado */}
      {confirmandoEdicao && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backdropFilter: 'blur(6px)', background: 'rgba(0,0,0,0.25)' }}
            onClick={e => { if (e.target === e.currentTarget) setConfirmandoEdicao(false) }}
          >
            <div
              className="w-full max-w-sm rounded-2xl border border-white/60 shadow-2xl"
              style={{ background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(24px)' }}
            >
              <div className="px-6 pt-6 pb-6 space-y-5">
                {/* Ícone + título */}
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 border border-amber-100">
                    <ShieldAlert className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-gray-900">Editar documento finalizado?</h2>
                    <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                      Este documento já foi finalizado. Ao editar, ele voltará para o status de{' '}
                      <span className="font-semibold text-amber-700">rascunho</span> e a alteração será registrada
                      automaticamente no log de auditoria da clínica.
                    </p>
                  </div>
                </div>

                {/* Detalhe auditoria */}
                <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3 flex items-start gap-2.5">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-gray-400" />
                  <p className="text-xs text-gray-500 leading-relaxed">
                    O registro de auditoria incluirá: usuário responsável, data e hora da reabertura.
                  </p>
                </div>

                {/* Ações */}
                <div className="flex items-center gap-2 justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => setConfirmandoEdicao(false)}
                    disabled={reabrirMutation.isPending}
                    className="rounded-xl px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors border border-gray-200 disabled:opacity-60"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmarEdicao}
                    disabled={reabrirMutation.isPending}
                    className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-all hover:brightness-110 disabled:opacity-60"
                    style={{ background: 'linear-gradient(135deg, #0094c8 0%, #04c2fb 60%, #00d5f5 100%)' }}
                  >
                    {reabrirMutation.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Pencil className="h-3.5 w-3.5" />
                    )}
                    Editar documento
                  </button>
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  )
}
