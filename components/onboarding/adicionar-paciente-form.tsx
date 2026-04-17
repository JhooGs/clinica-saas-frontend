'use client'

import { useState } from 'react'
import { Loader2, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { cn } from '@/lib/utils'

interface AdicionarPacienteFormProps {
  onSuccess: () => void
}

interface PacienteRead {
  id: string
  nome: string
}

export function AdicionarPacienteForm({ onSuccess }: AdicionarPacienteFormProps) {
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [nomeErro, setNomeErro] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setNomeErro('')

    if (!nome.trim()) {
      setNomeErro('Nome do paciente é obrigatório')
      return
    }

    setLoading(true)
    try {
      await apiFetch<PacienteRead>('/api/v1/pacientes', {
        method: 'POST',
        body: JSON.stringify({
          nome: nome.trim(),
          telefone: telefone.trim() || null,
          email: email.trim() || null,
        }),
      })
      toast.success('Paciente adicionado com sucesso')
      onSuccess()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Não foi possível adicionar o paciente.'
      toast.error('Erro ao adicionar paciente', { description: msg })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Nome */}
      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-slate-700">
          Nome completo <span className="text-[#04c2fb]">*</span>
        </label>
        <input
          type="text"
          value={nome}
          onChange={(e) => { setNome(e.target.value); setNomeErro('') }}
          placeholder="Nome do seu primeiro paciente"
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

      {/* Telefone */}
      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-slate-700">
          Telefone <span className="text-xs font-normal text-slate-400">(opcional)</span>
        </label>
        <input
          type="tel"
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
          placeholder="(11) 99999-9999"
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition-all focus:ring-2 focus:ring-[#04c2fb]/30 focus:border-[#04c2fb] hover:border-slate-300"
          maxLength={20}
        />
      </div>

      {/* E-mail */}
      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-slate-700">
          E-mail <span className="text-xs font-normal text-slate-400">(opcional)</span>
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="paciente@email.com"
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition-all focus:ring-2 focus:ring-[#04c2fb]/30 focus:border-[#04c2fb] hover:border-slate-300"
          maxLength={200}
        />
      </div>

      {/* Dica */}
      <div className="flex items-start gap-2 rounded-xl bg-[#04c2fb]/5 border border-[#04c2fb]/20 px-4 py-3">
        <UserPlus className="h-4 w-4 text-[#04c2fb] mt-0.5 shrink-0" />
        <p className="text-xs text-slate-600 leading-relaxed">
          Você poderá completar o cadastro com CPF, data de nascimento, plano de atendimento e outras informações na aba <span className="font-medium text-slate-700">Pacientes</span> depois.
        </p>
      </div>

      {/* Botão */}
      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
        style={{ background: 'linear-gradient(135deg, #0094c8 0%, #04c2fb 60%, #00d5f5 100%)' }}
      >
        {loading ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Adicionando...</>
        ) : (
          'Adicionar e finalizar'
        )}
      </button>
    </form>
  )
}
