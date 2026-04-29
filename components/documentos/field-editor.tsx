'use client'

import { useState } from 'react'
import { Trash2, Plus, GripVertical } from 'lucide-react'
import { SelectClinitra } from '@/components/ui/select-clinitra'
import type { Campo, TipoCampo } from '@/types'

const TIPOS: { value: TipoCampo; label: string }[] = [
  { value: 'texto_curto', label: 'Texto curto' },
  { value: 'texto_longo', label: 'Texto longo' },
  { value: 'escolha_unica', label: 'Escolha única' },
  { value: 'escolha_multipla', label: 'Múltipla escolha' },
  { value: 'escala', label: 'Escala numérica' },
  { value: 'data', label: 'Data' },
  { value: 'numero', label: 'Número' },
  { value: 'sim_nao', label: 'Sim / Não' },
  { value: 'secao', label: 'Título de seção' },
  { value: 'texto_informativo', label: 'Texto informativo' },
]

const inputCls = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#04c2fb]/40 focus:border-[#04c2fb]'

interface FieldEditorProps {
  campo: Campo
  onChange: (campo: Campo) => void
  onRemover: () => void
}

export function FieldEditor({ campo, onChange, onRemover }: FieldEditorProps) {
  const [novaOpcao, setNovaOpcao] = useState('')

  const update = (patch: Partial<Campo>) => onChange({ ...campo, ...patch })

  const adicionarOpcao = () => {
    const v = novaOpcao.trim()
    if (!v) return
    update({ opcoes: [...(campo.opcoes ?? []), v] })
    setNovaOpcao('')
  }

  const removerOpcao = (idx: number) => {
    update({ opcoes: (campo.opcoes ?? []).filter((_, i) => i !== idx) })
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
      <div className="flex items-start gap-2">
        <GripVertical className="h-4 w-4 text-gray-300 mt-2 shrink-0" />
        <div className="flex-1 space-y-3">
          {/* Tipo */}
          <div className="flex gap-2 items-center">
            <SelectClinitra
              value={campo.tipo}
              onChange={v => update({ tipo: v })}
              options={TIPOS}
              placeholder="Tipo de campo"
              searchPlaceholder="Filtrar tipos..."
              className="w-52"
            />
            <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer ml-auto shrink-0">
              <input
                type="checkbox"
                checked={campo.obrigatorio ?? false}
                onChange={e => update({ obrigatorio: e.target.checked })}
                className="accent-[#04c2fb]"
              />
              Obrigatório
            </label>
          </div>

          {/* Label */}
          <input
            type="text"
            value={campo.label}
            onChange={e => update({ label: e.target.value })}
            placeholder={campo.tipo === 'secao' ? 'Título da seção' : campo.tipo === 'texto_informativo' ? 'Texto informativo' : 'Pergunta / rótulo do campo'}
            className={inputCls}
          />

          {/* Conteúdo (texto_informativo) */}
          {campo.tipo === 'texto_informativo' && (
            <textarea
              value={campo.conteudo ?? ''}
              onChange={e => update({ conteudo: e.target.value })}
              placeholder="Conteúdo explicativo (markdown)"
              className={`${inputCls} min-h-[60px] resize-y`}
            />
          )}

          {/* Opções (escolha_unica / escolha_multipla) */}
          {(campo.tipo === 'escolha_unica' || campo.tipo === 'escolha_multipla') && (
            <div className="space-y-2">
              {(campo.opcoes ?? []).map((op, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="flex-1 text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-1.5 border border-gray-100">{op}</span>
                  <button
                    type="button"
                    onClick={() => removerOpcao(i)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={novaOpcao}
                  onChange={e => setNovaOpcao(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); adicionarOpcao() } }}
                  placeholder="Nova opção..."
                  className={`${inputCls} flex-1`}
                />
                <button
                  type="button"
                  onClick={adicionarOpcao}
                  className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Adicionar
                </button>
              </div>
            </div>
          )}

          {/* Escala min/max */}
          {campo.tipo === 'escala' && (
            <div className="flex gap-3 items-center">
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500">Min</label>
                <input
                  type="number"
                  value={campo.min ?? 0}
                  onChange={e => update({ min: Number(e.target.value) })}
                  className={`${inputCls} w-16`}
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500">Max</label>
                <input
                  type="number"
                  value={campo.max ?? 10}
                  onChange={e => update({ max: Number(e.target.value) })}
                  className={`${inputCls} w-16`}
                />
              </div>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onRemover}
          className="text-gray-300 hover:text-red-500 transition-colors mt-2 shrink-0"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
