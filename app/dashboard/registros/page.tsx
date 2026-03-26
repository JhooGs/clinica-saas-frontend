'use client'

import { useState, useMemo, useRef, Fragment } from 'react'
import type { DateRange } from 'react-day-picker'
import { ClipboardList, ExternalLink, ChevronDown, ChevronUp, FileText, Search, X, Pencil } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn, extractTiptapText } from '@/lib/utils'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import { registrosIniciais, type Registro } from '@/lib/mock-registros'


function formatDataBR(iso: string) {
  if (!iso) return '-'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function HighlightMatch({ texto, busca }: { texto: string; busca: string }) {
  if (!busca.trim()) return <>{texto}</>
  const regex = new RegExp(`(${busca.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  const partes = texto.split(regex)
  return (
    <>
      {partes.map((parte, i) =>
        regex.test(parte) ? (
          <mark key={i} className="bg-[#04c2fb]/20 text-inherit rounded-sm px-0.5">{parte}</mark>
        ) : (
          <span key={i}>{parte}</span>
        )
      )}
    </>
  )
}

export default function RegistrosPage() {
  const router = useRouter()
  const [registros] = useState<Registro[]>(registrosIniciais)
  const [filtroPeriodo, setFiltroPeriodo] = useState<DateRange | undefined>(undefined)
  const [busca, setBusca] = useState('')
  const inputBuscaRef = useRef<HTMLInputElement>(null)
  const [expandidoId, setExpandidoId] = useState<number | null>(null)

  const filtroDataInicio = filtroPeriodo?.from?.toISOString().slice(0, 10) ?? ''
  const filtroDataFim    = filtroPeriodo?.to?.toISOString().slice(0, 10) ?? ''

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return registros.filter(r => {
      if (filtroDataInicio && r.data < filtroDataInicio) return false
      if (filtroDataFim   && r.data > filtroDataFim)   return false
      if (termo && !r.paciente.toLowerCase().includes(termo)) return false
      return true
    }).sort((a, b) => b.data.localeCompare(a.data))
  }, [registros, filtroDataInicio, filtroDataFim, busca])

  const temFiltro = filtroPeriodo?.from || busca.trim()

  function toggleExpansao(id: number) {
    setExpandidoId(prev => (prev === id ? null : id))
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {/* Cabeçalho */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Registros</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Sessões e atendimentos realizados</p>
        </div>
        <p className="text-xs text-muted-foreground mt-1 hidden sm:block">
          Registros são criados a partir dos agendamentos
        </p>
      </div>

      {/* Card contador */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total de Registros</p>
              <p className="mt-2 text-2xl font-bold tracking-tight">{registros.length}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">sessões registradas</p>
            </div>
            <div className="rounded-lg p-2.5 bg-violet-500/10">
              <ClipboardList className="h-4 w-4 text-violet-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Pesquisa + Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Campo de pesquisa */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            ref={inputBuscaRef}
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Pesquisar por paciente..."
            className="w-full rounded-lg border border-gray-200 bg-white/80 pl-9 pr-9 py-2 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#04c2fb]/40 focus:border-[#04c2fb]/60 placeholder:text-muted-foreground/60"
          />
          {busca && (
            <button
              onClick={() => { setBusca(''); inputBuscaRef.current?.focus() }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-gray-100 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Filtro de período + contagem */}
        <div className="flex flex-wrap items-center gap-3">
          <DateRangePicker
            value={filtroPeriodo}
            onChange={setFiltroPeriodo}
            placeholder="Filtrar por período"
          />
          {temFiltro && (
            <button
              onClick={() => { setFiltroPeriodo(undefined); setBusca('') }}
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              Limpar filtros
            </button>
          )}
          <span className="text-xs text-muted-foreground">
            {lista.length} registro(s)
            {busca.trim() && <span className="text-[#0094c8] font-medium"> · &ldquo;{busca.trim()}&rdquo;</span>}
          </span>
        </div>
      </div>

      {/* Tabela */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Paciente</th>
                <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Data</th>
                <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Tipo</th>
                <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Presença</th>
                <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Material</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground w-20">Ações</th>
                <th className="px-4 py-3 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {lista.map(r => {
                const textoNotas = extractTiptapText(r.notasSessaoJson, 80)
                const textoCompleto = extractTiptapText(r.notasSessaoJson, 1000)
                const aberto = expandidoId === r.id
                const temNotas = !!r.notasSessaoJson && textoCompleto.length > 0

                return (
                  <Fragment key={r.id}>
                    <tr className="hover:bg-muted/20 transition-colors">
                      {/* Paciente */}
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800">
                          <HighlightMatch texto={r.paciente} busca={busca} />
                        </div>
                        {/* Mobile: info extra */}
                        <div className="flex flex-wrap items-center gap-2 mt-1 md:hidden">
                          <span className="text-[11px] text-muted-foreground">{formatDataBR(r.data)}</span>
                          <span className="inline-flex items-center rounded-full bg-[#04c2fb]/8 border border-[#04c2fb]/20 px-2 py-0.5 text-[11px] font-medium text-[#04c2fb]">
                            {r.tipoSessao}
                          </span>
                          <span className={cn(
                            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
                            r.presenca ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
                          )}>
                            <span className={cn('h-1.5 w-1.5 rounded-full', r.presenca ? 'bg-green-500' : 'bg-red-500')} />
                            {r.presenca ? 'Presente' : 'Falta'}
                          </span>
                        </div>
                        {/* Preview de notas — mobile */}
                        {temNotas && (
                          <div className="flex items-start gap-1 mt-1.5 md:hidden">
                            <FileText className="h-3 w-3 text-[#04c2fb] shrink-0 mt-0.5" />
                            <span className="text-[11px] text-muted-foreground line-clamp-1">{textoNotas}</span>
                          </div>
                        )}
                      </td>

                      {/* Desktop: colunas */}
                      <td className="hidden md:table-cell px-4 py-3 text-muted-foreground">{formatDataBR(r.data)}</td>
                      <td className="hidden md:table-cell px-4 py-3">
                        <span className="inline-flex items-center rounded-full bg-[#04c2fb]/8 border border-[#04c2fb]/20 px-2 py-0.5 text-[11px] font-medium text-[#04c2fb]">
                          {r.tipoSessao}
                        </span>
                      </td>
                      <td className="hidden md:table-cell px-4 py-3">
                        <span className={cn(
                          'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
                          r.presenca ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
                        )}>
                          <span className={cn('h-1.5 w-1.5 rounded-full', r.presenca ? 'bg-green-500' : 'bg-red-500')} />
                          {r.presenca ? 'Presente' : 'Falta'}
                        </span>
                      </td>
                      <td className="hidden md:table-cell px-4 py-3 text-muted-foreground max-w-[200px] truncate" title={r.material}>
                        {r.presenca ? r.material : (r.observacao || '—')}
                      </td>
                      {/* Botão editar */}
                      <td className="px-3 py-3 text-center">
                        <button
                          onClick={() => router.push(`/dashboard/registros/${r.id}?editar=true`)}
                          title="Editar registro"
                          className="group/edit inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-[#04c2fb]/5 hover:text-[#04c2fb] transition-all duration-200"
                        >
                          <Pencil className="h-3.5 w-3.5 transition-transform duration-200 group-hover/edit:-rotate-12 group-hover/edit:scale-110" />
                        </button>
                      </td>
                      {/* Botão expandir */}
                      <td className="px-3 py-3 text-right">
                        {temNotas && (
                          <button
                            onClick={() => toggleExpansao(r.id)}
                            title={aberto ? 'Fechar notas' : 'Ver notas'}
                            className={cn(
                              'inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors',
                              aberto
                                ? 'bg-[#04c2fb]/10 text-[#04c2fb]'
                                : 'text-muted-foreground hover:bg-muted hover:text-gray-700',
                            )}
                          >
                            <span className="hidden sm:inline">{aberto ? 'Fechar' : 'Ver notas'}</span>
                            {aberto
                              ? <ChevronUp className="h-3.5 w-3.5" />
                              : <ChevronDown className="h-3.5 w-3.5" />
                            }
                          </button>
                        )}
                      </td>
                    </tr>

                    {/* Linha expandida */}
                    {temNotas && (
                      <tr className={aberto ? '' : 'hidden'}>
                        <td colSpan={7} className="px-0 py-0">
                          <div
                            className={cn(
                              'grid transition-all duration-200',
                              aberto ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
                            )}
                          >
                            <div className="overflow-hidden">
                              <div className="mx-4 my-3 rounded-lg border-l-4 border-[#04c2fb] bg-[#04c2fb]/5 px-4 py-3">
                                <div className="flex items-center gap-2 mb-2">
                                  <FileText className="h-3.5 w-3.5 text-[#04c2fb]" />
                                  <span className="text-xs font-semibold text-[#04c2fb]">Notas da Sessão</span>
                                </div>
                                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                                  {textoCompleto}
                                </p>
                                {/* Rodapé: material + links */}
                                {(r.material && r.material !== '-') || r.links.length > 0 ? (
                                  <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-[#04c2fb]/15">
                                    {r.material && r.material !== '-' && (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-white border border-gray-200 px-2.5 py-0.5 text-[11px] text-gray-600">
                                        Material: {r.material}
                                      </span>
                                    )}
                                    {r.links.map((link, i) => (
                                      <a
                                        key={i}
                                        href={link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 rounded-full border border-[#04c2fb]/30 bg-[#04c2fb]/5 px-2.5 py-0.5 text-[11px] text-[#04c2fb] hover:bg-[#04c2fb]/10 transition-colors max-w-[180px]"
                                        title={link}
                                      >
                                        <ExternalLink className="h-3 w-3 shrink-0" />
                                        <span className="truncate">{(() => { try { return new URL(link).hostname.replace('www.', '') } catch { return link } })()}</span>
                                      </a>
                                    ))}
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
              {lista.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Search className="h-8 w-8 text-muted-foreground/30" />
                      <p className="text-sm font-medium text-muted-foreground">
                        {busca.trim()
                          ? <>Nenhum registro encontrado para <span className="text-[#0094c8] font-semibold">&ldquo;{busca.trim()}&rdquo;</span></>
                          : 'Nenhum registro encontrado para os filtros selecionados.'}
                      </p>
                      {busca.trim() && (
                        <button
                          onClick={() => setBusca('')}
                          className="text-xs text-[#04c2fb] hover:underline mt-1"
                        >
                          Limpar pesquisa
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
