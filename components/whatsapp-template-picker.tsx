'use client'

import React, { useMemo, useState } from 'react'
import { CheckCircle2, Loader2, MessageSquare, Settings, Star, Users, X } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ModalPortal } from '@/components/modal-portal'
import { useWhatsAppTemplates } from '@/hooks/use-whatsapp-templates'
import { useGerarConfirmacaoWhatsApp } from '@/hooks/use-agenda'
import type { AgendamentoComSource } from '@/lib/google-calendar'
import type { WhatsAppTemplate } from '@/types'

interface WhatsAppTemplatePickerProps {
  agendamento: AgendamentoComSource
  trigger: React.ReactNode
}

interface Participante {
  id: string
  nome: string
}

// ─── Persistência em localStorage ────────────────────────────────────────────

const LS_PREFIX = 'clinitra_wa_sent'

function chaveEnvio(agendamentoId: string, pacienteId: string) {
  return `${LS_PREFIX}_${agendamentoId}_${pacienteId}`
}

function lerEnviadoEm(agendamentoId: string, pacienteId: string): Date | null {
  try {
    const val = localStorage.getItem(chaveEnvio(agendamentoId, pacienteId))
    return val ? new Date(val) : null
  } catch {
    return null
  }
}

function salvarEnviadoEm(agendamentoId: string, pacienteId: string, quando: Date) {
  try {
    localStorage.setItem(chaveEnvio(agendamentoId, pacienteId), quando.toISOString())
  } catch {}
}

function formatarEnviadoEm(data: Date): string {
  const hoje = new Date()
  const mesmaData = data.toDateString() === hoje.toDateString()
  const hora = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  if (mesmaData) return `Enviado hoje às ${hora}`
  const dia = data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  return `Enviado em ${dia} às ${hora}`
}

// ─── SVG WhatsApp reutilizável ────────────────────────────────────────────────

function WhatsAppSvg({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  )
}

// ─── Seletor de template compartilhado ───────────────────────────────────────

function TemplateSeletor({
  templates,
  templateAtivo,
  onSelecionar,
}: {
  templates: WhatsAppTemplate[]
  templateAtivo: WhatsAppTemplate | null
  onSelecionar: (t: WhatsAppTemplate) => void
}) {
  if (templates.length === 0) return null
  return (
    <div className="flex gap-1.5 flex-wrap">
      {templates.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onSelecionar(t)}
          className={cn(
            'inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full border font-medium transition-all',
            templateAtivo?.id === t.id
              ? 'border-[#04c2fb] bg-[#04c2fb]/10 text-[#04c2fb]'
              : 'border-gray-200 bg-white text-gray-600 hover:border-[#04c2fb]/40 hover:bg-[#04c2fb]/5',
          )}
        >
          {t.padrao && <Star className="h-2.5 w-2.5 text-amber-400 fill-amber-400 shrink-0" />}
          {t.nome}
        </button>
      ))}
    </div>
  )
}

// ─── Caminho individual (Popover, comportamento original) ─────────────────────

function IndividualPicker({ agendamento, trigger }: WhatsAppTemplatePickerProps) {
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
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
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
              <WhatsAppSvg className="h-3.5 w-3.5" />
            )}
            Enviar
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ─── Caminho grupo (modal glassmorphism com persistência por participante) ────

