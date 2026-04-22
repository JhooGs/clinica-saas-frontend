'use client'

import { useState } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { SelectedTipo } from './tipos-atendimento-step'

interface CriarPlanoFormProps {
  onSuccess: () => void
  tiposSelecionados: SelectedTipo[]
}

interface PacoteRead {
  id: string
  nome: string
  valor: string | null
}

export function CriarPlanoForm({ onSuccess, tiposSelecionados }: CriarPlanoFormProps) {
  const [nome, setNome] = useState('')
  const [valor, setValor] = useState('')
  const [loading, setLoading] = useState(false)
  const [nomeErro, setNomeErro] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setNomeErro('')

    if (!nome.trim()) {
      setNomeErro('Nome do pacote é obrigatório')
      return
    }

    const tipos = tiposSelecionados.map((t) => ({
      tipo_atendimento_id: t.id,
      incluido: true,
      valor: t.valor_padrao ?? null,
    }))

    setLoading(true)
    try {
      await apiFetch<PacoteRead>('/api/v1/planos/pacotes', {
        method: 'POST',
        body: JSON.stringify({
          nome: nome.trim(),
          valor: valor.trim() || null,
          tipos,
          ativo: true,
        }),
      })
      toast.success('Pacote criado com sucesso')
      onSuccess()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Não foi possível criar o pacote.'
      toast.error('Erro ao criar pacote', { description: msg })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Tipos incluídos */}
      {tiposSelecionados.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Tipos de atendimento incluídos
          </p>
          <div className="flex flex-wrap gap-2">
            {tiposSelecionados.map((t) => (
              <span
                key={t.id}
                className="flex items-center gap-1.5 rounded-lg bg-[#04c2fb]/8 border border-[#04c2fb]/20 px-3 py-1.5 text-xs font-medium text-[#0094c8]"
              >
                <Check className="h-3 w-3 shrink-0" strokeWidth={3} />
                {t.nome}
                {t.valor_padrao && (
                  <span className="text-slate-400 font-normal">· R$ {t.valor_padrao}</span>
                )}
              </span>
            ))}
          </div>
          <p className="text-xs text-slate-400">
            Você pode adicionar ou remover tipos e ajustar valores na aba <span className="font-medium text-slate-500">Planos</span>.
          </p>
        </div>
      )}

      {/* Nome */}
      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-slate-700">
          Nome do pacote <span className="text-[#04c2fb]">*</span>
        </label>
        <input
          type="text"
          value={nome}
          onChange={(e) => { setNome(e.target.value); setNomeErro('') }}
          placeholder="Ex: Psicoterapia Individual, Mensal Básico..."
          className={cn(
            'w-full rounded-xl border px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition-all',
            'focus:ring-2 focus:ring-[#04c2fb]/30 focus:border-[#04c2fb]',
            nomeErro ? 'border-red-400 bg-red-50' : 'border-slate-200 bg-white hover:border-slate-300',
          )}
          maxLength={200}
          autoFocus
        />
        {nomeErro && <p className="text-xs text-red-500">{nomeErro}</p>}
      </div>

      {/* Valor */}
      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-slate-700">
          Valor padrão do pacote <span className="text-xs font-normal text-slate-400">(opcional)</span>
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">R$</span>
          <input
            type="text"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder="200,00"
            className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition-all focus:ring-2 focus:ring-[#04c2fb]/30 focus:border-[#04c2fb] hover:border-slate-300"
            maxLength={20}
          />
        </div>
        <p className="text-xs text-slate-400">Valor cobrado por sessão. Pode ser ajustado por tipo de atendimento depois.</p>
      </div>

      {/* Botão */}
      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
        style={{ background: 'linear-gradient(135deg, #0094c8 0%, #04c2fb 60%, #00d5f5 100%)' }}
      >
        {loading ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Criando pacote...</>
        ) : (
          'Criar pacote e continuar'
        )}
      </button>
    </form>
  )
}
