'use client'

import * as React from 'react'
import { CalendarIcon } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface MonthYearPickerProps {
  /** Valor no formato YYYY-MM (ex: "2025-04"). String vazia ou undefined = sem valor. */
  value?: string
  onChange: (v: string) => void
  hasError?: boolean
  placeholder?: string
  className?: string
  /** Quantidade de anos anteriores ao atual a exibir. Default: 5 */
  yearsBefore?: number
  /** Quantidade de anos futuros ao atual a exibir. Default: 2 */
  yearsAfter?: number
}

const MESES = [
  { value: '01', label: 'Janeiro' },
  { value: '02', label: 'Fevereiro' },
  { value: '03', label: 'Março' },
  { value: '04', label: 'Abril' },
  { value: '05', label: 'Maio' },
  { value: '06', label: 'Junho' },
  { value: '07', label: 'Julho' },
  { value: '08', label: 'Agosto' },
  { value: '09', label: 'Setembro' },
  { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' },
  { value: '12', label: 'Dezembro' },
]

// ─── Helper: YYYY-MM → "MM/YYYY" ─────────────────────────────────────────────

function formatDisplay(yyyymm: string): string {
  if (!yyyymm) return ''
  const [year, month] = yyyymm.split('-')
  if (!year || !month) return ''
  return `${month}/${year}`
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function MonthYearPicker({
  value,
  onChange,
  hasError,
  placeholder = 'Selecione o mês',
  className,
  yearsBefore = 5,
  yearsAfter = 2,
}: MonthYearPickerProps) {
  const [open, setOpen] = React.useState(false)

  const hoje = new Date()
  const anoAtual = hoje.getFullYear()
  const anos = React.useMemo(() => {
    const lista: number[] = []
    for (let y = anoAtual - yearsBefore; y <= anoAtual + yearsAfter; y++) {
      lista.push(y)
    }
    return lista
  }, [anoAtual, yearsBefore, yearsAfter])

  const [mesLocal, setMesLocal] = React.useState<string>(() => {
    if (value) return value.slice(5, 7)
    return String(hoje.getMonth() + 1).padStart(2, '0')
  })
  const [anoLocal, setAnoLocal] = React.useState<string>(() => {
    if (value) return value.slice(0, 4)
    return String(anoAtual)
  })

  // Sincroniza estado local quando value muda externamente
  React.useEffect(() => {
    if (value) {
      setAnoLocal(value.slice(0, 4))
      setMesLocal(value.slice(5, 7))
    }
  }, [value])

  function handleConfirmar() {
    if (mesLocal && anoLocal) {
      onChange(`${anoLocal}-${mesLocal}`)
    }
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-full justify-start text-left font-normal',
            !value && 'text-muted-foreground',
            hasError && 'border-red-500 focus:ring-red-500',
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          {value ? formatDisplay(value) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4" align="start">
        <div className="flex flex-col gap-4">
          <p className="text-sm font-medium text-gray-700">Mês de referência</p>
          <div className="flex gap-2">
            <div className="flex-1">
              <p className="mb-1 text-xs text-gray-500">Mês</p>
              <Select value={mesLocal} onValueChange={setMesLocal}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Mês" />
                </SelectTrigger>
                <SelectContent>
                  {MESES.map((m) => (
                    <SelectItem key={m.value} value={m.value} className="text-sm">
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-24">
              <p className="mb-1 text-xs text-gray-500">Ano</p>
              <Select value={anoLocal} onValueChange={setAnoLocal}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Ano" />
                </SelectTrigger>
                <SelectContent>
                  {anos.map((y) => (
                    <SelectItem key={y} value={String(y)} className="text-sm">
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button
            size="sm"
            className="w-full bg-[#04c2fb] hover:bg-[#0094c8] text-white"
            onClick={handleConfirmar}
          >
            Confirmar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
