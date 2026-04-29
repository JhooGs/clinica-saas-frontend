'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Option<T extends string> {
  value: T
  label: string
}

interface SelectClinitaProps<T extends string> {
  value: T
  onChange: (value: T) => void
  options: Option<T>[]
  placeholder?: string
  searchPlaceholder?: string
  className?: string
}

export function SelectClinitra<T extends string>({
  value,
  onChange,
  options,
  placeholder = 'Selecionar...',
  searchPlaceholder = 'Buscar...',
  className,
}: SelectClinitaProps<T>) {
  const [aberto, setAberto] = useState(false)
  const [busca, setBusca] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selecionado = options.find(o => o.value === value)

  const filtrados = useMemo(() => {
    const t = busca.toLowerCase().trim()
    return t ? options.filter(o => o.label.toLowerCase().includes(t)) : options
  }, [busca, options])

  useEffect(() => {
    function handleClickFora(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAberto(false)
        setBusca('')
      }
    }
    document.addEventListener('mousedown', handleClickFora)
    return () => document.removeEventListener('mousedown', handleClickFora)
  }, [])

  function abrir() {
    setAberto(v => !v)
    if (!aberto) setTimeout(() => inputRef.current?.focus(), 50)
  }

  function selecionar(opcao: Option<T>) {
    onChange(opcao.value)
    setAberto(false)
    setBusca('')
  }

  return (
    <div className={cn('relative', className)} ref={containerRef}>
      <button
        type="button"
        onClick={abrir}
        className={cn(
          'w-full flex items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 text-sm transition-all focus:outline-none bg-white',
          aberto
            ? 'border-[#04c2fb] ring-2 ring-[#04c2fb]/30'
            : 'border-gray-200 hover:border-gray-300',
        )}
      >
        <span className={selecionado ? 'text-gray-900' : 'text-gray-400'}>
          {selecionado?.label ?? placeholder}
        </span>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-gray-400 shrink-0 transition-transform duration-150',
            aberto && 'rotate-180',
          )}
        />
      </button>

      {aberto && (
        <div
          className="absolute left-0 right-0 top-full z-30 mt-1.5 rounded-xl border border-gray-100 shadow-xl overflow-hidden"
          style={{ backdropFilter: 'blur(16px)', backgroundColor: 'rgba(255,255,255,0.98)' }}
        >
          {/* Busca */}
          <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-2.5">
            <Search className="h-3.5 w-3.5 text-gray-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full bg-transparent text-sm outline-none text-gray-700 placeholder:text-gray-400"
            />
          </div>

          {/* Opções */}
          <div className="max-h-52 overflow-y-auto py-1">
            {filtrados.length > 0 ? (
              filtrados.map(opcao => (
                <button
                  key={opcao.value}
                  type="button"
                  onMouseDown={e => { e.preventDefault(); selecionar(opcao) }}
                  className={cn(
                    'w-full px-3.5 py-2.5 text-left text-sm transition-colors flex items-center justify-between gap-2',
                    opcao.value === value
                      ? 'bg-[#04c2fb]/10 text-[#04c2fb] font-medium'
                      : 'text-gray-700 hover:bg-[#04c2fb]/8 hover:text-[#04c2fb]',
                  )}
                >
                  <span>{opcao.label}</span>
                  {opcao.value === value && <Check className="h-3.5 w-3.5 shrink-0" />}
                </button>
              ))
            ) : (
              <div className="px-4 py-4 text-center">
                <p className="text-xs text-gray-400 italic">Nenhuma opção encontrada</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
