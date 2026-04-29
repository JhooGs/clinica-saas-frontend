'use client'

import { useEffect, useRef, useState } from 'react'
import { ptBR } from 'react-day-picker/locale'
import { CalendarIcon, X } from 'lucide-react'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isoToDisplay(iso: string): string {
  if (!iso || iso.length < 10) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function displayToIso(display: string): string {
  const digits = display.replace(/\D/g, '')
  if (digits.length !== 8) return ''
  const d = digits.slice(0, 2)
  const m = digits.slice(2, 4)
  const y = digits.slice(4, 8)
  const date = new Date(Number(y), Number(m) - 1, Number(d))
  if (
    date.getFullYear() !== Number(y) ||
    date.getMonth() !== Number(m) - 1 ||
    date.getDate() !== Number(d)
  ) return ''
  return `${y}-${m}-${d}`
}

function isoToDate(iso: string): Date | undefined {
  if (!iso) return undefined
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function dateToIso(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function applyMask(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface DateInputProps {
  value: string           // YYYY-MM-DD ou ''
  onChange: (iso: string) => void
  placeholder?: string
  className?: string
  hasError?: boolean
  disabled?: boolean
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function DateInput({
  value,
  onChange,
  placeholder = 'DD/MM/AAAA',
  className,
  hasError = false,
  disabled = false,
}: DateInputProps) {
  const [display, setDisplay] = useState(() => isoToDisplay(value))
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Sincroniza display quando value muda externamente
  useEffect(() => {
    setDisplay(isoToDisplay(value))
  }, [value])

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const masked = applyMask(e.target.value)
    setDisplay(masked)
    const iso = displayToIso(masked)
    onChange(iso) // '' enquanto incompleto/inválido, YYYY-MM-DD quando válido
  }

  function handleCalendarSelect(date: Date | undefined) {
    if (!date) return
    const iso = dateToIso(date)
    onChange(iso)
    setDisplay(isoToDisplay(iso))
    setOpen(false)
    inputRef.current?.focus()
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation()
    onChange('')
    setDisplay('')
    inputRef.current?.focus()
  }

  const hasValue = !!value
  const selected = isoToDate(value)

  return (
    <div className={cn('relative flex items-center', className)}>
      {/* Input de digitação manual */}
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        value={display}
        onChange={handleInputChange}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          'w-full rounded-xl border py-2.5 pl-3.5 pr-16 text-sm transition-all',
          'focus:outline-none focus:ring-2',
          'disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed',
          hasError
            ? 'border-red-300 bg-red-50/40 focus:ring-red-300/40 focus:border-red-400'
            : hasValue
            ? 'border-[#04c2fb]/50 bg-white focus:ring-[#04c2fb]/30 focus:border-[#04c2fb]'
            : 'border-gray-200 bg-white focus:ring-[#04c2fb]/30 focus:border-[#04c2fb]',
        )}
      />

      {/* Botões à direita: limpar + calendário */}
      <div className="absolute right-1 flex items-center gap-0.5">
        {hasValue && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="rounded-md p-1 text-gray-400 hover:text-gray-600 transition-colors"
            tabIndex={-1}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              disabled={disabled}
              className={cn(
                'rounded-lg p-1.5 transition-colors',
                disabled
                  ? 'text-gray-300 cursor-not-allowed'
                  : open
                  ? 'text-[#04c2fb] bg-[#04c2fb]/10'
                  : 'text-gray-400 hover:text-[#04c2fb] hover:bg-[#04c2fb]/8',
              )}
              tabIndex={-1}
            >
              <CalendarIcon className="h-4 w-4" />
            </button>
          </PopoverTrigger>

          <PopoverContent
            className="w-auto p-0 shadow-xl border border-gray-100"
            align="end"
            sideOffset={6}
          >
            {/* Header brand */}
            <div
              className="flex items-center justify-between px-4 py-2.5 rounded-t-lg"
              style={{ background: 'linear-gradient(135deg, #0094c8 0%, #04c2fb 60%, #00d5f5 100%)' }}
            >
              <span className="text-xs font-semibold text-white">
                {hasValue ? isoToDisplay(value) : 'Selecione a data'}
              </span>
              {hasValue && (
                <button
                  onClick={() => { onChange(''); setDisplay(''); setOpen(false) }}
                  className="text-white/70 hover:text-white text-xs underline"
                >
                  Limpar
                </button>
              )}
            </div>

            <Calendar
              mode="single"
              selected={selected}
              onSelect={handleCalendarSelect}
              locale={ptBR}
              defaultMonth={selected}
            />

            <div className="flex justify-end px-3 py-2 border-t border-gray-100">
              <button
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100 transition-colors"
              >
                Fechar
              </button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}
