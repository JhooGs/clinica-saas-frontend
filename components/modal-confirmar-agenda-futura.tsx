'use client'

import { CalendarX2, AlertTriangle, Loader2 } from 'lucide-react'
import { ModalPortal } from '@/components/modal-portal'

export type TipoAcaoAgenda = 'inativar' | 'remover_plano' | 'alterar_plano'

const CONTEUDO: Record<TipoAcaoAgenda, {
  titulo: string
  subtitulo: string
  consequencias: string[]
  botaoConfirmar: string
}> = {
  inativar: {
    titulo: 'Paciente será inativado',
    subtitulo: 'Ao inativar este paciente, toda a agenda futura será cancelada automaticamente.',
    consequencias: [
      'Todos os agendamentos futuros serão cancelados',
      'O plano de atendimento ficará suspenso',
      'Registros e histórico do paciente são preservados',
      'É possível reverter reativando o paciente (a agenda não é restaurada automaticamente)',
    ],
    botaoConfirmar: 'Inativar e cancelar agenda',
  },
  remover_plano: {
    titulo: 'Plano será removido',
    subtitulo: 'Ao remover o plano de atendimento, toda a agenda futura será cancelada.',
    consequencias: [
      'Todos os agendamentos futuros serão cancelados',
      'O paciente ficará sem plano ativo, apenas consultas pontuais',
      'Registros e histórico do paciente são preservados',
    ],
    botaoConfirmar: 'Remover plano e cancelar agenda',
  },
  alterar_plano: {
    titulo: 'Plano será alterado',
    subtitulo: 'Ao alterar o plano de atendimento, a agenda futura atual será substituída pela nova configuração.',
    consequencias: [
      'Todos os agendamentos futuros atuais serão cancelados',
      'Novos agendamentos serão gerados conforme o novo plano e horários configurados',
      'Registros e histórico do paciente são preservados',
    ],
    botaoConfirmar: 'Alterar plano e reagendar',
  },
}

export function ModalConfirmarAgendaFutura({
  tipo,
  nomePaciente,
  onConfirmar,
  onCancelar,
  isLoading = false,
}: {
  tipo: TipoAcaoAgenda
  nomePaciente: string
  onConfirmar: () => void
  onCancelar: () => void
  isLoading?: boolean
}) {
  const conteudo = CONTEUDO[tipo]

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center p-4"
        style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
      >
        <div
          className="w-full max-w-md rounded-2xl border border-white/30 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
          style={{ backdropFilter: 'blur(24px)', backgroundColor: 'rgba(255,255,255,0.97)' }}
        >
          {/* Ícone */}
          <div className="flex justify-center pt-7 pb-2">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 ring-8 ring-amber-50/60">
              <CalendarX2 className="h-7 w-7 text-amber-500" />
            </div>
          </div>

          {/* Texto principal */}
          <div className="px-6 pb-1 text-center">
            <h3 className="text-base font-semibold tracking-tight text-gray-900">
              {conteudo.titulo}
            </h3>
            <p className="mt-1 text-xs font-semibold text-[#04c2fb]">
              {nomePaciente}
            </p>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              {conteudo.subtitulo}
            </p>
          </div>

          {/* Lista de consequencias */}
          <div className="mx-6 mt-4 rounded-xl border border-amber-100 bg-amber-50/70 p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-600">
                O que vai acontecer
              </p>
            </div>
            <ul className="space-y-2">
              {conteudo.consequencias.map((item, i) => (
                <li key={i} className="flex items-start gap-2.5 text-xs text-gray-600 leading-relaxed">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Botoes */}
          <div className="flex flex-col sm:flex-row gap-3 px-6 pt-4 pb-6">
            <button
              onClick={onCancelar}
              disabled={isLoading}
              className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 order-2 sm:order-1"
            >
              Voltar
            </button>
            <button
              onClick={onConfirmar}
              disabled={isLoading}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white transition-all hover:brightness-110 disabled:opacity-70 order-1 sm:order-2"
              style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                conteudo.botaoConfirmar
              )}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  )
}
