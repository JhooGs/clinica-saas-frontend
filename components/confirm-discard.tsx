'use client'

import { AlertTriangle } from 'lucide-react'
import { ModalPortal } from '@/components/modal-portal'

export function ConfirmDiscard({
  onConfirmar,
  onCancelar,
}: {
  onConfirmar: () => void
  onCancelar: () => void
}) {
  return (
    <ModalPortal>
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-white/30 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        style={{ backdropFilter: 'blur(24px)', backgroundColor: 'rgba(255,255,255,0.95)' }}
      >
        {/* Ícone */}
        <div className="flex justify-center pt-7 pb-2">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 ring-8 ring-amber-50/50">
            <AlertTriangle className="h-7 w-7 text-amber-500" />
          </div>
        </div>

        {/* Texto */}
        <div className="px-6 pb-2 text-center">
          <h3 className="text-base font-semibold tracking-tight text-gray-900">
            Descartar alterações?
          </h3>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            Os dados preenchidos serão perdidos e essa ação não poderá ser desfeita.
          </p>
        </div>

        {/* Botões */}
        <div className="flex gap-3 px-6 pt-4 pb-6">
          <button
            onClick={onCancelar}
            className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 hover:border-gray-300"
          >
            Voltar ao formulário
          </button>
          <button
            onClick={onConfirmar}
            className="flex-1 rounded-xl px-4 py-2.5 text-sm font-medium text-white transition-all hover:brightness-110"
            style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' }}
          >
            Descartar
          </button>
        </div>
      </div>
    </div>
    </ModalPortal>
  )
}
