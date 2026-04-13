'use client'

import { useState, useMemo, useRef, Fragment } from 'react'
import type { DateRange } from 'react-day-picker'
import { ClipboardList, ExternalLink, ChevronDown, ChevronUp, FileText, Search, X, Pencil, ArrowUpDown, ArrowUp, ArrowDown, Loader2, AlertTriangle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn, extractTiptapText } from '@/lib/utils'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import { useRegistros } from '@/hooks/use-registros'
import { useAgendamentos } from '@/hooks/use-agenda'
import type { Registro } from '@/types'

function dataHoje(): string {
  return new Date().toISOString().slice(0, 10)
}

function data90DiasAtras(): string {
  const d = new Date()
  d.setDate(d.getDate() - 90)
  return d.toISOString().slice(0, 10)
}

function diasDesde(dataISO: string): number {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const [ay, am, ad] = dataISO.split('-').map(Number)
  const alvo = new Date(ay, am - 1, ad)
  return Math.floor((hoje.getTime() - alvo.getTime()) / (1000 * 60 * 60 * 24))
}

function formatDataBRSimples(iso: string) {
  if (!iso) return '-'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

type SortKey = 'paciente_nome' | 'data_sessao' | 'titulo' | 'presenca'
type SortDir = 'asc' | 'desc'

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 text-gray-300" />
  return sortDir === 'asc'
    ? <ArrowUp className="h-3 w-3 text-[#04c2fb]" />
    : <ArrowDown className="h-3 w-3 text-[#04c2fb]" />
}