function GrupoModal({
  agendamento,
  participantes,
  onClose,
}: {
  agendamento: AgendamentoComSource
  participantes: Participante[]
  onClose: () => void
}) {
  const agId = String(agendamento.id)
  const { data, isLoading } = useWhatsAppTemplates()
  const gerarConfirmacao = useGerarConfirmacaoWhatsApp()
  const [selecionado, setSelecionado] = useState<WhatsAppTemplate | null>(null)
  const [enviando, setEnviando] = useState<string | null>(null)

  // Carrega estado persistido do localStorage na abertura do modal
  const [sentMap, setSentMap] = useState<Map<string, Date>>(() => {
    const map = new Map<string, Date>()
    for (const p of participantes) {
      if (!p.id) continue
      const d = lerEnviadoEm(agId, p.id)
      if (d) map.set(p.id, d)
    }
    return map
  })

  const templates = data?.items ?? []
  const padrao = templates.find((t) => t.padrao) ?? templates[0] ?? null
  const templateAtivo = selecionado ?? padrao

  function handleEnviar(p: Participante) {
    if (!p.id || enviando) return
    setEnviando(p.id)
    gerarConfirmacao.mutate(
      {
        agendamentoId: agId,
        templateId: templateAtivo?.id,
        pacienteId: p.id,
      },
      {
        onSuccess: (res) => {
          window.open(res.whatsapp_url, '_blank')
          const agora = new Date()
          salvarEnviadoEm(agId, p.id, agora)
          setSentMap((prev) => new Map(prev).set(p.id, agora))
          setEnviando(null)
          toast.success('WhatsApp aberto', {
            description: `Mensagem para ${p.nome} pronta para enviar.`,
          })
        },
        onError: (err) => {
          setEnviando(null)
          const msg = err.message?.includes('telefone')
            ? `${p.nome} não tem telefone cadastrado.`
            : 'Erro ao gerar link de confirmação.'
          toast.error('Não foi possível gerar o link', { description: msg })
        },
      },
    )
  }

  const totalEnviados = sentMap.size
  const todosEnviados = participantes.length > 0 && totalEnviados >= participantes.filter(p => p.id).length

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4"
        style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      >
        <div
          className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border border-white/30 shadow-2xl animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200 overflow-hidden"
          style={{ backdropFilter: 'blur(24px)', backgroundColor: 'rgba(255,255,255,0.97)' }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-4 border-b">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 shrink-0">
              <Users className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 leading-tight">
                Enviar via WhatsApp — Grupo
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {participantes.length} participantes · {agendamento.horario} · {agendamento.tipo}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 flex items-center justify-center h-7 w-7 rounded-full border border-gray-200 text-muted-foreground hover:bg-gray-100 hover:text-gray-700 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Seletor de template */}
          <div className="px-5 py-3 border-b bg-slate-50/60">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Template de mensagem
            </p>
            {isLoading ? (
              <div className="flex items-center gap-2 py-1">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Carregando templates…</span>
              </div>
            ) : templates.length === 0 ? (
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground">Nenhum template configurado.</p>
                <Link
                  href="/dashboard/configuracoes?aba=conexoes"
                  className="text-xs font-medium text-[#04c2fb] hover:underline flex items-center gap-0.5"
                  onClick={onClose}
                >
                  <Settings className="h-3 w-3" />
                  Configurar
                </Link>
              </div>
            ) : (
              <TemplateSeletor
                templates={templates}
                templateAtivo={templateAtivo}
                onSelecionar={setSelecionado}
              />
            )}
          </div>

          {/* Preview do template */}
          {templateAtivo && (
            <div className="px-5 py-2.5 border-b bg-emerald-50/40">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Pré-visualização
              </p>
              <p className="text-[11px] text-slate-600 leading-relaxed line-clamp-3">
                {templateAtivo.conteudo}
              </p>
            </div>
          )}

          {/* Lista de participantes */}
          <div className="px-5 py-3 space-y-2 max-h-64 overflow-y-auto">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Participantes
            </p>
            {participantes.map((p) => {
              const sentAt = sentMap.get(p.id)
              const foiEnviado = !!sentAt
              const estaEnviando = enviando === p.id
              const semId = !p.id
              return (
                <div
                  key={p.id || p.nome}
                  className={cn(
                    'flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-all duration-200',
                    foiEnviado
                      ? 'border-emerald-200 bg-emerald-50/60'
                      : 'border-gray-100 bg-white hover:border-gray-200',
                  )}
                >
                  {/* Avatar */}
                  <div
                    className={cn(
                      'h-9 w-9 rounded-full flex items-center justify-center shrink-0 text-sm font-bold',
                      foiEnviado
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-gradient-to-br from-[#04c2fb]/20 to-[#04c2fb]/5 text-[#04c2fb]',
                    )}
                  >
                    {p.nome.charAt(0).toUpperCase()}
                  </div>

                  {/* Nome + timestamp */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{p.nome}</p>
                    {sentAt && (
                      <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 mt-0.5">
                        <CheckCircle2 className="h-3 w-3 shrink-0" />
                        {formatarEnviadoEm(sentAt)}
                      </p>
                    )}
                    {semId && !sentAt && (
                      <p className="text-[11px] text-amber-600 mt-0.5">ID não disponível</p>
                    )}
                  </div>

                  {/* Botão de envio */}
                  <button
                    type="button"
                    onClick={() => handleEnviar(p)}
                    disabled={estaEnviando || semId || (!!enviando && !estaEnviando)}
                    title={semId ? 'ID do paciente não disponível' : foiEnviado ? `Reenviar para ${p.nome}` : `Enviar para ${p.nome}`}
                    className={cn(
                      'shrink-0 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all duration-200',
                      estaEnviando && 'opacity-80 cursor-wait',
                      (semId || (!!enviando && !estaEnviando)) && 'opacity-40 cursor-not-allowed',
                      foiEnviado
                        ? 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        : 'text-white shadow-sm hover:brightness-110 active:scale-95',
                    )}
                    style={!foiEnviado ? { background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)' } : undefined}
                  >
                    {estaEnviando ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : foiEnviado ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : (
                      <WhatsAppSvg className="h-3 w-3" />
                    )}
                    {foiEnviado ? 'Reenviar' : 'Enviar'}
                  </button>
                </div>
              )
            })}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-3 px-5 py-3 border-t bg-slate-50/60">
            <div className="flex items-center gap-1.5">
              {totalEnviados > 0 && (
                <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {totalEnviados} de {participantes.length} notificado{totalEnviados !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className={cn(
                'rounded-xl px-4 py-2 text-xs font-medium transition-colors',
                todosEnviados
                  ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                  : 'border border-slate-200 text-slate-600 hover:bg-slate-100',
              )}
            >
              {todosEnviados ? 'Concluído' : 'Fechar'}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  )
}

// ─── Componente público ───────────────────────────────────────────────────────

export function WhatsAppTemplatePicker({ agendamento, trigger }: WhatsAppTemplatePickerProps) {
  const [grupoAberto, setGrupoAberto] = useState(false)

  const participantes = useMemo<Participante[]>(() => {
    const nomes = agendamento.pacientes ?? [agendamento.paciente]
    const ids = agendamento.pacientes_ids ?? (agendamento.paciente_id ? [agendamento.paciente_id] : [])
    return nomes.map((nome, idx) => ({ id: ids[idx] ?? '', nome }))
  }, [agendamento])

  const isGrupo = participantes.length > 1

  if (!isGrupo) {
    return <IndividualPicker agendamento={agendamento} trigger={trigger} />
  }

  const triggerComClick = React.cloneElement(trigger as React.ReactElement, {
    onClick: (e: React.MouseEvent) => {
      e.stopPropagation()
      setGrupoAberto(true)
    },
  })

  return (
    <>
      {triggerComClick}
      {grupoAberto && (
        <GrupoModal
          agendamento={agendamento}
          participantes={participantes}
          onClose={() => setGrupoAberto(false)}
        />
      )}
    </>
  )
}
