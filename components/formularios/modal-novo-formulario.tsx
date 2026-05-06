'use client'

import { useMemo, useState } from 'react'
import { X, FileText, Loader2 } from 'lucide-react'
import { ModalPortal } from '@/components/modal-portal'
import { useTemplates } from '@/hooks/use-templates'
import type { FormularioTemplate } from '@/types'

interface ModalNovoFormularioProps {
  onSelecionar: (template: FormularioTemplate, nome: string) => void
  onFechar: () => void
  isLoading?: boolean
}

export function ModalNovoFormulario({
  onSelecionar,
  onFechar,
  isLoading = false,
}: ModalNovoFormularioProps) {
  const [categoriaFiltro, setCategoriaFiltro] = useState('')

  const { data: templates = [], isLoading: loadingTemplates } = useTemplates()

  // Categorias derivadas dos templates reais — sem hardcode
  const categorias = useMemo(() => {
    const cats = new Set(templates.map(t => t.categoria))
    return Array.from(cats).sort()
  }, [templates])

  const templatesFiltrados = useMemo(() => {
    if (!categoriaFiltro) return templates
    return templates.filter(t => t.categoria === categoriaFiltro)
  }, [templates, categoriaFiltro])

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center p-4"
        style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
        onClick={onFechar}
      >
        <div
          className="w-full max-w-md rounded-2xl border border-white/30 shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]"
          style={{ backdropFilter: 'blur(24px)', backgroundColor: 'rgba(255,255,255,0.97)' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-6 pb-4 shrink-0">
            <h2 className="text-base font-semibold text-gray-900">Novo formulário</h2>
            <button
              onClick={onFechar}
              className="rounded-lg p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Filtro de categorias — derivado dos templates existentes */}
          {categorias.length > 0 && (
            <div className="px-6 pb-3 shrink-0">
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setCategoriaFiltro('')}
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-all ${
                    categoriaFiltro === '' ? 'bg-[#04c2fb] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Todos
                </button>
                {categorias.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoriaFiltro(cat)}
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium capitalize transition-all ${
                      categoriaFiltro === cat ? 'bg-[#04c2fb] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Lista de templates */}
          <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-2 min-h-0">
            {loadingTemplates ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-[#04c2fb]" />
              </div>
            ) : templatesFiltrados.length === 0 ? (
              <div className="py-10 text-center">
                <FileText className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                <p className="text-sm text-gray-400">
                  {templates.length === 0
                    ? 'Nenhum template criado ainda.'
                    : 'Nenhum template nessa categoria.'}
                </p>
                {templates.length === 0 && (
                  <p className="text-xs text-gray-400 mt-1">
                    Acesse Formulários no menu para criar templates.
                  </p>
                )}
              </div>
            ) : (
              templatesFiltrados.map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onSelecionar(t, t.nome)}
                  disabled={isLoading}
                  className="w-full flex items-start gap-3 rounded-xl border border-gray-200 p-3 text-left hover:border-[#04c2fb] hover:bg-[#04c2fb]/5 transition-all disabled:opacity-60"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#04c2fb]/10">
                    <FileText className="h-4 w-4 text-[#04c2fb]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{t.nome}</p>
                    <p className="text-xs text-gray-500 mt-0.5 capitalize">{t.categoria}</p>
                  </div>
                  {isLoading && <Loader2 className="ml-auto h-4 w-4 animate-spin text-[#04c2fb] shrink-0 self-center" />}
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </ModalPortal>
  )
}
