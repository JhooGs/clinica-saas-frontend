'use client'

import { useState } from 'react'
import { ClipboardList, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Filter, Globe } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useAdminAuditoria, type AuditLogItem } from '@/hooks/use-admin-auditoria'

// ── Labels legíveis para chaves comuns ────────────────────────────────────────

const FIELD_LABELS: Record<string, string> = {
  nome: 'Nome',
  email: 'E-mail',
  email_contato: 'E-mail de contato',
  telefone: 'Telefone',
  especialidade: 'Especialidade',
  plano: 'Plano',
  trial_expira_em: 'Trial expira em',
  ativo: 'Ativo',
  max_profissionais: 'Máx. profissionais',
  max_pacientes: 'Máx. pacientes',
  preco_mensal: 'Preço mensal',
  preco_anual: 'Preço anual',
  descricao: 'Descrição',
  features: 'Recursos',
  logradouro: 'Logradouro',
  numero: 'Número',
  complemento: 'Complemento',
  bairro: 'Bairro',
  cidade: 'Cidade',
  estado: 'Estado',
  cep: 'CEP',
  cnpj: 'CNPJ',
  ia_requests_mensais: 'Req. IA/mês',
  status: 'Status',
  criado_em: 'Criado em',
  atualizado_em: 'Atualizado em',
}

function fieldLabel(key: string) {
  return FIELD_LABELS[key] ?? key.replace(/_/g, ' ')
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'boolean') return v ? 'Sim' : 'Não'
  if (typeof v === 'number') return String(v)
  if (typeof v === 'string') {
    // ISO date
    if (/^\d{4}-\d{2}-\d{2}T/.test(v)) {
      return new Date(v).toLocaleString('pt-BR')
    }
    return v
  }
  if (Array.isArray(v)) return v.join(', ')
  return JSON.stringify(v)
}

// ── Componente de diff ────────────────────────────────────────────────────────

