'use client'

import { useState } from 'react'
import { Loader2, MessageSquare, Settings, Star } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useWhatsAppTemplates } from '@/hooks/use-whatsapp-templates'
import { useGerarConfirmacaoWhatsApp } from '@/hooks/use-agenda'
import type { AgendamentoComSource } from '@/lib/google-calendar'
import type { WhatsAppTemplate } from '@/types'

interface WhatsAppTemplatePickerProps {
  agendamento: AgendamentoComSource
  trigger: React.ReactNode
}

export function WhatsAppTemplatePicker({ agendamento, trigger }: WhatsAppTemplatePickerProps) {
  const { data, isLoading } = useWhatsAppTemplates()
  const gerarConfirmacao = useGerarConfirmacaoWhatsApp()
  const [open, setOpen] = useState(false)
  const templates = data?.items ?? []

  const padrao = templates.find((t) => t.padrao) ?? templates[0] ?? null
  const [selecionado, setSelecionado] = useState<WhatsAppTemplate | null>(null)

  const templateAtivo = selecionado ?? padrao

  function handleOpen(isOpen: boolean) {
    if (isOpen) setSelecionado(null)
    setOpen(isOpen)
  }

  function handleEnviar() {
    gerarConfirmacao.mutate(
      { agendamentoId: String(agendamento.id), templateId: templateAtivo?.id },
      {
        onSuccess: (data) => {
          window.location.href = data.whatsapp_url
          toast.success('WhatsApp aberto', { description: 'Mensagem pronta para enviar.' })
          setOpen(false)
        },
        onError: (err) => {
          const msg = err.message?.includes('telefone')
            ? 'Cadastre o telefone do paciente primeiro.'
            : 'Erro ao gerar link de confirmação.'
          toast.error('Não foi possível gerar o link', { description: msg })
        },
      },
    )
  }

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        {trigger}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 shadow-lg" align="end" sideOffset={6}>
        <div className="px-4 py-3 border-b">
          <p className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-green-500" />
            Enviar mensagem WhatsApp
          </p>
        </div>

        <div className="max-h-56 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : templates.length === 0 ? (
            <div className="px-4 py-5 text-center space-y-2">
              <p className="text-xs text-muted-foreground">Nenhum template configurado ainda.</p>
              <Link
                href="/dashboard/configuracoes?aba=conexoes"
                className="inline-flex items-center gap-1 text-xs font-medium text-[#04c2fb] hover:underline"
                onClick={() => setOpen(false)}
              >
                <Settings className="h-3 w-3" />
                Configurar templates
              </Link>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {templates.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelecionado(t)}
                  className={cn(
                    'w-full text-left rounded-lg px-3 py-2.5 transition-all border-2',
                    templateAtivo?.id === t.id
                      ? 'border-[#04c2fb] bg-[#04c2fb]/5'
                      : 'border-transparent hover:bg-slate-50',
                  )}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    {t.padrao && <Star className="h-3 w-3 text-amber-400 fill-amber-400 shrink-0" />}
                    <span className="text-xs font-semibold text-slate-700 truncate">{t.nome}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                    {t.conteudo}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-t bg-slate-50/70">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleEnviar}
            disabled={gerarConfirmacao.isPending || templates.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:brightness-110 active:scale-95 transition-all disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #0094c8 0%, #04c2fb 60%, #00d5f5 100%)' }}
          >
            {gerarConfirmacao.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
              </svg>
            )}
            Enviar
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
