'use client'

import * as React from 'react'
import { ptBR } from 'react-day-picker/locale'
import { CalendarIcon, X } from 'lucide-react'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function formatDateBR(iso: string): string {
  const date = isoToDate(iso)
  if (!date) return ''
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface DatePickerProps {
  value: string                 // YYYY-MM-DD ou ''
  onChange: (iso: string) => void
  placeholder?: string
  className?: string
  hasError?: boolean
  /**
   * "default"   → navegação padrão mês a mês
   * "birthdate" → dropdowns de mês/ano, range 1920–hoje
   */
  variant?: 'default' | 'birthdate'
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function DatePicker({
  value,
  onChange,
  placeholder = 'Selecionar data',
  className,
  hasError,
  variant = 'default',
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)

  const isBirthdate = variant === 'birthdate'
  const selected    = isoToDate(value)
  const label       = value ? formatDateBR(value) : placeholder
  const hasValue    = !!value

  const today = new Date()
  const startMonth = isBirthdate ? new Date(today.getFullYear() - 100, 0, 1) : undefined
  const endMonth   = isBirthdate ? today : undefined

  function clear(e: React.MouseEvent) {
    e.stopPropagation()
    onChange('')
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-all',
            'focus:outline-none focus:ring-2',
            hasError
              ? 'border-red-300 bg-red-50/50 focus:ring-red-400/40'
              : hasValue
              ? 'border-[#04c2fb]/50 bg-white/80 focus:ring-[#04c2fb]/40'
              : 'border-gray-200 bg-white/80 text-muted-foreground focus:ring-[#04c2fb]/40',
            className,
          )}
        >
          <CalendarIcon
            className="h-4 w-4 shrink-0"
            style={{ color: hasValue && !hasError ? '#04c2fb' : undefined }}
          />
          <span className={cn('flex-1 text-left', !hasValue && 'text-muted-foreground')}>
            {label}
          </span>
          {hasValue && (
            <X
              className="h-3.5 w-3.5 shrink-0 text-muted-foreground hover:text-foreground"
              onClick={clear}
            />
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        className="w-auto p-0 shadow-xl border border-gray-100"
        align="start"
        sideOffset={6}
      >
        {/* Header brand */}
        <div
          className="flex items-center justify-between px-4 py-2.5 rounded-t-lg"
          style={{ background: 'linear-gradient(135deg, #0094c8 0%, #04c2fb 60%, #00d5f5 100%)' }}
        >
          <span className="text-xs font-semibold text-white">
            {hasValue ? formatDateBR(value) : 'Selecione a data'}
          </span>
          {hasValue && (
            <button
              onClick={() => onChange('')}
              className="text-white/70 hover:text-white text-xs underline"
            >
              Limpar
            </button>
          )}
        </div>

        {isBirthdate && (
          <p className="px-4 pt-3 pb-0 text-[11px] text-muted-foreground">
            Use os menus abaixo para navegar rapidamente pelo ano e mês.
          </p>
        )}

        <Calendar
          mode="single"
          selected={selected}
          onSelect={(date) => {
            onChange(date ? dateToIso(date) : '')
            if (date) setOpen(false)
          }}
          locale={ptBR}
          defaultMonth={selected ?? (isBirthdate ? new Date(today.getFullYear() - 20, 0) : undefined)}
          captionLayout={isBirthdate ? 'dropdown' : 'label'}
          startMonth={startMonth}
          endMonth={endMonth}
          classNames={isBirthdate ? {
            dropdowns: 'flex h-9 w-full items-center justify-center gap-2 text-sm font-medium px-2',
            dropdown_root: 'relative',
            dropdown: 'absolute inset-0 opacity-0 cursor-pointer w-full',
            caption_label: [
              'flex items-center gap-1 rounded-lg border border-gray-200 bg-white',
              'px-3 py-1.5 text-sm font-medium text-gray-700 cursor-pointer',
              'hover:border-[#04c2fb]/60 hover:bg-[#04c2fb]/5 transition-colors',
              '[&>svg]:h-3.5 [&>svg]:w-3.5 [&>svg]:text-[#04c2fb]',
            ].join(' '),
          } : undefined}
        />

        <div className="flex justify-end gap-2 px-3 py-2 border-t border-gray-100">
          <button
            onClick={() => setOpen(false)}
            className="rounded-md px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-gray-100 transition-colors"
          >
            Fechar
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
