'use client'

import { useState } from 'react'
import { useConfiguracoes } from '@/hooks/use-configuracoes'
import { nowSP } from '@/lib/timezone'
import { escolherFrase } from '@/lib/frases-dia'

function saudacaoPorHora(h: number): string {
  if (h >= 4 && h < 12) return 'Bom dia'
  if (h >= 12 && h < 18) return 'Boa tarde'
  return 'Boa noite'
}

function primeiroNome(nome?: string | null): string | null {
  if (!nome) return null
  const primeiro = nome.trim().split(/\s+/)[0]
  return primeiro || null
}

interface Props {
  totalAtendimentos: number
  loading?: boolean
}

export function SaudacaoHome({ totalAtendimentos, loading }: Props) {
  const { data: config } = useConfiguracoes()
  const [seed] = useState(() => Math.random())

  const hora = nowSP().getHours()
  const saudacao = saudacaoPorHora(hora)
  const nome = primeiroNome(config?.nome_responsavel)

  const data = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date())
  const dataCapital = data.charAt(0).toUpperCase() + data.slice(1)

  const qtdTexto =
    totalAtendimentos === 0
      ? 'Nenhum atendimento agendado hoje'
      : totalAtendimentos === 1
        ? 'Você tem 1 atendimento hoje'
        : `Você tem ${totalAtendimentos} atendimentos hoje`

  const frase = loading ? null : escolherFrase(totalAtendimentos > 0, seed)

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
        {saudacao}{nome ? `, ${nome}` : ''} 👋
      </h1>
      <p className="text-sm text-muted-foreground mt-1">
        {dataCapital}
        {frase !== null ? (
          <>
            {' · '}
            {qtdTexto}. {frase}
          </>
        ) : (
          loading && (
            <span className="inline-block h-3 w-56 rounded bg-muted animate-pulse align-middle ml-1" />
          )
        )}
      </p>
    </div>
  )
}
