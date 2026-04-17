'use client'

import React, { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Users,
  DollarSign,
  BookOpen,
  CheckCircle2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ImportWizard } from '@/components/onboarding/import-wizard'
import type { ImportModulo } from '@/components/onboarding/import-wizard'

const MODULOS: Record<ImportModulo, { label: string; icon: React.ElementType; descricao: string; exemplo: string; cor: string; corBg: string; corBorda: string }> = {
  pacientes: {
    label: 'Pacientes',
    icon: Users,
    descricao: 'Importe o cadastro completo dos seus pacientes com dados de contato e informações pessoais.',
    exemplo: 'Nome, CPF, telefone, e-mail...',
    cor: 'text-[#04c2fb]',
    corBg: 'bg-[#04c2fb]/10',
    corBorda: 'border-[#04c2fb]',
  },
  financeiro: {
    label: 'Financeiro',
    icon: DollarSign,
    descricao: 'Traga o histórico de receitas e despesas da clínica, incluindo pagamentos de sessões passadas.',
    exemplo: 'Tipo, valor, status, data de referência...',
    cor: 'text-emerald-600',
    corBg: 'bg-emerald-50',
    corBorda: 'border-emerald-400',
  },
  registros: {
    label: 'Registros de Sessão',
    icon: BookOpen,
    descricao: 'Importe anotações e registros de sessões anteriores vinculadas aos seus pacientes.',
    exemplo: 'Paciente, data, presença, anotações...',
    cor: 'text-violet-600',
    corBg: 'bg-violet-50',
    corBorda: 'border-violet-400',
  },
}

function ConfiguracoesDadosContent() {
  const searchParams = useSearchParams()
  const moduloQuery = searchParams.get('modulo')
  const moduloForcado: ImportModulo | null =
    moduloQuery === 'pacientes' || moduloQuery === 'financeiro' || moduloQuery === 'registros'
      ? moduloQuery
      : null

  const [modulo, setModulo] = useState<ImportModulo>(moduloForcado ?? 'pacientes')

  return (
    <div className="space-y-5">
      {/* Cabeçalho */}
      <div>
        <h2 className="text-sm font-semibold text-slate-800">Importação de Dados</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Traga seus dados históricos para o Clinitra em poucos passos.
        </p>
      </div>

      {/* Seleção de módulo */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">O que você quer importar?</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(Object.entries(MODULOS) as [ImportModulo, (typeof MODULOS)[ImportModulo]][]).map(([key, cfg]) => {
            const Icon = cfg.icon
            const ativo = modulo === key
            const bloqueado = !!moduloForcado && key !== moduloForcado
            return (
              <button
                key={key}
                onClick={() => { if (!bloqueado) setModulo(key) }}
                className={cn(
                  'group relative flex flex-col items-start gap-3 rounded-xl border-2 p-4 text-left transition-all duration-200',
                  bloqueado && 'opacity-45 cursor-not-allowed',
                  ativo
                    ? cn('shadow-md', cfg.corBorda, cfg.corBg)
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm',
                )}
              >
                {ativo && (
                  <span className={cn('absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full border-2 bg-white', cfg.corBorda)}>
                    <CheckCircle2 className={cn('h-3 w-3', cfg.cor)} />
                  </span>
                )}
                <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg transition-colors', ativo ? cfg.corBg : 'bg-slate-100 group-hover:bg-slate-200')}>
                  <Icon className={cn('h-5 w-5', ativo ? cfg.cor : 'text-slate-500')} />
                </div>
                <div className="space-y-1 pr-6">
                  <p className={cn('text-sm font-bold', ativo ? cfg.cor : 'text-slate-700')}>{cfg.label}</p>
                  <p className="text-xs text-slate-500 leading-relaxed">{cfg.descricao}</p>
                  <p className={cn('text-[10px] font-medium mt-1', ativo ? cfg.cor : 'text-slate-400')}>{cfg.exemplo}</p>
                </div>
              </button>
            )
          })}
        </div>
        {moduloForcado && (
          <p className="text-[11px] text-slate-500">
            Módulo fixado: <span className="font-semibold">{MODULOS[moduloForcado].label}</span>
          </p>
        )}
      </div>

      {/* Wizard de importação — key força reset ao trocar módulo */}
      <ImportWizard key={modulo} modulo={modulo} />
    </div>
  )
}

export default function ConfiguracoesDadosPage() {
  return (
    <Suspense>
      <ConfiguracoesDadosContent />
    </Suspense>
  )
}
