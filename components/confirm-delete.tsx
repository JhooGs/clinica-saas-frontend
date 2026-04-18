'use client'

import { Trash2, AlertTriangle, Loader2 } from 'lucide-react'
import { ModalPortal } from '@/components/modal-portal'

export function ConfirmDelete({
  onConfirmar,
  onCancelar,
  titulo = 'Deletar registro?',
  descricao = 'Essa ação é permanente e não poderá ser desfeita.',
  consequencias,
  textoBotaoConfirmar = 'Deletar registro',
  textoBotaoCancelar = 'Cancelar',
  isLoading = false,
}: {
  onConfirmar: () => void
  onCancelar: () => void
  titulo?: string
  descricao?: string
  consequencias?: string[]
  textoBotaoConfirmar?: string
  textoBotaoCancelar?: string
  isLoading?: boolean
}) {
  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center p-4"
        style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
      >
        <div
          className="w-full max-w-md rounded-2xl border border-white/30 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
          style={{ backdropFilter: 'blur(24px)', backgroundColor: 'rgba(255,255,255,0.97)' }}
        >
          {/* Ícone */}
          <div className="flex justify-center pt-7 pb-2">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 ring-8 ring-red-50/60">
              <Trash2 className="h-7 w-7 text-red-500" />
            </div>
          </div>

          {/* Texto principal */}
          <div className="px-6 pb-1 text-center">
            <h3 className="text-base font-semibold tracking-tight text-gray-900">
              {titulo}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              {descricao}
            </p>
          </div>

          {/* Lista de consequências */}
          {consequencias && consequencias.length > 0 && (
            <div className="mx-6 mt-4 rounded-xl border border-red-100 bg-red-50/70 p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                <p className="text-[11px] font-semibold uppercase tracking-wide text-red-600">
                  O que vai acontecer
                </p>
              </div>
              <ul className="space-y-2">
                {consequencias.map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-xs text-gray-600 leading-relaxed">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-red-400 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Botões */}
          <div className="flex flex-col sm:flex-row gap-3 px-6 pt-4 pb-6">
            <button
              onClick={onCancelar}
              disabled={isLoading}
              className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 order-2 sm:order-1"
            >
              {textoBotaoCancelar}
            </button>
            <button
              onClick={onConfirmar}
              disabled={isLoading}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white transition-all hover:brightness-110 disabled:opacity-70 order-1 sm:order-2"
              style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' }}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                textoBotaoConfirmar
              )}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  )
}
