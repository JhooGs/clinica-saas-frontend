'use client'

import { useMemo, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function isoToDate(iso: string): Date | null {
  if (!iso) return null
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return isNaN(date.getTime()) ? null : date
}

function dateToISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function formatBR(d: Date): string {
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
}

function parseInputBR(value: string): Date | null {
  const digits = value.replace(/\D/g, '')
  if (digits.length !== 8) return null
  const day   = Number(digits.slice(0, 2))
  const month = Number(digits.slice(2, 4)) - 1
  const year  = Number(digits.slice(4, 8))
  const date  = new Date(year, month, day)
  if (
    date.getFullYear() !== year ||
    date.getMonth()    !== month ||
    date.getDate()     !== day
  ) return null
  if (date > new Date() || year < 1900) return null
  return date
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

const WEEK = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

// ─── Props ────────────────────────────────────────────────────────────────────

interface BirthdatePickerProps {
  value: string                   // YYYY-MM-DD ou ''
  onChange: (iso: string) => void
  hasError?: boolean
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function BirthdatePicker({ value, onChange, hasError }: BirthdatePickerProps) {
  // selectedDate reage a mudanças de value (highlight no calendário)
  const selectedDate = useMemo(() => isoToDate(value), [value])

  const [open, setOpen] = useState(false)
  // inputValue e navegação são locais: o componente remonta a cada abertura do modal
  const [inputValue, setInputValue] = useState(() => {
    const d = isoToDate(value)
    return d ? formatBR(d) : ''
  })
  const [visibleMonth, setVisibleMonth] = useState(
    () => isoToDate(value)?.getMonth() ?? new Date().getMonth()
  )
  const [visibleYear, setVisibleYear] = useState(
    () => isoToDate(value)?.getFullYear() ?? new Date().getFullYear()
  )

  const currentYear = new Date().getFullYear()
  const years = useMemo(
    () => Array.from({ length: currentYear - 1899 }, (_, i) => currentYear - i),
    [currentYear]
  )

  const cells = useMemo(() => {
    const total    = getDaysInMonth(visibleYear, visibleMonth)
    const firstDay = new Date(visibleYear, visibleMonth, 1).getDay()
    const result: Array<{ day: number | null; date: Date | null }> = []
    for (let i = 0; i < firstDay; i++) result.push({ day: null, date: null })
    for (let d = 1; d <= total; d++) result.push({ day: d, date: new Date(visibleYear, visibleMonth, d) })
    while (result.length % 7 !== 0) result.push({ day: null, date: null })
    return result
  }, [visibleMonth, visibleYear])

  function emit(iso: string, date: Date) {
    onChange(iso)
    setInputValue(formatBR(date))
  }

  function handleInput(v: string) {
    const digits = v.replace(/\D/g, '').slice(0, 8)
    let masked = digits
    if (digits.length > 2) masked = `${digits.slice(0, 2)}/${digits.slice(2)}`
    if (digits.length > 4) masked = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
    setInputValue(masked)
    const parsed = parseInputBR(masked)
    if (parsed) {
      emit(dateToISO(parsed), parsed)
      setVisibleMonth(parsed.getMonth())
      setVisibleYear(parsed.getFullYear())
    }
  }

  function selectDay(date: Date) {
    const today = new Date()
    today.setHours(23, 59, 59, 999)
    if (date > today) return
    emit(dateToISO(date), date)
    setOpen(false)
  }

  function prevMonth() {
    if (visibleMonth === 0) { setVisibleMonth(11); setVisibleYear(y => y - 1) }
    else setVisibleMonth(m => m - 1)
  }

  function nextMonth() {
    const next = new Date(visibleYear, visibleMonth + 1, 1)
    if (next > new Date()) return
    if (visibleMonth === 11) { setVisibleMonth(0); setVisibleYear(y => y + 1) }
    else setVisibleMonth(m => m + 1)
  }

  const todayStr = new Date().toDateString()
  const selectedStr = selectedDate?.toDateString()

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm',
            'transition-all focus:outline-none focus:ring-2',
            hasError
              ? 'border-red-300 bg-red-50/50 focus:ring-red-400/40'
              : selectedDate
              ? 'border-[#04c2fb]/50 bg-white/80 focus:ring-[#04c2fb]/40'
              : 'border-gray-200 bg-white/80 focus:ring-[#04c2fb]/40'
          )}
        >
          <div className="flex items-center gap-2">
            <CalendarDays
              className="h-4 w-4 shrink-0"
              style={{ color: selectedDate && !hasError ? '#04c2fb' : '#9ca3af' }}
            />
            <span className={cn('text-sm', selectedDate ? 'text-foreground' : 'text-muted-foreground/60')}>
              {inputValue || 'DD/MM/AAAA'}
            </span>
          </div>
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-[300px] rounded-xl border border-gray-100 p-4 shadow-xl"
      >
        <div className="space-y-3">
          {/* Input de digitação */}
          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Digite a data
            </p>
            <input
              value={inputValue}
              onChange={e => handleInput(e.target.value)}
              placeholder="DD/MM/AAAA"
              inputMode="numeric"
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm transition-all placeholder:text-muted-foreground/50 focus:border-[#04c2fb]/60 focus:outline-none focus:ring-2 focus:ring-[#04c2fb]/40"
            />
          </div>

          {/* Separador */}
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-gray-100" />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              ou selecione
            </span>
            <div className="h-px flex-1 bg-gray-100" />
          </div>

          {/* Navegação mês / ano */}
          <div className="grid grid-cols-[28px_1fr_1fr_28px] items-center gap-1.5">
            <button
              type="button"
              onClick={prevMonth}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-gray-100 hover:text-foreground"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>

            <Select value={String(visibleMonth)} onValueChange={v => setVisibleMonth(Number(v))}>
              <SelectTrigger className="h-7 rounded-lg border-gray-200 text-xs font-medium focus:ring-[#04c2fb]/40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((m, i) => (
                  <SelectItem key={m} value={String(i)} className="text-xs">{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={String(visibleYear)} onValueChange={v => setVisibleYear(Number(v))}>
              <SelectTrigger className="h-7 rounded-lg border-gray-200 text-xs font-medium focus:ring-[#04c2fb]/40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-56">
                {years.map(y => (
                  <SelectItem key={y} value={String(y)} className="text-xs">{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <button
              type="button"
              onClick={nextMonth}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-gray-100 hover:text-foreground"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Cabeçalho dos dias da semana */}
          <div className="grid grid-cols-7 text-center">
            {WEEK.map((w, i) => (
              <div key={i} className="py-0.5 text-[11px] font-semibold text-muted-foreground/50">
                {w}
              </div>
            ))}
          </div>

          {/* Grid de dias */}
          <div className="grid grid-cols-7 gap-px">
            {cells.map((cell, i) => {
              const isSelected = cell.date && cell.date.toDateString() === selectedStr
              const isFuture   = cell.date ? cell.date > new Date() : false
              const isToday    = cell.date ? cell.date.toDateString() === todayStr : false

              return (
                <button
                  key={i}
                  type="button"
                  disabled={!cell.date || isFuture}
                  onClick={() => cell.date && selectDay(cell.date)}
                  className={cn(
                    'h-9 w-full rounded-lg text-xs transition-colors',
                    !cell.date             && 'invisible pointer-events-none',
                    cell.date && !isSelected && !isFuture && 'text-gray-700 hover:bg-[#04c2fb]/10',
                    isToday  && !isSelected && 'font-bold text-[#0094c8]',
                    isFuture               && 'cursor-not-allowed text-gray-300',
                    isSelected             && 'font-semibold text-white',
                  )}
                  style={isSelected ? {
                    background: 'linear-gradient(135deg, #0094c8 0%, #04c2fb 60%, #00d5f5 100%)',
                  } : undefined}
                >
                  {cell.day}
                </button>
              )
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
