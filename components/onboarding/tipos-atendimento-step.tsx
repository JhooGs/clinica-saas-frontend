'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Loader2, Plus, Stethoscope } from 'lucide-react'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { cn } from '@/lib/utils'

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface SelectedTipo {
  id: string
  nome: string
  valor_padrao: string | null
}

interface TipoAtendimentoRead {
  id: string
  nome: string
  padrao: boolean
  valor_padrao: string | null
}

interface TiposAtendimentoStepProps {
  onSuccess: (tipos: SelectedTipo[]) => void
}

// ── Componente ────────────────────────────────────────────────────────────────

export function TiposAtendimentoStep({ onSuccess }: TiposAtendimentoStepProps) {
  const queryClient = useQueryClient()
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())
  const [novoNome, setNovoNome] = useState('')
  const [mostrarInput, setMostrarInput] = useState(false)
  const [criando, setCriando] = useState(false)

  const { data, isLoading } = useQuery<{ items: TipoAtendimentoRead[] }>({
    queryKey: ['onboarding', 'tipos-atendimento'],
    queryFn: () => apiFetch('/api/v1/planos/tipos-atendimento'),
    staleTime: 60 * 1000,
  })

  const tipos = data?.items ?? []

  function toggleTipo(id: string) {
    setSelecionados((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleCriarTipo() {
    const nome = novoNome.trim()
    if (!nome) return
    setCriando(true)
    try {
      const novo = await apiFetch<TipoAtendimentoRead>('/api/v1/planos/tipos-atendimento', {
        method: 'POST',
        body: JSON.stringify({ nome }),
      })
      await queryClient.invalidateQueries({ queryKey: ['onboarding', 'tipos-atendimento'] })
      setSelecionados((prev) => new Set([...prev, novo.id]))
      toast.success(`"${novo.nome}" adicionado`)
      setNovoNome('')
      setMostrarInput(false)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Não foi possível criar o tipo.'
      toast.error('Erro ao criar tipo', { description: msg })
    } finally {
      setCriando(false)
    }
  }

  function handleContinuar() {
    const tiposSelecionados = tipos
      .filter((t) => selecionados.has(t.id))
      .map((t) => ({ id: t.id, nome: t.nome, valor_padrao: t.valor_padrao }))
    onSuccess(tiposSelecionados)
  }

  return (
    <div className="space-y-5">
      {/* Dica */}
      <div className="flex items-start gap-2 rounded-xl bg-[#04c2fb]/5 border border-[#04c2fb]/20 px-4 py-3">
        <Stethoscope className="h-4 w-4 text-[#04c2fb] mt-0.5 shrink-0" />
        <p className="text-xs text-slate-600 leading-relaxed">
          Selecione ao menos um tipo de atendimento para incluir no seu plano.{' '}
          <span className="font-medium text-slate-700">Você pode adicionar, remover e ajustar na aba Planos depois.</span>
        </p>
      </div>

      {/* Lista de tipos */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {tipos.map((tipo) => {
            const ativo = selecionados.has(tipo.id)
            return (
              <button
                key={tipo.id}
                type="button"
                onClick={() => toggleTipo(tipo.id)}
                className={cn(
                  'flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all',
                  ativo
                    ? 'border-[#04c2fb] bg-[#04c2fb]/5'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50',
                )}
              >
                {/* Checkbox visual */}
                <span
                  className={cn(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all',
                    ativo
                      ? 'border-[#04c2fb] bg-[#04c2fb]'
                      : 'border-slate-300 bg-white',
                  )}
                >
                  {ativo && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                </span>
                <div className="min-w-0">
                  <p className={cn('text-sm font-medium truncate', ativo ? 'text-[#0094c8]' : 'text-slate-700')}>
                    {tipo.nome}
                  </p>
                  {tipo.valor_padrao && (
                    <p className="text-xs text-slate-400 mt-0.5">R$ {tipo.valor_padrao}</p>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Adicionar tipo personalizado */}
      {!mostrarInput ? (
        <button
          type="button"
          onClick={() => setMostrarInput(true)}
          className="flex items-center gap-2 text-sm font-medium text-[#04c2fb] hover:text-[#0094c8] transition-colors"
        >
          <Plus className="h-4 w-4" />
          Adicionar tipo personalizado
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={novoNome}
            onChange={(e) => setNovoNome(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCriarTipo()}
            placeholder="Ex: Avaliação Psicológica, Orientação..."
            className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#04c2fb]/30 focus:border-[#04c2fb]"
            maxLength={100}
            autoFocus
          />
          <button
            type="button"
            onClick={handleCriarTipo}
            disabled={!novoNome.trim() || criando}
            className="flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 transition-all hover:brightness-110"
            style={{ background: 'linear-gradient(135deg, #0094c8 0%, #04c2fb 60%, #00d5f5 100%)' }}
          >
            {criando ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Adicionar'}
          </button>
          <button
            type="button"
            onClick={() => { setMostrarInput(false); setNovoNome('') }}
            className="text-sm text-slate-400 hover:text-slate-600 px-2"
          >
            Cancelar
          </button>
        </div>
      )}

      {/* Botão continuar */}
      <button
        type="button"
        disabled={selecionados.size === 0}
        onClick={handleContinuar}
        className="w-full flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ background: 'linear-gradient(135deg, #0094c8 0%, #04c2fb 60%, #00d5f5 100%)' }}
      >
        Continuar com {selecionados.size === 0 ? '0' : selecionados.size}{' '}
        {selecionados.size === 1 ? 'tipo selecionado' : 'tipos selecionados'}
      </button>
    </div>
  )
}
