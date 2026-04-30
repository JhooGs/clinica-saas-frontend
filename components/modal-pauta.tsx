'use client'

import { useEffect, useCallback, useState, useRef, startTransition } from 'react'
import { NotebookPen, X, Check } from 'lucide-react'
import RichEditor from '@/components/editor/rich-editor'

/* ── Helpers ──────────────────────────────────────── */

export function chavePauta(id: number | string) {
  return `clinitra:pauta:${id}`
}

function jsonTemConteudo(raw: string | null): boolean {
  if (!raw) return false
  try {
    const str = JSON.stringify(JSON.parse(raw))
    return str.includes('"text"')
  } catch {
    return raw.trim().length > 0
  }
}

/* ── Tipo genérico para o atendimento ─────────────── */

export type PautaAtendimento = {
  id: number | string
  nome: string
  horario: string
  tipo: string
}

/* ── Modal ────────────────────────────────────────── */

export function ModalPauta({
  atendimento,
  onFechar,
  onPautaSalva,
}: {
  atendimento: PautaAtendimento
  onFechar: () => void
  onPautaSalva: (atendId: number | string, temConteudo: boolean) => void
}) {
  const [conteudo, setConteudo] = useState<Record<string, unknown> | null>(null)
  const [salvo, setSalvo] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const raw = localStorage.getItem(chavePauta(atendimento.id))
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Record<string, unknown>
        startTransition(() => setConteudo(parsed))
      } catch {
        // pauta em formato texto antigo — ignora
      }
    }
  }, [atendimento.id])

  function handleFechar() {
    if (timerRef.current) clearTimeout(timerRef.current)
    onFechar()
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') handleFechar()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const handleChange = useCallback((json: Record<string, unknown>) => {
    setConteudo(json)
    setSalvo(false)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      const raw = JSON.stringify(json)
      const temConteudo = jsonTemConteudo(raw)
      if (temConteudo) {
        localStorage.setItem(chavePauta(atendimento.id), raw)
      } else {
        localStorage.removeItem(chavePauta(atendimento.id))
      }
      onPautaSalva(atendimento.id, temConteudo)
      setSalvo(true)
    }, 800)
  }, [atendimento.id, onPautaSalva])

  const temConteudo = conteudo !== null && jsonTemConteudo(JSON.stringify(conteudo))

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={e => { if (e.target === e.currentTarget) handleFechar() }}
    >
      <div
        className="w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl border border-white/30 shadow-2xl flex flex-col max-h-[90vh] sm:max-h-[80vh]"
        style={{ backdropFilter: 'blur(20px)', backgroundColor: 'rgba(255,255,255,0.97)' }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-5 border-b shrink-0">
          <div className="flex items-start gap-3 min-w-0">
            <div className="rounded-lg p-2 bg-[#04c2fb]/10 shrink-0 mt-0.5">
              <NotebookPen className="h-4 w-4 text-[#04c2fb]" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-tight">Pauta do atendimento</p>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{atendimento.nome}</p>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <span className="inline-flex items-center rounded-full bg-[#04c2fb]/8 border border-[#04c2fb]/20 px-2 py-0.5 text-[10px] font-medium text-[#04c2fb]">
                  {atendimento.tipo}
                </span>
                <span className="text-[10px] text-muted-foreground">{atendimento.horario}</span>
              </div>
            </div>
          </div>
          <button
            onClick={handleFechar}
            className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 flex-1 overflow-y-auto">
          <RichEditor
            key={String(atendimento.id)}
            value={conteudo}
            onChange={handleChange}
            placeholder="Objetivos, ideias de atividades, materiais — organize o atendimento antes de começar..."
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-t bg-muted/20 shrink-0">
          <div className="flex items-center gap-1.5">
            {salvo ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-xs text-emerald-600 font-medium">Salvo</span>
              </>
            ) : (
              <span className="text-xs text-muted-foreground/60">
                {temConteudo ? 'Salvando...' : 'Nenhuma pauta ainda'}
              </span>
            )}
          </div>
          <button
            onClick={handleFechar}
            className="rounded-lg px-4 py-1.5 text-xs font-medium text-white transition-colors hover:brightness-110"
            style={{ background: 'linear-gradient(135deg, #0094c8 0%, #04c2fb 60%, #00d5f5 100%)' }}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