function formatDataBR(iso: string) {
  if (!iso) return '-'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function formatBRL(valor: number | string | null): string {
  if (valor === null || valor === undefined) return '—'
  const num = typeof valor === 'string' ? parseFloat(valor) : valor
  if (isNaN(num)) return '—'
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
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
  const [filtroPeriodo, setFiltroPeriodo] = useState<DateRange | undefined>(undefined)
  const [busca, setBusca] = useState('')
  const inputBuscaRef = useRef<HTMLInputElement>(null)
  const [expandidoId, setExpandidoId] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>('data_sessao')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const filtroDataInicio = filtroPeriodo?.from?.toISOString().slice(0, 10)
  const filtroDataFim = filtroPeriodo?.to?.toISOString().slice(0, 10)

  const { data: apiData, isLoading, isError } = useRegistros({
    data_inicio: filtroDataInicio,
    data_fim: filtroDataFim,
    page_size: 200,
  })

  const { data: pendentesData } = useAgendamentos({
    data_inicio: data90DiasAtras(),
    data_fim: dataHoje(),
    sem_registro: true,
  })
  const agendamentosPendentes = pendentesData?.items ?? []
  const registros: Registro[] = useMemo(() => apiData?.items ?? [], [apiData])

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    const filtered = registros.filter(r => {
      if (termo && !(r.paciente_nome ?? '').toLowerCase().includes(termo)) return false
      return true
    })

    return [...filtered].sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case 'paciente_nome':
          cmp = (a.paciente_nome ?? '').localeCompare(b.paciente_nome ?? '', 'pt-BR')
          break
        case 'data_sessao':
          cmp = (a.data_sessao ?? a.criado_em).localeCompare(b.data_sessao ?? b.criado_em)
          break
        case 'titulo':
          cmp = (a.titulo ?? '').localeCompare(b.titulo ?? '', 'pt-BR')
          break
        case 'presenca':
          cmp = (a.presenca === b.presenca) ? 0 : a.presenca ? -1 : 1
          break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [registros, busca, sortKey, sortDir])

  const temFiltro = filtroPeriodo?.from || busca.trim()

  function toggleExpansao(id: string) {
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

      {/* Seção: Aguardando documentação */}
      {agendamentosPendentes.length > 0 && (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b">
            <div className="flex items-center gap-2.5">
              <div className="rounded-lg p-1.5 bg-amber-50">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              </div>
              <div>
                <p className="text-sm font-semibold leading-none">Aguardando documentação</p>
                <p className="text-xs text-muted-foreground mt-0.5">Atendimentos ocorridos sem registro de sessão</p>
              </div>
            </div>
            <span className="flex items-center justify-center h-6 min-w-6 rounded-full bg-amber-500 text-white text-[11px] font-bold px-1.5">
              {agendamentosPendentes.length}
            </span>
          </div>
          <div className="divide-y">
            {agendamentosPendentes.map(ag => {
              const dias = diasDesde(ag.data)
              const cor = dias === 0
                ? { dot: 'bg-amber-400', text: 'text-amber-600', pill: 'bg-amber-50 text-amber-700 border-amber-200' }
                : dias === 1
                ? { dot: 'bg-orange-400', text: 'text-orange-600', pill: 'bg-orange-50 text-orange-700 border-orange-200' }
                : { dot: 'bg-red-500', text: 'text-red-600', pill: 'bg-red-50 text-red-700 border-red-200' }
              const label = dias === 0 ? `hoje às ${ag.horario}` : dias === 1 ? 'ontem' : `há ${dias} dias`

              return (
                <div
                  key={ag.id}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/30 transition-colors"
                >
                  <span className={cn('h-2 w-2 rounded-full shrink-0', cor.dot)} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{ag.paciente_nome ?? '—'}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="inline-flex items-center rounded-full bg-[#04c2fb]/8 border border-[#04c2fb]/20 px-2 py-0.5 text-[10px] font-medium text-[#04c2fb]">
                        {ag.tipo_sessao}
                      </span>
                      <span className={cn('text-[11px] font-medium', cor.text)}>{label}</span>
                    </div>
                  </div>
                  <span className="hidden sm:block text-[11px] text-muted-foreground shrink-0">
                    {formatDataBRSimples(ag.data)}
                  </span>
                  <span className={cn(
                    'hidden sm:inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold shrink-0',
                    cor.pill
                  )}>
                    {dias === 0 ? 'Hoje' : dias === 1 ? '1 dia' : `${dias} dias`}
                  </span>
                  <button
                    onClick={() => router.push(`/dashboard/registros/${ag.id}`)}
                    className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium text-white transition-colors hover:brightness-110 whitespace-nowrap"
                    style={{ background: 'linear-gradient(135deg, #0094c8 0%, #04c2fb 60%, #00d5f5 100%)' }}
                  >
                    Registrar
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

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
                <th onClick={() => handleSort('paciente_nome')} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors">
                  <span className="inline-flex items-center gap-1.5">Paciente <SortIcon col="paciente_nome" sortKey={sortKey} sortDir={sortDir} /></span>
                </th>
                <th onClick={() => handleSort('data_sessao')} className="hidden md:table-cell px-4 py-3 text-left text-xs font-semibold text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors">
                  <span className="inline-flex items-center gap-1.5">Data <SortIcon col="data_sessao" sortKey={sortKey} sortDir={sortDir} /></span>
                </th>
                <th onClick={() => handleSort('titulo')} className="hidden md:table-cell px-4 py-3 text-left text-xs font-semibold text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors">
                  <span className="inline-flex items-center gap-1.5">Tipo <SortIcon col="titulo" sortKey={sortKey} sortDir={sortDir} /></span>
                </th>
                <th onClick={() => handleSort('presenca')} className="hidden md:table-cell px-4 py-3 text-left text-xs font-semibold text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors">
                  <span className="inline-flex items-center gap-1.5">Presença <SortIcon col="presenca" sortKey={sortKey} sortDir={sortDir} /></span>
                </th>
                <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Material</th>
                <th className="hidden md:table-cell px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Valor</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground w-20">Ações</th>
                <th className="px-4 py-3 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="h-6 w-6 animate-spin text-[#04c2fb]" />
                      <p className="text-sm text-muted-foreground">Carregando registros...</p>
                    </div>
                  </td>
                </tr>
              )}
              {isError && !isLoading && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <p className="text-sm text-red-500">Erro ao carregar registros. Tente novamente.</p>
                  </td>
                </tr>
              )}
              {!isLoading && !isError && lista.map(r => {
                const textoNotas = extractTiptapText(r.conteudo_json, 80)
                const textoCompleto = extractTiptapText(r.conteudo_json, 1000)
                const aberto = expandidoId === r.id
                const temNotas = !!r.conteudo_json && textoCompleto.length > 0
                const links = r.link_youtube ? [r.link_youtube] : []

                return (
                  <Fragment key={r.id}>
                    <tr className="hover:bg-muted/20 transition-colors">
                      {/* Paciente */}
                      <td className="px-4 py-3">
                        <button
                          onClick={() => router.push(`/dashboard/pacientes/${r.paciente_id}`)}
                          className="font-medium text-gray-800 hover:text-[#04c2fb] hover:underline transition-colors text-left"
                        >
                          <HighlightMatch texto={r.paciente_nome ?? ''} busca={busca} />
                        </button>
                        {/* Mobile: info extra */}
                        <div className="flex flex-wrap items-center gap-2 mt-1 md:hidden">
                          <span className="text-[11px] text-muted-foreground">{formatDataBR(r.data_sessao ?? r.criado_em.slice(0, 10))}</span>
                          {r.tipo_sessao && (
                            <span className="inline-flex items-center rounded-full bg-[#04c2fb]/8 border border-[#04c2fb]/20 px-2 py-0.5 text-[11px] font-medium text-[#04c2fb]">
                              {r.tipo_sessao}
                            </span>
                          )}
                          <span className={cn(
                            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
                            r.presenca ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
                          )}>
                            <span className={cn('h-1.5 w-1.5 rounded-full', r.presenca ? 'bg-green-500' : 'bg-red-500')} />
                            {r.presenca ? 'Presente' : 'Falta'}
                          </span>
                          {r.valor_sessao != null && (
                            <span className="text-[11px] font-medium text-gray-600">{formatBRL(r.valor_sessao)}</span>
                          )}
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
                      <td className="hidden md:table-cell px-4 py-3 text-muted-foreground">{formatDataBR(r.data_sessao ?? r.criado_em.slice(0, 10))}</td>
                      <td className="hidden md:table-cell px-4 py-3">
                        {r.tipo_sessao ? (
                          <span className="inline-flex items-center rounded-full bg-[#04c2fb]/8 border border-[#04c2fb]/20 px-2 py-0.5 text-[11px] font-medium text-[#04c2fb]">
                            {r.tipo_sessao}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
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
                        {r.presenca ? (r.material || '—') : (r.observacao || '—')}
                      </td>
                      <td className="hidden md:table-cell px-4 py-3 text-right">
                        {r.valor_sessao != null ? (
                          <span className="text-sm font-medium text-gray-700">{formatBRL(r.valor_sessao)}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">sem cobrança</span>
                        )}
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
                        <td colSpan={8} className="px-0 py-0">
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
                                {(r.material && r.material !== '-') || links.length > 0 ? (
                                  <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-[#04c2fb]/15">
                                    {r.material && r.material !== '-' && (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-white border border-gray-200 px-2.5 py-0.5 text-[11px] text-gray-600">
                                        Material: {r.material}
                                      </span>
                                    )}
                                    {links.map((link, i) => (
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
              {!isLoading && !isError && lista.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
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