function PayloadDiff({
  antes,
  depois,
}: {
  antes?: Record<string, unknown> | null
  depois?: Record<string, unknown> | null
}) {
  const keys = Array.from(new Set([
    ...Object.keys(antes ?? {}),
    ...Object.keys(depois ?? {}),
  ]))

  // Quando só um lado existe, mostra lista simples
  if (!antes || !depois) {
    const payload = (antes ?? depois)!
    return (
      <div className="space-y-1">
        {Object.entries(payload).map(([k, v]) => (
          <div key={k} className="flex gap-2 text-xs">
            <span className="text-muted-foreground w-36 shrink-0">{fieldLabel(k)}</span>
            <span className="text-gray-800 break-all">{formatValue(v)}</span>
          </div>
        ))}
      </div>
    )
  }

  // Mostra só os campos que mudaram
  const changed = keys.filter(k => JSON.stringify(antes[k]) !== JSON.stringify(depois[k]))

  if (changed.length === 0) {
    return <p className="text-xs text-muted-foreground italic">Sem alterações detectadas.</p>
  }

  return (
    <div className="space-y-2">
      {changed.map(k => (
        <div key={k} className="rounded-lg border bg-white overflow-hidden">
          <div className="px-3 py-1 bg-muted/50 border-b">
            <span className="text-[11px] font-semibold text-gray-600 uppercase tracking-wide">{fieldLabel(k)}</span>
          </div>
          <div className="grid grid-cols-2 divide-x">
            <div className="px-3 py-2 bg-rose-50/60">
              <p className="text-[10px] font-semibold text-rose-600 uppercase tracking-wider mb-1">Antes</p>
              <p className="text-xs text-gray-700 break-all">{formatValue(antes[k])}</p>
            </div>
            <div className="px-3 py-2 bg-emerald-50/60">
              <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider mb-1">Depois</p>
              <p className="text-xs text-gray-700 break-all">{formatValue(depois[k])}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Mapeamento de ações ───────────────────────────────────────────────────────

const ACAO_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  alterar_clinica:      { label: 'Clínica alterada',     color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-200' },
  alterar_plano_config: { label: 'Plano alterado',       color: 'text-violet-700', bg: 'bg-violet-50 border-violet-200' },
  REGISTRO_CRIADO:      { label: 'Registro criado',      color: 'text-emerald-700',bg: 'bg-emerald-50 border-emerald-200' },
  REGISTRO_VISUALIZADO: { label: 'Registro visualizado', color: 'text-cyan-700',   bg: 'bg-cyan-50 border-cyan-200' },
  PACIENTE_CRIADO:      { label: 'Paciente criado',      color: 'text-teal-700',   bg: 'bg-teal-50 border-teal-200' },
  PACIENTE_ATUALIZADO:  { label: 'Paciente atualizado',  color: 'text-teal-700',   bg: 'bg-teal-50 border-teal-200' },
  PACIENTE_DESATIVADO:  { label: 'Paciente desativado',  color: 'text-rose-700',   bg: 'bg-rose-50 border-rose-200' },
  PACIENTE_ANONIMIZADO: { label: 'Paciente anonimizado', color: 'text-rose-700',   bg: 'bg-rose-50 border-rose-200' },
}

function acaoConfig(acao: string) {
  return ACAO_CONFIG[acao] ?? { label: acao, color: 'text-gray-700', bg: 'bg-gray-50 border-gray-200' }
}

function formatDateTime(iso: string) {
  const d = new Date(iso)
  return {
    data: d.toLocaleDateString('pt-BR'),
    hora: d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
  }
}

// ── Linha do log ──────────────────────────────────────────────────────────────

function AuditRow({ item }: { item: AuditLogItem }) {
  const [expanded, setExpanded] = useState(false)
  const cfg = acaoConfig(item.acao)
  const { data, hora } = formatDateTime(item.criado_em)
  const temPayload = item.payload_antes || item.payload_depois

  return (
    <div className="border-b last:border-b-0">
      <div
        className={cn(
          'flex items-start gap-3 px-4 py-3 transition-colors',
          temPayload ? 'cursor-pointer hover:bg-muted/30' : '',
        )}
        onClick={() => temPayload && setExpanded(v => !v)}
      >
        {/* Badge da ação */}
        <div className="shrink-0 pt-0.5">
          <Badge variant="outline" className={cn('text-[11px] font-semibold whitespace-nowrap', cfg.color, cfg.bg)}>
            {cfg.label}
          </Badge>
        </div>

        {/* Detalhes */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{item.actor_email}</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-xs text-muted-foreground font-mono">{item.entidade}</span>
            {item.ip && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Globe className="h-3 w-3" /> {item.ip}
              </span>
            )}
          </div>
        </div>

        {/* Timestamp + expand */}
        <div className="shrink-0 text-right flex items-center gap-2">
          <div>
            <p className="text-xs text-muted-foreground">{data}</p>
            <p className="text-xs font-medium text-gray-700">{hora}</p>
          </div>
          {temPayload && (
            expanded
              ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
              : <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Payload expandido */}
      {expanded && temPayload && (
        <div className="px-4 pb-4 pt-1">
          <PayloadDiff
            antes={item.payload_antes as Record<string, unknown> | null}
            depois={item.payload_depois as Record<string, unknown> | null}
          />
        </div>
      )}
    </div>
  )
}

// ── Filtros ───────────────────────────────────────────────────────────────────

const ACOES_FILTRO = [
  { value: '',                    label: 'Todas as ações' },
  { value: 'alterar_clinica',     label: 'Clínica alterada' },
  { value: 'alterar_plano_config',label: 'Plano alterado' },
]

const ENTIDADES_FILTRO = [
  { value: '',           label: 'Todas as entidades' },
  { value: 'clinica',    label: 'Clínica' },
  { value: 'plano_config', label: 'Plano' },
]

// ── Página principal ──────────────────────────────────────────────────────────

export default function AuditoriaPage() {
  const [acao, setAcao] = useState('')
  const [entidade, setEntidade] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useAdminAuditoria({
    acao: acao || undefined,
    entidade: entidade || undefined,
    page,
    per_page: 50,
  })

  const totalPages = data ? Math.ceil(data.total / data.per_page) : 0

  function handleFiltro(campo: 'acao' | 'entidade', valor: string) {
    if (campo === 'acao') setAcao(valor)
    else setEntidade(valor)
    setPage(1)
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ background: 'linear-gradient(135deg, #0094c8 0%, #04c2fb 60%, #00d5f5 100%)' }}
        >
          <ClipboardList className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold leading-tight">Auditoria</h1>
          <p className="text-sm text-muted-foreground">Operações realizadas no painel admin</p>
        </div>
        {data && (
          <span className="ml-auto text-sm text-muted-foreground">{data.total} evento{data.total !== 1 ? 's' : ''}</span>
        )}
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="flex gap-2 flex-wrap">
              {ACOES_FILTRO.map(f => (
                <button
                  key={f.value}
                  onClick={() => handleFiltro('acao', f.value)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-all border',
                    acao === f.value
                      ? 'border-[#04c2fb] bg-[#e0f7fe] text-[#0094c8]'
                      : 'border-transparent bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className="w-px h-5 bg-border hidden sm:block" />
            <div className="flex gap-2 flex-wrap">
              {ENTIDADES_FILTRO.map(f => (
                <button
                  key={f.value}
                  onClick={() => handleFiltro('entidade', f.value)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-all border',
                    entidade === f.value
                      ? 'border-[#04c2fb] bg-[#e0f7fe] text-[#0094c8]'
                      : 'border-transparent bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista */}
      <Card>
        <CardHeader className="pb-0 px-4 pt-4">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Eventos recentes
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 mt-2">
          {isLoading ? (
            <div className="divide-y">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
                  <div className="h-6 w-28 bg-muted rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 bg-muted rounded w-40" />
                    <div className="h-3 bg-muted rounded w-24" />
                  </div>
                  <div className="space-y-1 text-right">
                    <div className="h-3 bg-muted rounded w-16 ml-auto" />
                    <div className="h-3 bg-muted rounded w-10 ml-auto" />
                  </div>
                </div>
              ))}
            </div>
          ) : !data || data.items.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm">Nenhum evento registrado ainda.</p>
            </div>
          ) : (
            <div>
              {data.items.map(item => <AuditRow key={item.id} item={item} />)}
            </div>
          )}

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-xs text-muted-foreground">Página {page} de {totalPages}</p>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
