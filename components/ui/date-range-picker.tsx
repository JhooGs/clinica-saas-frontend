'use client'

import * as React from 'react'
import { ptBR } from 'react-day-picker/locale'
import type { DateRange } from 'react-day-picker'
import { CalendarIcon, X } from 'lucide-react'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

function formatDateBR(date: Date) {
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

interface DateRangePickerProps {
  value: DateRange | undefined
  onChange: (range: DateRange | undefined) => void
  placeholder?: string
  className?: string
}

export function DateRangePicker({
  value,
  onChange,
  placeholder = 'Selecionar período',
  className,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false)

  const label = value?.from
    ? value.to
      ? `${formatDateBR(value.from)} — ${formatDateBR(value.to)}`
      : formatDateBR(value.from)
    : placeholder

  const hasValue = !!value?.from

  function clear(e: React.MouseEvent) {
    e.stopPropagation()
    onChange(undefined)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'flex items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-xs transition-colors',
            'hover:border-[#04c2fb]/60 focus:outline-none focus:ring-2 focus:ring-[#04c2fb]/40',
            hasValue ? 'border-[#04c2fb]/50 text-foreground' : 'text-muted-foreground',
            className
          )}
        >
          <CalendarIcon className="h-3.5 w-3.5 shrink-0" style={{ color: hasValue ? '#04c2fb' : undefined }} />
          <span className="whitespace-nowrap">{label}</span>
          {hasValue && (
            <X
              className="h-3 w-3 ml-0.5 shrink-0 text-muted-foreground hover:text-foreground"
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
        {/* Header com cor brand */}
        <div
          className="flex items-center justify-between px-4 py-2.5 rounded-t-lg"
          style={{ background: 'linear-gradient(135deg, #0094c8 0%, #04c2fb 60%, #00d5f5 100%)' }}
        >
          <span className="text-xs font-semibold text-white">
            {value?.from && value?.to
              ? `${formatDateBR(value.from)} — ${formatDateBR(value.to)}`
              : value?.from
              ? `A partir de ${formatDateBR(value.from)}`
              : 'Selecione o período'}
          </span>
          {hasValue && (
            <button
              onClick={() => onChange(undefined)}
              className="text-white/70 hover:text-white text-xs underline"
            >
              Limpar
            </button>
          )}
        </div>

        <Calendar
          mode="range"
          selected={value}
          onSelect={(range) => {
            onChange(range)
            // Fecha automaticamente quando o range está completo
            if (range?.from && range?.to) setOpen(false)
          }}
          locale={ptBR}
          numberOfMonths={2}
          classNames={{
            day: cn(
              'group/day relative aspect-square h-full w-full rounded-[--cell-radius] p-0 text-center select-none',
              '[&:last-child[data-selected=true]_button]:rounded-r-[--cell-radius]',
              '[&:first-child[data-selected=true]_button]:rounded-l-[--cell-radius]'
            ),
          }}
        />

        {/* Footer */}
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
