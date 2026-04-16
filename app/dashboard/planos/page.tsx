'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import {
  Plus, Pencil, Trash2, Save, X, Tag, Info,
  AlertTriangle, ArrowUp, ArrowDown, Package,
  Zap, ZapOff, Lock, Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { TipoSessao, Pacote, PacoteTipo, PacoteTipoInput } from '@/lib/types/planos'
import {
  useTiposSessao, useCriarTipoSessao, useAtualizarTipoSessao, useExcluirTipoSessao,
  usePacotes, useCriarPacote, useAtualizarPacote, useExcluirPacote,
} from '@/hooks/use-planos'
import { PageLoader } from '@/components/ui/page-loader'

type TabId = 'tipos' | 'pacotes'

/* ══════════════════════════════════════════════════════
   Modal glassmorphism — Tipo de Sessão (criar/editar)
   ══════════════════════════════════════════════════════ */

function ModalTipo({
  modo,
  inicial,
  nomesExistentes,
  onSalvar,
  onFechar,
}: {
  modo: 'criar' | 'editar'
  inicial?: TipoSessao
  nomesExistentes: string[]
  onSalvar: (dados: { nome: string; valor_padrao: string }) => void
  onFechar: () => void
}) {
  const [nome, setNome] = useState(inicial?.nome ?? '')
  const [valorPadrao, setValorPadrao] = useState(inicial?.valor_padrao ?? '')
  const [erroNome, setErroNome] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 60)
    return () => clearTimeout(t)
  }, [])

  function formatarValor(raw: string) {
    const digits = raw.replace(/\D/g, '')
    if (!digits) return ''
    const cents = parseInt(digits, 10)
    return (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  function handleValorChange(e: React.ChangeEvent<HTMLInputElement>) {
    setValorPadrao(formatarValor(e.target.value))
  }

  function salvar() {
    const nomeTrim = nome.trim()
    if (!nomeTrim) { setErroNome('Nome obrigatório.'); return }
    const isDup = nomesExistentes.some(n => n.toLowerCase() === nomeTrim.toLowerCase())
    if (isDup && nomeTrim.toLowerCase() !== (inicial?.nome ?? '').toLowerCase()) {
      setErroNome('Já existe um tipo com esse nome.'); return
    }
    onSalvar({ nome: nomeTrim, valor_padrao: valorPadrao })
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter') salvar()
    if (e.key === 'Escape') onFechar()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backdropFilter: 'blur(5px)', background: 'rgba(0,0,0,0.22)' }}
      onClick={e => { if (e.target === e.currentTarget) onFechar() }}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-white/60 shadow-2xl"
        style={{ background: 'rgba(255,255,255,0.93)', backdropFilter: 'blur(24px)' }}
        onKeyDown={handleKey}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 pt-5 sm:pt-6 pb-4 sm:pb-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm"
              style={{ background: 'linear-gradient(135deg, #0094c8 0%, #04c2fb 60%, #00d5f5 100%)' }}
            >
              <Tag className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">
                {modo === 'criar' ? 'Novo tipo de atendimento' : 'Editar tipo de atendimento'}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {modo === 'criar' ? 'Defina um nome e o valor avulso' : 'Altere os dados do atendimento'}
              </p>
            </div>
          </div>
          <button onClick={onFechar} className="rounded-lg p-1.5 text-muted-foreground hover:bg-gray-100 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 sm:px-6 py-5 space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Nome <span className="text-red-400 font-normal normal-case">(obrigatório)</span>
            </label>
            <input
              ref={inputRef}
              value={nome}
              onChange={e => { setNome(e.target.value); setErroNome('') }}
              placeholder="Ex: Terapia ocupacional"
              className={cn(
                'w-full rounded-xl border px-4 py-2.5 text-sm bg-white/70 focus:outline-none focus:ring-2 transition-all',
                erroNome
                  ? 'border-red-300 focus:ring-red-200'
                  : 'border-gray-200 focus:ring-[#04c2fb]/30 focus:border-[#04c2fb]/60',
              )}
            />
            {erroNome && (
              <p className="flex items-center gap-1.5 text-xs text-red-500">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {erroNome}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Valor avulso <span className="text-gray-400 font-normal normal-case">(opcional)</span>
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-sm text-gray-400 select-none">
                R$
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={valorPadrao}
                onChange={handleValorChange}
                placeholder="0,00"
                className="w-full rounded-xl border border-gray-200 pl-10 pr-4 py-2.5 text-sm bg-white/70 focus:outline-none focus:ring-2 focus:ring-[#04c2fb]/30 focus:border-[#04c2fb]/60 transition-all"
              />
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Valor cobrado em atendimentos avulsos (fora de pacotes).
            </p>
          </div>

          {modo === 'editar' && (
            <div className="flex items-start gap-2.5 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 leading-relaxed">
                Alterações afetam apenas novos registros. Sessões já registradas com este tipo não são recalculadas.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 px-5 sm:px-6 pb-5 sm:pb-6">
          <button
            onClick={onFechar}
            className="rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-gray-100 transition-colors border border-gray-200"
          >
            Cancelar
          </button>
          <button
            onClick={salvar}
            className="flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-110 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #0094c8 0%, #04c2fb 60%, #00d5f5 100%)' }}
          >
            <Save className="h-4 w-4" />
            {modo === 'criar' ? 'Criar atendimento' : 'Salvar alterações'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   Modal glassmorphism — Pacote (criar/editar)
   ══════════════════════════════════════════════════════ */

type TipoConfig = { incluido: boolean; valor: string }

type PacoteFormData = {
  nome: string
  descricao: string
  valor: string
  tipos: PacoteTipoInput[]
  ativo: boolean
  sistema?: boolean
}

function ModalPacote({
  modo,
  inicial,
  tiposSessao,
  nomesExistentes,
  onSalvar,
  onFechar,
}: {
  modo: 'criar' | 'editar'
  inicial?: Pacote
  tiposSessao: TipoSessao[]
  nomesExistentes: string[]
  onSalvar: (dados: PacoteFormData) => void
  onFechar: () => void
}) {
  const isSystem = inicial?.sistema === true
  const [nome, setNome] = useState(inicial?.nome ?? '')
  const [descricao, setDescricao] = useState(inicial?.descricao ?? '')
  const [valor, setValor] = useState(inicial?.valor ?? '')
  const [ativo, setAtivo] = useState(inicial?.ativo ?? true)
  const [erroNome, setErroNome] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Estado por tipo: incluido + valor avulso do pacote
  const [tiposConfig, setTiposConfig] = useState<Record<string, TipoConfig>>(() => {
    const cfg: Record<string, TipoConfig> = {}
    // Inicializa todos como não incluídos
    tiposSessao.forEach(t => { cfg[t.id] = { incluido: false, valor: '' } })
    // Sobrescreve com dados existentes
    if (inicial?.tipos) {
      inicial.tipos.forEach((pt: PacoteTipo) => {
        cfg[pt.tipo_sessao_id] = { incluido: pt.incluido, valor: pt.valor ?? '' }
      })
    }
    return cfg
  })

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 60)
    return () => clearTimeout(t)
  }, [])

  function formatarValor(raw: string) {
    const digits = raw.replace(/\D/g, '')
    if (!digits) return ''
    const cents = parseInt(digits, 10)
    return (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  function toggleTipo(tipoId: string) {
    setTiposConfig(prev => ({
      ...prev,
      [tipoId]: {
        incluido: !prev[tipoId]?.incluido,
        // Ao desligar, limpa o valor para o terapeuta preencher
        valor: prev[tipoId]?.incluido ? '' : (prev[tipoId]?.valor ?? ''),
      },
    }))
  }

  function setValorTipo(tipoId: string, raw: string) {
    setTiposConfig(prev => ({
      ...prev,
      [tipoId]: { ...prev[tipoId], valor: formatarValor(raw) },
    }))
  }

  const qtdIncluidos = Object.values(tiposConfig).filter(c => c.incluido).length

  function salvar() {
    const nomeTrim = isSystem ? (inicial?.nome ?? '') : nome.trim()
    if (!nomeTrim) { setErroNome('Nome obrigatório.'); return }
    if (!isSystem) {
      const isDup = nomesExistentes.some(n => n.toLowerCase() === nomeTrim.toLowerCase())
      if (isDup && nomeTrim.toLowerCase() !== (inicial?.nome ?? '').toLowerCase()) {
        setErroNome('Já existe um pacote com esse nome.'); return
      }
    }
    if (qtdIncluidos === 0) {
      toast.error('Nenhum atendimento incluído', { description: 'Ative pelo menos um tipo de atendimento no pacote.' })
      return
    }
    const tiposFinal: PacoteTipoInput[] = tiposSessao.map(t => {
      const cfg = tiposConfig[t.id] ?? { incluido: false, valor: '' }
      return {
        tipo_sessao_id: t.id,
        incluido: cfg.incluido,
        valor: cfg.incluido ? null : (cfg.valor || null),
      }
    })
    const descricaoFinal = isSystem ? (inicial?.descricao ?? '') : descricao.trim()
    const valorFinal = isSystem ? '' : valor
    onSalvar({
      nome: nomeTrim,
      descricao: descricaoFinal,
      valor: valorFinal,
      tipos: tiposFinal,
      ativo,
      ...(isSystem ? { sistema: true } : {}),
    })
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Escape') onFechar()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
      style={{ backdropFilter: 'blur(5px)', background: 'rgba(0,0,0,0.22)' }}
      onClick={e => { if (e.target === e.currentTarget) onFechar() }}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl border border-white/60 shadow-2xl"
        style={{ background: 'rgba(255,255,255,0.93)', backdropFilter: 'blur(24px)' }}
        onKeyDown={handleKey}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 pt-5 sm:pt-6 pb-4 sm:pb-5 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm"
              style={{ background: 'linear-gradient(135deg, #0094c8 0%, #04c2fb 60%, #00d5f5 100%)' }}
            >
              {isSystem ? <Lock className="h-5 w-5 text-white" /> : <Package className="h-5 w-5 text-white" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-gray-900">
                  {modo === 'criar' ? 'Novo pacote' : 'Editar pacote'}
                </h2>
                {isSystem && (
                  <span className="rounded-full bg-violet-100 border border-violet-200 px-2 py-0.5 text-[10px] font-semibold text-violet-600">
                    Padrão do sistema
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isSystem
                  ? 'Ative/desative e configure os valores dos atendimentos'
                  : modo === 'criar' ? 'Defina o valor de referência e os atendimentos' : 'Altere as configurações do pacote'}
              </p>
            </div>
          </div>
          <button onClick={onFechar} className="rounded-lg p-1.5 text-muted-foreground hover:bg-gray-100 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-5">

          {/* Aviso pacote sistema */}
          {isSystem && (
            <div className="flex items-start gap-2.5 rounded-xl bg-violet-50 border border-violet-200 px-4 py-3">
              <Lock className="h-4 w-4 text-violet-500 shrink-0 mt-0.5" />
              <p className="text-xs text-violet-700 leading-relaxed">
                Nome e valor deste pacote são fixos do sistema. Você pode ativar ou desativar e configurar quais atendimentos estão incluídos.
              </p>
            </div>
          )}

          {/* Nome + Valor lado a lado */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Nome {!isSystem && <span className="text-red-400 font-normal normal-case">(obrigatório)</span>}
              </label>
              <input
                ref={isSystem ? undefined : inputRef}
                value={isSystem ? (inicial?.nome ?? '') : nome}
                readOnly={isSystem}
                onChange={isSystem ? undefined : e => { setNome(e.target.value); setErroNome('') }}
                placeholder="Ex: Pacote Mensal"
                className={cn(
                  'w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 transition-all',
                  isSystem
                    ? 'bg-gray-50/80 text-muted-foreground cursor-default border-gray-200'
                    : erroNome
                      ? 'bg-white/70 border-red-300 focus:ring-red-200'
                      : 'bg-white/70 border-gray-200 focus:ring-[#04c2fb]/30 focus:border-[#04c2fb]/60',
                )}
              />
              {erroNome && (
                <p className="flex items-center gap-1.5 text-xs text-red-500">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {erroNome}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Valor de referência
              </label>
              {isSystem ? (
                <p className="text-sm text-muted-foreground px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50/80">
                  R$ 0,00
                </p>
              ) : (
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-sm text-gray-400 select-none">
                    R$
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={valor}
                    onChange={e => setValor(formatarValor(e.target.value))}
                    placeholder="0,00"
                    className="w-full rounded-xl border border-gray-200 pl-10 pr-4 py-2.5 text-sm bg-white/70 focus:outline-none focus:ring-2 focus:ring-[#04c2fb]/30 focus:border-[#04c2fb]/60 transition-all"
                  />
                </div>
              )}
              <p className="text-[11px] text-muted-foreground leading-snug">
                Aplicado a todos os atendimentos incluídos no pacote.
              </p>
            </div>
          </div>

          {/* Descrição — oculta para pacotes sistema */}
          {!isSystem && (
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Descrição <span className="text-muted-foreground font-normal normal-case">(opcional)</span>
              </label>
              <textarea
                value={descricao}
                onChange={e => setDescricao(e.target.value)}
                placeholder="Breve descrição do pacote..."
                rows={2}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm bg-white/70 focus:outline-none focus:ring-2 focus:ring-[#04c2fb]/30 focus:border-[#04c2fb]/60 transition-all resize-none"
              />
            </div>
          )}

          {/* Ativo toggle */}
          <button
            type="button"
            onClick={() => setAtivo(!ativo)}
            className={cn(
              'w-full flex items-center justify-between rounded-xl border px-4 py-3 transition-all duration-200 text-left',
              ativo
                ? 'border-[#04c2fb]/30 bg-[#04c2fb]/5'
                : 'border-gray-200 bg-white/50',
            )}
          >
            <div className="flex items-center gap-3">
              <div className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all duration-200',
              )}
                style={ativo ? { background: 'linear-gradient(135deg, #0094c8 0%, #04c2fb 60%, #00d5f5 100%)' } : { background: '#f1f5f9' }}
              >
                {ativo
                  ? <Zap className="h-4 w-4 text-white" />
                  : <ZapOff className="h-4 w-4 text-gray-400" />
                }
              </div>
              <div>
                <p className={cn(
                  'text-sm font-medium transition-colors duration-200',
                  ativo ? 'text-gray-900' : 'text-gray-500',
                )}>
                  Pacote ativo
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {ativo ? 'Disponível para uso nos atendimentos' : 'Não aparece para seleção'}
                </p>
              </div>
            </div>
            <div className={cn(
              'relative shrink-0 h-6 w-11 rounded-full transition-all duration-300',
              ativo ? 'bg-[#04c2fb]' : 'bg-gray-200',
            )}>
              <span className={cn(
                'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all duration-300',
                ativo ? 'left-[calc(100%-1.375rem)]' : 'left-0.5',
              )} />
            </div>
          </button>

          {/* Atendimentos — toggle + valor por linha */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Atendimentos
              </label>
              <span className="text-xs text-muted-foreground">
                {qtdIncluidos} incluído{qtdIncluidos !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Legenda */}
            <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-muted-foreground px-1">
              <span>Tipo</span>
              <span>Valor no pacote</span>
            </div>

            <div className="rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-100">
              {tiposSessao.map(tipo => {
                const cfg = tiposConfig[tipo.id] ?? { incluido: false, valor: '' }
                const valorExibido = cfg.incluido ? (valor || '0,00') : cfg.valor
                return (
                  <div
                    key={tipo.id}
                    className={cn(
                      'flex items-center gap-3 px-3.5 py-2.5 transition-colors',
                      cfg.incluido ? 'bg-[#04c2fb]/4' : 'bg-white',
                    )}
                  >
                    {/* Toggle */}
                    <button
                      type="button"
                      onClick={() => toggleTipo(tipo.id)}
                      className={cn(
                        'relative shrink-0 h-5 w-9 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#04c2fb]/40',
                        cfg.incluido ? 'bg-[#04c2fb]' : 'bg-gray-200',
                      )}
                      aria-label={cfg.incluido ? 'Remover do pacote' : 'Incluir no pacote'}
                    >
                      <span className={cn(
                        'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all duration-200',
                        cfg.incluido ? 'left-[calc(100%-1.125rem)]' : 'left-0.5',
                      )} />
                    </button>

                    {/* Nome */}
                    <span className={cn(
                      'flex-1 text-sm leading-tight truncate',
                      cfg.incluido ? 'font-medium text-gray-800' : 'text-gray-500',
                    )}>
                      {tipo.nome}
                    </span>

                    {/* Campo valor */}
                    <div className="relative shrink-0 w-28">
                      <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-xs text-gray-400 select-none">
                        R$
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        disabled={cfg.incluido}
                        value={valorExibido}
                        onChange={e => setValorTipo(tipo.id, e.target.value)}
                        placeholder="0,00"
                        className={cn(
                          'w-full rounded-lg border pl-8 pr-2 py-1.5 text-xs text-right transition-all',
                          cfg.incluido
                            ? 'bg-slate-50 text-muted-foreground border-gray-200 cursor-default select-none'
                            : 'bg-white border-gray-200 focus:outline-none focus:ring-1 focus:ring-[#04c2fb]/40 focus:border-[#04c2fb]/50',
                        )}
                      />
                    </div>
                  </div>
                )
              })}
            </div>

            <p className="text-[11px] text-muted-foreground leading-relaxed px-0.5">
              Atendimentos incluídos usam o valor de referência do pacote. Os demais exigem informar o valor avulso.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 px-5 sm:px-6 py-4 sm:py-5 border-t border-slate-100 shrink-0">
          <button
            onClick={onFechar}
            className="rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-gray-100 transition-colors border border-gray-200"
          >
            Cancelar
          </button>
          <button
            onClick={salvar}
            className="flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-110 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #0094c8 0%, #04c2fb 60%, #00d5f5 100%)' }}
          >
            <Save className="h-4 w-4" />
            {modo === 'criar' ? 'Criar pacote' : 'Salvar alterações'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   Modal confirmar exclusão (genérico)
   ══════════════════════════════════════════════════════ */

function ModalExclusao({
  titulo,
  nome,
  descricao,
  nota,
  onConfirmar,
  onCancelar,
}: {
  titulo: string
  nome: string
  descricao: string
  nota?: string
  onConfirmar: () => void
  onCancelar: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backdropFilter: 'blur(5px)', background: 'rgba(0,0,0,0.22)' }}
      onClick={e => { if (e.target === e.currentTarget) onCancelar() }}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-white/60 shadow-2xl"
        style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(24px)' }}
      >
        <div className="px-5 sm:px-6 pt-5 sm:pt-6 pb-5 sm:pb-6 space-y-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 border border-red-100">
              <Trash2 className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">{titulo}</h2>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                Tem certeza que deseja remover{' '}
                <span className="font-semibold text-gray-800">&ldquo;{nome}&rdquo;</span>?
                {' '}{descricao}
              </p>
              {nota && (
                <p className="text-xs text-muted-foreground mt-2 flex items-start gap-1.5">
                  <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-slate-400" />
                  {nota}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 justify-end">
            <button
              onClick={onCancelar}
              className="rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-gray-100 transition-colors border border-gray-200"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirmar}
              className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" /> Remover
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   Page
   ══════════════════════════════════════════════════════ */

export default function PlanosPage() {
  const [tab, setTab] = useState<TabId>('tipos')

  /* ── API: Tipos de sessão ── */
  const { data: tiposData, isLoading: loadingTipos } = useTiposSessao()
  const criarTipoMutation = useCriarTipoSessao()
  const atualizarTipoMutation = useAtualizarTipoSessao()
  const excluirTipoMutation = useExcluirTipoSessao()
  const tipos = useMemo(() => tiposData?.items ?? [], [tiposData])

  /* ── API: Pacotes ── */
  const { data: pacotesData, isLoading: loadingPacotes } = usePacotes()
  const criarPacoteMutation = useCriarPacote()
  const atualizarPacoteMutation = useAtualizarPacote()
  const excluirPacoteMutation = useExcluirPacote()
  const pacotes = useMemo(() => pacotesData?.items ?? [], [pacotesData])

  /* ── State: Modais ── */
  const [modalTipo, setModalTipo] = useState<{ modo: 'criar' | 'editar'; tipo?: TipoSessao } | null>(null)
  const [excluindoTipo, setExcluindoTipo] = useState<TipoSessao | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [modalPacote, setModalPacote] = useState<{ modo: 'criar' | 'editar'; pacote?: Pacote } | null>(null)
  const [excluindoPacote, setExcluindoPacote] = useState<Pacote | null>(null)

  /* ── Derived ── */
  const nomesExistentesTipos = tipos.map(t => t.nome)
  const nomesExistentesPacotes = pacotes.map(p => p.nome)

  const tiposOrdenados = useMemo(() =>
    [...tipos].sort((a, b) => {
      const cmp = a.nome.localeCompare(b.nome, 'pt-BR')
      return sortDir === 'asc' ? cmp : -cmp
    }),
  [tipos, sortDir])

  /* ── Handlers: Tipos ── */
  function criarTipo(dados: { nome: string; valor_padrao: string }) {
    criarTipoMutation.mutate(
      { nome: dados.nome, valor_padrao: dados.valor_padrao || null },
      {
        onSuccess: () => {
          setModalTipo(null)
          toast.success('Tipo criado', { description: `"${dados.nome}" está disponível nos pacotes.` })
        },
        onError: (err) => toast.error('Erro ao criar tipo', { description: err.message }),
      },
    )
  }

  function salvarEdicaoTipo(dados: { nome: string; valor_padrao: string }) {
    const id = modalTipo?.tipo?.id
    if (!id) return
    const isPadrao = modalTipo?.tipo?.padrao
    atualizarTipoMutation.mutate(
      { id, payload: { ...(isPadrao ? {} : { nome: dados.nome }), valor_padrao: dados.valor_padrao || null } },
      {
        onSuccess: () => {
          setModalTipo(null)
          toast.success('Tipo atualizado', { description: `"${dados.nome}" foi salvo.` })
        },
        onError: (err) => toast.error('Erro ao atualizar tipo', { description: err.message }),
      },
    )
  }

  function confirmarExclusaoTipo() {
    if (!excluindoTipo) return
    const nome = excluindoTipo.nome
    excluirTipoMutation.mutate(excluindoTipo.id, {
      onSuccess: () => {
        setExcluindoTipo(null)
        toast.success('Tipo removido', { description: `"${nome}" foi removido da lista.` })
      },
      onError: (err) => {
        setExcluindoTipo(null)
        toast.error('Erro ao remover tipo', { description: err.message })
      },
    })
  }

  /* ── Handlers: Pacotes ── */
  function criarPacote(dados: PacoteFormData) {
    criarPacoteMutation.mutate(
      { nome: dados.nome, descricao: dados.descricao, valor: dados.valor, tipos: dados.tipos, ativo: dados.ativo },
      {
        onSuccess: () => {
          setModalPacote(null)
          toast.success('Pacote criado', { description: `"${dados.nome}" está disponível para uso.` })
        },
        onError: (err) => toast.error('Erro ao criar pacote', { description: err.message }),
      },
    )
  }

  function salvarEdicaoPacote(dados: PacoteFormData) {
    const id = modalPacote?.pacote?.id
    if (!id) return
    const isPacoteSystem = modalPacote?.pacote?.sistema
    atualizarPacoteMutation.mutate(
      {
        id,
        payload: {
          ...(isPacoteSystem ? {} : { nome: dados.nome, valor: dados.valor }),
          descricao: dados.descricao,
          ativo: dados.ativo,
          tipos: dados.tipos,
        },
      },
      {
        onSuccess: () => {
          setModalPacote(null)
          toast.success('Pacote atualizado', { description: `"${dados.nome}" foi salvo.` })
        },
        onError: (err) => toast.error('Erro ao atualizar pacote', { description: err.message }),
      },
    )
  }

  function confirmarExclusaoPacote() {
    if (!excluindoPacote) return
    if (excluindoPacote.sistema) return
    const nome = excluindoPacote.nome
    excluirPacoteMutation.mutate(excluindoPacote.id, {
      onSuccess: () => {
        setExcluindoPacote(null)
        toast.success('Pacote removido', { description: `"${nome}" foi removido.` })
      },
      onError: (err) => {
        setExcluindoPacote(null)
        toast.error('Erro ao remover pacote', { description: err.message })
      },
    })
  }

  function getNomeTipo(id: string): string {
    return tipos.find(t => t.id === id)?.nome ?? id
  }

  /* ── Tabs ── */
  const tabs: { id: TabId; label: string; icon: typeof Tag }[] = [
    { id: 'tipos', label: 'Tipos de Atendimento', icon: Tag },
    { id: 'pacotes', label: 'Pacotes', icon: Package },
  ]

  if (loadingTipos || loadingPacotes) return <PageLoader />

  return (
    <div className="space-y-6 sm:space-y-7">

      {/* Modais */}
      {modalTipo && (
        <ModalTipo
          modo={modalTipo.modo}
          inicial={modalTipo.tipo}
          nomesExistentes={nomesExistentesTipos}
          onSalvar={modalTipo.modo === 'criar' ? criarTipo : salvarEdicaoTipo}
          onFechar={() => setModalTipo(null)}
        />
      )}
      {excluindoTipo && (
        <ModalExclusao
          titulo="Remover tipo de atendimento"
          nome={excluindoTipo.nome}
          descricao="Ele deixará de aparecer nas opções de novos registros e pacotes."
          nota="Registros já criados com este tipo não são afetados."
          onConfirmar={confirmarExclusaoTipo}
          onCancelar={() => setExcluindoTipo(null)}
        />
      )}
      {modalPacote && (
        <ModalPacote
          modo={modalPacote.modo}
          inicial={modalPacote.pacote}
          tiposSessao={tipos}
          nomesExistentes={nomesExistentesPacotes}
          onSalvar={(dados: PacoteFormData) =>
            modalPacote.modo === 'criar' ? criarPacote(dados) : salvarEdicaoPacote(dados)
          }
          onFechar={() => setModalPacote(null)}
        />
      )}
      {excluindoPacote && (
        <ModalExclusao
          titulo="Remover pacote"
          nome={excluindoPacote.nome}
          descricao="Ele deixará de aparecer nas opções de plano dos pacientes."
          nota="Pacientes já vinculados a este pacote não são afetados."
          onConfirmar={confirmarExclusaoPacote}
          onCancelar={() => setExcluindoPacote(null)}
        />
      )}

      {/* Cabeçalho */}
      <div>
        <div className="flex items-center gap-2.5 mb-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#04c2fb]/10">
            <Package className="h-4 w-4 text-[#04c2fb]" />
          </div>
          <h2 className="text-base font-bold text-slate-800">Planos</h2>
        </div>
        <p className="text-sm text-muted-foreground pl-px">
          Configure tipos de atendimentos e pacotes.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-muted/50 p-1 border">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-3 sm:px-4 py-2 text-sm font-medium transition-all flex-1 justify-center',
              tab === t.id
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-muted-foreground hover:text-slate-700',
            )}
          >
            <t.icon className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:inline">{t.label}</span>
            <span className="sm:hidden">{t.id === 'tipos' ? 'Tipos' : 'Pacotes'}</span>
          </button>
        ))}
      </div>

      {/* ════════════ ABA: TIPOS DE ATENDIMENTO ════════════ */}
      {tab === 'tipos' && (
        <div className="space-y-6 sm:space-y-7">
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-slate-700">Tipos de atendimentos</h3>
                {loadingTipos
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin text-[#04c2fb]" />
                  : <span className="rounded-full bg-[#04c2fb]/10 px-2 py-0.5 text-[11px] font-medium text-[#04c2fb]">{tipos.length}</span>
                }
              </div>
              <button
                onClick={() => setModalTipo({ modo: 'criar' })}
                className="flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:brightness-110 active:scale-95 shrink-0"
                style={{ background: 'linear-gradient(135deg, #0094c8 0%, #04c2fb 60%, #00d5f5 100%)' }}
              >
                <Plus className="h-3.5 w-3.5" /> Novo tipo
              </button>
            </div>

            {tipos.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/40 flex flex-col items-center text-center gap-3 px-4 sm:px-6 py-10 sm:py-14">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#04c2fb]/10">
                  <Tag className="h-7 w-7 text-[#04c2fb]/60" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-700">Nenhum tipo de atendimento</p>
                  <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                    Crie tipos de atendimentos para organizar os atendimentos da sua clínica.
                  </p>
                </div>
                <button
                  onClick={() => setModalTipo({ modo: 'criar' })}
                  className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold text-white mt-1 shadow-sm transition-all hover:brightness-110 active:scale-95"
                  style={{ background: 'linear-gradient(135deg, #0094c8 0%, #04c2fb 60%, #00d5f5 100%)' }}
                >
                  <Plus className="h-3.5 w-3.5" /> Criar primeiro tipo
                </button>
              </div>
            ) : (
              <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                <div className="grid grid-cols-[1fr_auto] items-center gap-4 px-4 sm:px-5 py-2.5 bg-muted/40 border-b">
                  <button
                    onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
                    className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors"
                  >
                    Nome
                    {sortDir === 'asc'
                      ? <ArrowUp className="h-3 w-3 text-[#04c2fb]" />
                      : <ArrowDown className="h-3 w-3 text-[#04c2fb]" />}
                  </button>
                  <span className="w-16" />
                </div>

                <div className="divide-y">
                  {tiposOrdenados.map(tipo => (
                    <div
                      key={tipo.id}
                      className="grid grid-cols-[1fr_auto] items-center gap-4 px-4 sm:px-5 py-3 sm:py-4 hover:bg-muted/20 transition-colors group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="h-2 w-2 rounded-full bg-[#04c2fb] shrink-0" />
                        <span className="text-sm font-medium text-gray-800 truncate">{tipo.nome}</span>
                        {tipo.valor_padrao && (
                          <span className="shrink-0 text-xs text-emerald-600 font-medium">
                            R$ {tipo.valor_padrao}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-0.5 w-16 justify-end">
                        <button
                          onClick={() => setModalTipo({ modo: 'editar', tipo })}
                          title="Editar"
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-[#04c2fb]/10 hover:text-[#04c2fb] transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setExcluindoTipo(tipo)}
                          title="Remover"
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="px-4 sm:px-5 py-3 border-t bg-muted/20">
                  <span className="text-xs text-muted-foreground">
                    {tipos.length} tipo{tipos.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            )}
          </section>

          {/* Nota informativa */}
          <div className="rounded-xl bg-[#04c2fb]/5 border border-[#04c2fb]/20 px-3 sm:px-4 py-3 sm:py-3.5 flex items-start gap-3">
            <Info className="h-4 w-4 text-[#04c2fb] shrink-0 mt-0.5" />
            <p className="text-xs text-slate-600 leading-relaxed">
              Todos os tipos podem ser editados ou removidos livremente.
              Sessões já registradas no passado não são afetadas por alterações aqui.
            </p>
          </div>
        </div>
      )}

      {/* ════════════ ABA: PACOTES ════════════ */}
      {tab === 'pacotes' && (
        <div className="space-y-6 sm:space-y-7">
          {/* Header da seção */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-700">Pacotes de atendimento</h3>
              {loadingPacotes
                ? <Loader2 className="h-3.5 w-3.5 animate-spin text-[#04c2fb]" />
                : pacotes.length > 0 && (
                    <span className="rounded-full bg-[#04c2fb]/10 px-2 py-0.5 text-[11px] font-medium text-[#04c2fb]">{pacotes.length}</span>
                  )
              }
            </div>
            <button
              onClick={() => setModalPacote({ modo: 'criar' })}
              className="flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:brightness-110 active:scale-95 shrink-0"
              style={{ background: 'linear-gradient(135deg, #0094c8 0%, #04c2fb 60%, #00d5f5 100%)' }}
            >
              <Plus className="h-3.5 w-3.5" /> Novo pacote
            </button>
          </div>

          {pacotes.length === 0 ? (
            /* Empty state */
            <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/40 flex flex-col items-center text-center gap-3 px-4 sm:px-6 py-10 sm:py-14">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#04c2fb]/10">
                <Package className="h-7 w-7 text-[#04c2fb]/60" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-700">Nenhum pacote criado</p>
                <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                  Crie pacotes para agrupar sessões e facilitar a configuração do plano de atendimento dos pacientes.
                </p>
              </div>
              <button
                onClick={() => setModalPacote({ modo: 'criar' })}
                className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold text-white mt-1 shadow-sm transition-all hover:brightness-110 active:scale-95"
                style={{ background: 'linear-gradient(135deg, #0094c8 0%, #04c2fb 60%, #00d5f5 100%)' }}
              >
                <Plus className="h-3.5 w-3.5" /> Criar primeiro pacote
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {[...pacotes].sort((a, b) => (b.sistema ? 1 : 0) - (a.sistema ? 1 : 0)).map(pacote => (
                <div
                  key={pacote.id}
                  className={cn(
                    'rounded-xl border bg-card shadow-sm hover:shadow-md transition-all cursor-pointer group',
                    !pacote.ativo && 'opacity-60',
                  )}
                  onClick={() => setModalPacote({ modo: 'editar', pacote })}
                >
                  <div className="p-4 sm:p-5 space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-semibold text-slate-800 truncate">{pacote.nome}</h4>
                          {pacote.sistema && (
                            <span className="shrink-0 rounded-full bg-violet-100 border border-violet-200 px-2 py-0.5 text-[10px] font-semibold text-violet-600 flex items-center gap-1">
                              <Lock className="h-2.5 w-2.5" /> Padrão
                            </span>
                          )}
                          <span className={cn(
                            'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium',
                            pacote.ativo
                              ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                              : 'bg-gray-100 text-gray-500 border border-gray-200',
                          )}>
                            {pacote.ativo ? 'Ativo' : 'Inativo'}
                          </span>
                        </div>
                        {pacote.descricao && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{pacote.descricao}</p>
                        )}
                      </div>
                      {!pacote.sistema && (
                        <button
                          onClick={e => { e.stopPropagation(); setExcluindoPacote(pacote) }}
                          title="Remover"
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-500 transition-colors shrink-0"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Valor */}
                    {pacote.sistema ? (
                      <p className="text-base font-bold text-slate-800">R$ 0,00</p>
                    ) : pacote.valor ? (
                      <p className="text-base font-bold text-slate-800">
                        R$ {pacote.valor}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">Valor não definido</p>
                    )}

                    {/* Atendimentos incluídos */}
                    {(() => {
                      const incluidos = pacote.tipos.filter(t => t.incluido)
                      return (
                        <div className="flex flex-wrap gap-1.5">
                          {incluidos.slice(0, 4).map(t => (
                            <span
                              key={t.tipo_sessao_id}
                              className="inline-flex items-center gap-1 rounded-md bg-[#04c2fb]/8 border border-[#04c2fb]/15 px-2 py-0.5 text-[11px] font-medium text-slate-600"
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-[#04c2fb] shrink-0" />
                              {getNomeTipo(t.tipo_sessao_id)}
                            </span>
                          ))}
                          {incluidos.length > 4 && (
                            <span className="inline-flex items-center rounded-md bg-muted/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                              +{incluidos.length - 4}
                            </span>
                          )}
                          {incluidos.length === 0 && (
                            <span className="text-[11px] text-muted-foreground italic">Nenhum atendimento</span>
                          )}
                        </div>
                      )
                    })()}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Nota informativa */}
          <div className="rounded-xl bg-[#04c2fb]/5 border border-[#04c2fb]/20 px-3 sm:px-4 py-3 sm:py-3.5 flex items-start gap-3">
            <Info className="h-4 w-4 text-[#04c2fb] shrink-0 mt-0.5" />
            <p className="text-xs text-slate-600 leading-relaxed">
              Pacotes agrupam atendimentos com um valor fixo.
              Vincule um pacote ao{' '}
              <strong className="text-slate-700">plano de atendimento</strong> de cada paciente para facilitar a gestão financeira.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
