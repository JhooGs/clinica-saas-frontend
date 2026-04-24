'use client'

import { use, useEffect, useState } from 'react'
import Image from 'next/image'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

type ConfirmacaoStatus = 'pendente' | 'confirmado' | 'reagendamento' | 'cancelado'

interface ConfirmacaoPublicaRead {
  token: string
  paciente_nome: string
  tipo_atendimento: string
  data_agendamento: string
  horario: string
  status: ConfirmacaoStatus
  respondido_em: string | null
  logo_url: string | null
  clinica_nome: string
}

function formatarData(isoDate: string): string {
  const [ano, mes, dia] = isoDate.split('-')
  const d = new Date(Number(ano), Number(mes) - 1, Number(dia))
  return d.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function iniciais(nome: string): string {
  return nome
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

const RESPOSTA_LABELS: Record<ConfirmacaoStatus, { label: string; cor: string; emoji: string }> = {
  pendente: { label: 'Aguardando resposta', cor: 'text-amber-600', emoji: '⏳' },
  confirmado: { label: 'Presença confirmada', cor: 'text-emerald-600', emoji: '✅' },
  reagendamento: { label: 'Reagendamento solicitado', cor: 'text-[#04c2fb]', emoji: '🔄' },
  cancelado: { label: 'Consulta cancelada', cor: 'text-red-600', emoji: '❌' },
}

export default function ConfirmarAgendamentoPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = use(params)
  const [dados, setDados] = useState<ConfirmacaoPublicaRead | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [respondendo, setRespondendo] = useState<ConfirmacaoStatus | null>(null)
  const [respondeu, setRespondeu] = useState(false)

  useEffect(() => {
    fetch(`${API_URL}/api/v1/public/confirmar/${token}`)
      .then((r) => {
        if (r.status === 404) throw new Error('not_found')
        if (!r.ok) throw new Error('server_error')
        return r.json()
      })
      .then((data: ConfirmacaoPublicaRead) => {
        setDados(data)
        if (data.respondido_em) setRespondeu(true)
      })
      .catch((e) => {
        setErro(e.message === 'not_found' ? 'not_found' : 'server_error')
      })
      .finally(() => setLoading(false))
  }, [token])

  async function responder(resposta: 'confirmado' | 'reagendamento' | 'cancelado') {
    if (!dados || respondendo) return
    setRespondendo(resposta)
    try {
      const res = await fetch(`${API_URL}/api/v1/public/confirmar/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resposta }),
      })
      const json = await res.json()
      if (json.ja_respondido) {
        setRespondeu(true)
      } else {
        setDados((prev) => prev ? { ...prev, status: resposta } : prev)
        setRespondeu(true)
      }
    } catch {
      // mantém estado para o usuário tentar novamente
    } finally {
      setRespondendo(null)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-4 animate-pulse">
          <div className="mx-auto h-16 w-16 rounded-full bg-slate-200" />
          <div className="h-4 rounded bg-slate-200" />
          <div className="h-4 w-3/4 mx-auto rounded bg-slate-200" />
          <div className="h-10 rounded-xl bg-slate-200" />
        </div>
      </div>
    )
  }

  if (erro === 'not_found') {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-sm text-center space-y-3">
          <p className="text-4xl">🔗</p>
          <h1 className="text-lg font-semibold text-slate-800">Link inválido</h1>
          <p className="text-sm text-muted-foreground">
            Este link de confirmação não existe ou já expirou.
          </p>
        </div>
      </div>
    )
  }

  if (erro) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-sm text-center space-y-3">
          <p className="text-4xl">⚠️</p>
          <h1 className="text-lg font-semibold text-slate-800">Erro ao carregar</h1>
          <p className="text-sm text-muted-foreground">
            Não conseguimos carregar os dados. Tente novamente mais tarde.
          </p>
        </div>
      </div>
    )
  }

  if (!dados) return null

  const respostaInfo = RESPOSTA_LABELS[dados.status]

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo / cabeçalho */}
        <div className="flex flex-col items-center gap-3">
          {dados.logo_url ? (
            <div className="relative h-14 w-14 overflow-hidden rounded-xl shadow-sm">
              <Image
                src={dados.logo_url}
                alt={`Logo ${dados.clinica_nome}`}
                fill
                className="object-contain"
              />
            </div>
          ) : (
            <div
              className="flex h-14 w-14 items-center justify-center rounded-xl text-white text-xl font-bold shadow-sm"
              style={{ background: 'linear-gradient(135deg, #0094c8 0%, #04c2fb 60%, #00d5f5 100%)' }}
            >
              {iniciais(dados.clinica_nome)}
            </div>
          )}
          <p className="text-sm font-medium text-muted-foreground">{dados.clinica_nome}</p>
        </div>

        {/* Card de dados do agendamento */}
        <div className="rounded-2xl border bg-white px-5 py-5 shadow-sm space-y-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Paciente</p>
            <p className="mt-0.5 text-base font-semibold text-slate-800">{dados.paciente_nome}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Tipo</p>
              <p className="mt-0.5 text-sm font-medium text-slate-700">{dados.tipo_atendimento}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Horário</p>
              <p className="mt-0.5 text-sm font-medium text-slate-700">{dados.horario}</p>
            </div>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Data</p>
            <p className="mt-0.5 text-sm font-medium text-slate-700 capitalize">
              {formatarData(dados.data_agendamento)}
            </p>
          </div>
        </div>

        {/* Área de resposta */}
        {respondeu ? (
          <div className="rounded-2xl border bg-white px-5 py-5 shadow-sm text-center space-y-2">
            <p className="text-3xl">{respostaInfo.emoji}</p>
            <p className={`text-base font-semibold ${respostaInfo.cor}`}>{respostaInfo.label}</p>
            {dados.status === 'pendente' ? (
              <p className="text-sm text-muted-foreground">
                Aguardando sua resposta.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Sua resposta já foi registrada. Obrigado!
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-center text-sm text-muted-foreground">Como deseja responder?</p>
            <button
              onClick={() => responder('confirmado')}
              disabled={!!respondendo}
              className="w-full rounded-xl bg-emerald-500 px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-emerald-600 active:scale-[0.98] disabled:opacity-60"
            >
              {respondendo === 'confirmado' ? 'Confirmando...' : '✅  Confirmar presença'}
            </button>
            <button
              onClick={() => responder('reagendamento')}
              disabled={!!respondendo}
              className="w-full rounded-xl border-2 border-[#04c2fb] px-4 py-3.5 text-sm font-semibold text-[#04c2fb] transition-all hover:bg-[#04c2fb]/5 active:scale-[0.98] disabled:opacity-60"
            >
              {respondendo === 'reagendamento' ? 'Enviando...' : '🔄  Solicitar reagendamento'}
            </button>
            <button
              onClick={() => responder('cancelado')}
              disabled={!!respondendo}
              className="w-full rounded-xl border border-red-200 px-4 py-3.5 text-sm font-semibold text-red-500 transition-all hover:bg-red-50 active:scale-[0.98] disabled:opacity-60"
            >
              {respondendo === 'cancelado' ? 'Cancelando...' : '❌  Cancelar consulta'}
            </button>
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground/60">
          Powered by Clinitra
        </p>
      </div>
    </div>
  )
}
