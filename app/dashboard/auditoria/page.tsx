'use client'

import { useState } from 'react'
import { Shield, Lock, ChevronLeft, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuditLog, LABELS_ACAO, LABELS_ENTIDADE } from '@/hooks/use-audit-log'
import { cn } from '@/lib/utils'

function formatarDataBR(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso))
}

export default function AuditoriaPage() {
  const [filtroEntidade, setFiltroEntidade] = useState<string>('')
  const [pagina, setPagina] = useState(1)

  const { data, isLoading, isError } = useAuditLog({
    entidade: filtroEntidade || undefined,
    page: pagina,
    page_size: 50,
  })

  if (isError) {
    return (
      <div className="p-4 sm:p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <Lock className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
            <p className="text-sm font-medium text-slate-700">Acesso restrito</p>
            <p className="text-xs text-muted-foreground mt-1">Apenas administradores podem visualizar o registro de auditoria.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Auditoria</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Histórico de acessos e modificações em dados de pacientes e registros clínicos.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4 text-[#04c2fb]" />
            Registro de auditoria
          </CardTitle>
          <CardDescription>
            Retenção de 5 anos conforme CFP Resolução 06/2019.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Filtro por tipo */}
          <div className="flex flex-wrap gap-2">
            {[
              { value: '',                 label: 'Todos' },
              { value: 'paciente',         label: 'Pacientes' },
              { value: 'registro',         label: 'Registros' },
              { value: 'financeiro',       label: 'Financeiro' },
              { value: 'agendamento',      label: 'Agenda' },
              { value: 'usuario',          label: 'Usuários' },
              { value: 'tipo_atendimento', label: 'Tipos' },
              { value: 'pacote',           label: 'Pacotes' },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => { setFiltroEntidade(opt.value); setPagina(1) }}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-medium transition-colors border',
                  filtroEntidade === opt.value
                    ? 'border-[#04c2fb] bg-[#04c2fb]/10 text-[#04c2fb]'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Tabela */}
          <div className="overflow-x-auto rounded-lg border border-slate-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">Data/Hora</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500">Usuário</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">Ação</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 whitespace-nowrap hidden sm:table-cell">Tipo</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 hidden lg:table-cell">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {isLoading && Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {[1,2,3,4,5].map(j => (
                      <td key={j} className="px-3 py-2.5">
                        <div className="h-3.5 bg-slate-100 rounded animate-pulse w-full" />
                      </td>
                    ))}
                  </tr>
                ))}
                {!isLoading && data?.items.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-10 text-center text-sm text-muted-foreground">
                      Nenhum evento registrado.
                    </td>
                  </tr>
                )}
                {!isLoading && data?.items.map(entry => (
                  <tr key={entry.id} className="hover:bg-slate-50/50">
                    <td className="px-3 py-2.5 text-xs text-slate-500 whitespace-nowrap">
                      {formatarDataBR(entry.criado_em)}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-slate-700 max-w-[180px] truncate">
                      {entry.actor_email}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="text-xs font-medium text-slate-700">
                        {LABELS_ACAO[entry.acao] ?? entry.acao}
                      </span>
                      {entry.descricao && (
                        <p className="text-xs text-slate-400 mt-0.5 leading-snug">{entry.descricao}</p>
                      )}
                    </td>
                    <td className="px-3 py-2.5 hidden sm:table-cell">
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-600">
                        {LABELS_ENTIDADE[entry.entidade] ?? entry.entidade}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-slate-400 font-mono hidden lg:table-cell">
                      {entry.ip ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          {data && data.total_pages > 1 && (
            <div className="flex items-center justify-between pt-1">
              <p className="text-xs text-muted-foreground">
                {data.total} evento{data.total !== 1 ? 's' : ''}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPagina(p => Math.max(1, p - 1))}
                  disabled={pagina === 1}
                  className="p-1.5 rounded-md hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="h-4 w-4 text-slate-600" />
                </button>
                <span className="text-xs text-slate-600 px-2">
                  {pagina} / {data.total_pages}
                </span>
                <button
                  onClick={() => setPagina(p => Math.min(data.total_pages, p + 1))}
                  disabled={pagina === data.total_pages}
                  className="p-1.5 rounded-md hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="h-4 w-4 text-slate-600" />
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
