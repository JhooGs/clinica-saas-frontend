'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Banknote, CalendarClock, Save, Info } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const STORAGE_KEY = 'clinitra:dia_vencimento'
const DIAS = Array.from({ length: 28 }, (_, i) => i + 1)

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]

function proximoVencimento(dia: number): string {
  const hoje = new Date()
  const anoAtual = hoje.getFullYear()
  const mesAtual = hoje.getMonth()

  // Se o dia ainda não passou neste mês, vence neste mês
  const candidato = new Date(anoAtual, mesAtual, dia)
  const alvo = candidato > hoje ? candidato : new Date(anoAtual, mesAtual + 1, dia)

  return `${alvo.getDate()} de ${MESES[alvo.getMonth()]} de ${alvo.getFullYear()}`
}

export default function ConfiguracoesFinanceiroPage() {
  const [selecionado, setSelecionado] = useState<number | null>(() => {
    if (typeof window === 'undefined') return null
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? Number(stored) : null
  })
  const [salvo, setSalvo] = useState<number | null>(() => {
    if (typeof window === 'undefined') return null
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? Number(stored) : null
  })

  const dirty = selecionado !== salvo

  function handleSave() {
    if (!selecionado) {
      toast.error('Selecione um dia', {
        description: 'Toque em um dos dias abaixo para definir o vencimento padrão.',
      })
      return
    }
    localStorage.setItem(STORAGE_KEY, String(selecionado))
    setSalvo(selecionado)
    toast.success('Configuração salva', {
      description: `Vencimento padrão definido para o dia ${selecionado} de cada mês.`,
    })
  }

  return (
    <div className="space-y-4">
      {/* Dia de vencimento */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#04c2fb]/10 shrink-0">
              <CalendarClock className="h-4 w-4 text-[#04c2fb]" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">Dia de vencimento padrão</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Pré-preenche a data de vencimento ao criar novas cobranças
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Grid de dias */}
          <div className="grid grid-cols-7 gap-1 max-w-[220px]">
            {DIAS.map((d) => {
              const ativo = selecionado === d
              return (
                <button
                  key={d}
                  onClick={() => setSelecionado(d)}
                  className={cn(
                    'aspect-square rounded-lg text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#04c2fb]/50',
                    ativo
                      ? 'text-white shadow-md scale-105'
                      : 'bg-slate-100 text-slate-600 hover:bg-[#04c2fb]/10 hover:text-[#04c2fb] hover:scale-105 active:scale-95',
                  )}
                  style={ativo ? { background: 'linear-gradient(135deg, #0094c8 0%, #04c2fb 60%, #00d5f5 100%)' } : {}}
                >
                  {d}
                </button>
              )
            })}
          </div>

          {/* Preview */}
          {selecionado ? (
            <div className="rounded-xl border border-[#04c2fb]/20 bg-[#04c2fb]/5 px-4 py-3 space-y-1">
              <p className="text-sm text-slate-700">
                Cobranças vencem todo{' '}
                <span
                  className="font-bold text-white px-2 py-0.5 rounded-md text-sm"
                  style={{ background: 'linear-gradient(135deg, #0094c8 0%, #04c2fb 60%, #00d5f5 100%)' }}
                >
                  dia {selecionado}
                </span>{' '}
                do mês
              </p>
              <p className="text-xs text-slate-500 flex items-center gap-1.5">
                <CalendarClock className="h-3.5 w-3.5 text-[#04c2fb] shrink-0" />
                Próximo vencimento:{' '}
                <span className="font-medium text-slate-700">{proximoVencimento(selecionado)}</span>
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 flex items-start gap-2 text-xs text-slate-400">
              <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              Selecione um dia acima para ver o preview do vencimento.
            </div>
          )}

          {/* Aviso dias 29–31 */}
          <p className="text-[11px] text-muted-foreground flex items-start gap-1.5">
            <Info className="h-3 w-3 mt-0.5 shrink-0" />
            Os dias 29, 30 e 31 não estão disponíveis pois nem todos os meses os possuem.
          </p>

          {/* Ações */}
          <div className="flex items-center justify-between pt-1">
            {salvo && !dirty ? (
              <span className="text-xs text-muted-foreground">
                Dia {salvo} salvo
              </span>
            ) : (
              <span />
            )}
            <Button
              size="sm"
              disabled={!dirty}
              onClick={handleSave}
              className="gap-1.5 text-white hover:brightness-110 active:scale-95 transition-all"
              style={dirty ? { background: 'linear-gradient(135deg, #0094c8 0%, #04c2fb 60%, #00d5f5 100%)' } : {}}
            >
              <Save className="h-3.5 w-3.5" />
              Salvar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Placeholder para próximas configs financeiras */}
      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 shrink-0">
              <Banknote className="h-4 w-4 text-slate-400" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold text-slate-500">Mais configurações</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Moeda, impostos e regras de cobrança em breve
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>
    </div>
  )
}
