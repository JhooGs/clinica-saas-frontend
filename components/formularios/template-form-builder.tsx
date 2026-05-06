'use client'

import { useState } from 'react'
import { Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import { FieldEditor } from '@/components/formularios/field-editor'
import { FieldRenderer } from '@/components/formularios/field-renderer'
import type { FormularioSchema, Secao, Campo } from '@/types'

interface TemplateFormBuilderProps {
  schema: FormularioSchema
  onChange: (schema: FormularioSchema) => void
}

export function TemplateFormBuilder({ schema, onChange }: TemplateFormBuilderProps) {
  const [preview, setPreview] = useState(false)
  const [colapsadas, setColapsadas] = useState<Set<string>>(new Set())

  const toggleColapsada = (id: string) => {
    setColapsadas(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const adicionarSecao = () => {
    onChange({
      secoes: [
        ...schema.secoes,
        { id: crypto.randomUUID(), titulo: 'Nova seção', campos: [] },
      ],
    })
  }

  const atualizarSecao = (secaoId: string, patch: Partial<Secao>) => {
    onChange({
      secoes: schema.secoes.map(s => s.id === secaoId ? { ...s, ...patch } : s),
    })
  }

  const removerSecao = (secaoId: string) => {
    onChange({ secoes: schema.secoes.filter(s => s.id !== secaoId) })
  }

  const adicionarCampo = (secaoId: string) => {
    const novoCampo: Campo = { id: crypto.randomUUID(), tipo: 'texto_curto', label: '', obrigatorio: false }
    onChange({
      secoes: schema.secoes.map(s =>
        s.id === secaoId ? { ...s, campos: [...s.campos, novoCampo] } : s
      ),
    })
  }

  const atualizarCampo = (secaoId: string, campo: Campo) => {
    onChange({
      secoes: schema.secoes.map(s =>
        s.id === secaoId
          ? { ...s, campos: s.campos.map(c => c.id === campo.id ? campo : c) }
          : s
      ),
    })
  }

  const removerCampo = (secaoId: string, campoId: string) => {
    onChange({
      secoes: schema.secoes.map(s =>
        s.id === secaoId ? { ...s, campos: s.campos.filter(c => c.id !== campoId) } : s
      ),
    })
  }

  return (
    <div className="space-y-4">
      {/* Toggle preview */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setPreview(v => !v)}
          className="text-xs rounded-lg border border-gray-200 px-3 py-1.5 text-gray-600 hover:bg-gray-50 transition-colors"
        >
          {preview ? 'Editor' : 'Pré-visualizar'}
        </button>
      </div>

      {preview ? (
        // ── Preview ──────────────────────────────────────────────────────────
        <div className="space-y-4">
          {schema.secoes.map(secao => (
            <div key={secao.id} className="rounded-xl border border-gray-100 bg-white p-4 space-y-4">
              <h3 className="text-sm font-semibold text-gray-800 pb-2 border-b border-gray-100">{secao.titulo}</h3>
              {secao.campos.map(campo => (
                <FieldRenderer
                  key={campo.id}
                  campo={campo}
                  valor={undefined}
                  onChange={() => {}}
                  readonly={true}
                />
              ))}
            </div>
          ))}
          {schema.secoes.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">Nenhuma seção criada.</p>
          )}
        </div>
      ) : (
        // ── Editor ───────────────────────────────────────────────────────────
        <div className="space-y-4">
          {schema.secoes.map(secao => (
            <div key={secao.id} className="rounded-xl border border-gray-200 bg-gray-50/50">
              {/* Cabeçalho da seção */}
              <div className="flex items-center gap-2 p-3 border-b border-gray-200">
                <button
                  type="button"
                  onClick={() => toggleColapsada(secao.id)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {colapsadas.has(secao.id)
                    ? <ChevronRight className="h-4 w-4" />
                    : <ChevronDown className="h-4 w-4" />
                  }
                </button>
                <input
                  type="text"
                  value={secao.titulo}
                  onChange={e => atualizarSecao(secao.id, { titulo: e.target.value })}
                  className="flex-1 bg-transparent text-sm font-medium text-gray-800 focus:outline-none"
                  placeholder="Nome da seção"
                />
                <button
                  type="button"
                  onClick={() => removerSecao(secao.id)}
                  className="text-gray-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {/* Campos */}
              {!colapsadas.has(secao.id) && (
                <div className="p-3 space-y-2">
                  {secao.campos.map(campo => (
                    <FieldEditor
                      key={campo.id}
                      campo={campo}
                      onChange={c => atualizarCampo(secao.id, c)}
                      onRemover={() => removerCampo(secao.id, campo.id)}
                    />
                  ))}
                  <button
                    type="button"
                    onClick={() => adicionarCampo(secao.id)}
                    className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-300 py-2 text-xs text-gray-500 hover:border-[#04c2fb] hover:text-[#04c2fb] transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Adicionar campo
                  </button>
                </div>
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={adicionarSecao}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 py-3 text-sm text-gray-500 hover:border-[#04c2fb] hover:text-[#04c2fb] transition-colors"
          >
            <Plus className="h-4 w-4" />
            Adicionar seção
          </button>
        </div>
      )}
    </div>
  )
}
