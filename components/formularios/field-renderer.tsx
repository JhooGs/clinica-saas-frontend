'use client'

import { DateInput } from '@/components/ui/date-input'
import type { Campo } from '@/types'

interface FieldRendererProps {
  campo: Campo
  valor: unknown
  onChange: (valor: unknown) => void
  readonly?: boolean
  comErro?: boolean
}

export function FieldRenderer({ campo, valor, onChange, readonly = false, comErro = false }: FieldRendererProps) {
  const bordaNormal = 'border-gray-200 focus:ring-[#04c2fb]/40 focus:border-[#04c2fb]'
  const bordaErro   = 'border-red-300 focus:ring-red-300/40 focus:border-red-400 bg-red-50/40'
  const base = `w-full rounded-lg border ${comErro ? bordaErro : bordaNormal} px-3 py-2 text-sm focus:outline-none focus:ring-2 disabled:bg-gray-50 disabled:text-gray-500`

  if (campo.tipo === 'secao') {
    return (
      <h4 className="text-sm font-semibold text-gray-700 mt-2 border-b border-gray-100 pb-1">
        {campo.label}
      </h4>
    )
  }

  if (campo.tipo === 'texto_informativo') {
    return (
      <p className="text-sm text-gray-500 leading-relaxed bg-gray-50 rounded-lg px-3 py-2">
        {campo.conteudo ?? campo.label}
      </p>
    )
  }

  const labelEl = (
    <label className="block text-xs font-medium text-gray-600 mb-1">
      {campo.label}
      {campo.obrigatorio && <span className="text-red-400 ml-0.5">*</span>}
    </label>
  )

  const erroMsg = comErro && (
    <p className="text-xs text-red-500 mt-1">Campo obrigatório</p>
  )

  if (campo.tipo === 'texto_curto') {
    return (
      <div>
        {labelEl}
        <input type="text" className={base} value={(valor as string) ?? ''} onChange={e => onChange(e.target.value)} disabled={readonly} />
        {erroMsg}
      </div>
    )
  }

  if (campo.tipo === 'texto_longo') {
    return (
      <div>
        {labelEl}
        <textarea className={`${base} min-h-[80px] resize-y`} value={(valor as string) ?? ''} onChange={e => onChange(e.target.value)} disabled={readonly} />
        {erroMsg}
      </div>
    )
  }

  if (campo.tipo === 'data') {
    return (
      <div>
        {labelEl}
        <DateInput
          value={(valor as string) ?? ''}
          onChange={onChange}
          hasError={comErro}
          disabled={readonly}
        />
        {erroMsg}
      </div>
    )
  }

  if (campo.tipo === 'numero') {
    return (
      <div>
        {labelEl}
        <input type="number" className={base} value={(valor as number) ?? ''} min={campo.min} max={campo.max} onChange={e => onChange(e.target.valueAsNumber)} disabled={readonly} />
        {erroMsg}
      </div>
    )
  }

  if (campo.tipo === 'sim_nao') {
    return (
      <div>
        {labelEl}
        <div className={`flex gap-3 ${comErro ? 'rounded-lg ring-1 ring-red-300 p-2 bg-red-50/40' : ''}`}>
          {['Sim', 'Não'].map(op => (
            <label key={op} className="flex items-center gap-1.5 cursor-pointer text-sm text-gray-700">
              <input type="radio" name={`campo-${campo.id}`} value={op} checked={valor === op} onChange={() => onChange(op)} disabled={readonly} className="accent-[#04c2fb]" />
              {op}
            </label>
          ))}
        </div>
        {erroMsg}
      </div>
    )
  }

  if (campo.tipo === 'escolha_unica') {
    return (
      <div>
        {labelEl}
        <div className={`flex flex-col gap-1.5 ${comErro ? 'rounded-lg ring-1 ring-red-300 p-2 bg-red-50/40' : ''}`}>
          {(campo.opcoes ?? []).map(op => (
            <label key={op} className="flex items-center gap-1.5 cursor-pointer text-sm text-gray-700">
              <input type="radio" name={`campo-${campo.id}`} value={op} checked={valor === op} onChange={() => onChange(op)} disabled={readonly} className="accent-[#04c2fb]" />
              {op}
            </label>
          ))}
        </div>
        {erroMsg}
      </div>
    )
  }

  if (campo.tipo === 'escolha_multipla') {
    const selecionados = (valor as string[]) ?? []
    return (
      <div>
        {labelEl}
        <div className={`flex flex-col gap-1.5 ${comErro ? 'rounded-lg ring-1 ring-red-300 p-2 bg-red-50/40' : ''}`}>
          {(campo.opcoes ?? []).map(op => (
            <label key={op} className="flex items-center gap-1.5 cursor-pointer text-sm text-gray-700">
              <input
                type="checkbox"
                value={op}
                checked={selecionados.includes(op)}
                onChange={e => {
                  if (e.target.checked) onChange([...selecionados, op])
                  else onChange(selecionados.filter(s => s !== op))
                }}
                disabled={readonly}
                className="accent-[#04c2fb]"
              />
              {op}
            </label>
          ))}
        </div>
        {erroMsg}
      </div>
    )
  }

  if (campo.tipo === 'escala') {
    const min = campo.min ?? 0
    const max = campo.max ?? 10
    const val = (valor as number) ?? min
    return (
      <div>
        {labelEl}
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400 w-4 text-right">{min}</span>
          <input type="range" min={min} max={max} value={val} onChange={e => onChange(Number(e.target.value))} disabled={readonly} className="flex-1 accent-[#04c2fb]" />
          <span className="text-xs text-gray-400 w-4">{max}</span>
          <span className="text-sm font-semibold text-[#04c2fb] w-6 text-center">{val}</span>
        </div>
      </div>
    )
  }

  return null
}
