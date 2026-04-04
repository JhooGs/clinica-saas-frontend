'use client'

import { toast } from 'sonner'
import { Plug, Calendar, MessageSquare, CheckCircle2, Loader2, AlertCircle } from 'lucide-react'
import { useGoogleCalendar } from '@/hooks/use-google-calendar'

export default function ConexoesPage() {
  const { connected, googleEmail, loading, error, connect, disconnect } = useGoogleCalendar()

  async function handleConnect() {
    try {
      connect()
    } catch {
      toast.error('Erro ao conectar', { description: 'Não foi possível iniciar a autenticação.' })
    }
  }

  async function handleDisconnect() {
    try {
      await disconnect()
      toast.success('Desconectado', { description: 'Google Calendar foi desvinculado da sua conta.' })
    } catch {
      toast.error('Erro ao desconectar', { description: 'Tente novamente.' })
    }
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div>
        <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
          <Plug className="h-4 w-4 text-[#04c2fb]" />
          Conexões e integrações
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Conecte serviços externos para sincronizar sua agenda e comunicação.
        </p>
      </div>

      {/* Erro global */}
      {error && (
        <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-3">
        {/* Google Calendar */}
        <div className="rounded-xl border bg-card shadow-sm p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            {/* Ícone */}
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white border shadow-sm">
              {/* Logo Google Calendar simplificado */}
              <svg viewBox="0 0 32 32" className="h-6 w-6" fill="none">
                <rect x="4" y="4" width="24" height="24" rx="3" fill="#fff" stroke="#e0e0e0"/>
                <rect x="4" y="4" width="24" height="8" rx="3" fill="#1a73e8"/>
                <rect x="4" y="10" width="24" height="2" fill="#1a73e8"/>
                <text x="16" y="25" textAnchor="middle" fontSize="11" fontWeight="700" fill="#1a73e8">G</text>
                <rect x="9" y="7" width="3" height="6" rx="1.5" fill="white"/>
                <rect x="20" y="7" width="3" height="6" rx="1.5" fill="white"/>
              </svg>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-semibold text-slate-800">Google Calendar</h3>
                {connected && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-50 border border-green-200 px-2 py-0.5 text-[11px] font-medium text-green-700">
                    <CheckCircle2 className="h-3 w-3" />
                    Conectado
                  </span>
                )}
              </div>

              {connected && googleEmail ? (
                <p className="text-xs text-muted-foreground mt-0.5">{googleEmail}</p>
              ) : (
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  Sincronize sua agenda pessoal do Google Calendar. Os eventos aparecerão
                  na página Agenda do Clinitra e você poderá exportar agendamentos para o Google.
                </p>
              )}
            </div>

            {/* Ação */}
            <div className="shrink-0 sm:mt-0.5">
              {connected ? (
                <button
                  onClick={handleDisconnect}
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 transition-colors"
                >
                  Desconectar
                </button>
              ) : (
                <button
                  onClick={handleConnect}
                  disabled={loading}
                  className="flex items-center gap-1.5 rounded-lg border border-[#04c2fb]/30 bg-[#04c2fb]/5 px-3 py-1.5 text-xs font-medium text-[#04c2fb] hover:bg-[#04c2fb]/10 transition-colors disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Aguardando…
                    </>
                  ) : (
                    <>
                      <Calendar className="h-3.5 w-3.5" />
                      Conectar Google Calendar
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Detalhes quando conectado */}
          {connected && (
            <div className="mt-4 rounded-lg bg-slate-50 border border-slate-100 px-3 py-2.5 text-[11px] text-muted-foreground space-y-1">
              <p>• Eventos do seu Google Calendar aparecem na página <strong className="text-slate-600">Agenda</strong> com badge distinto.</p>
              <p>• Agendamentos do Clinitra podem ser exportados para o seu calendário.</p>
              <p>• A conexão é individual — cada terapeuta conecta sua própria conta.</p>
            </div>
          )}
        </div>

        {/* Google Drive — Em breve */}
        <div className="rounded-xl border bg-card/50 shadow-sm p-4 sm:p-5 opacity-60">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white border shadow-sm">
              <svg viewBox="0 0 32 32" className="h-6 w-6" fill="none">
                <path d="M5 24l4.5-8h13L27 24H5z" fill="#1e88e5"/>
                <path d="M11.5 8L5 24h7l6.5-16h-7z" fill="#4caf50"/>
                <path d="M20.5 8L27 24h-7l-6.5-16h6.5z" fill="#fdd835"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-slate-800">Google Drive</h3>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">Em breve</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Faça backup dos arquivos dos registros no seu Google Drive de forma automática.</p>
            </div>
          </div>
        </div>

        {/* WhatsApp — Em breve */}
        <div className="rounded-xl border bg-card/50 shadow-sm p-4 sm:p-5 opacity-60">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white border shadow-sm">
              <MessageSquare className="h-5 w-5 text-green-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-slate-800">WhatsApp Business</h3>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">Em breve</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Envie lembretes de sessão e confirmações de agendamento via WhatsApp.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
