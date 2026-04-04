'use client'

import { useState, useEffect, useRef, useCallback, startTransition } from 'react'
import { NotebookPen, X, Check } from 'lucide-react'

/* ── Helpers ──────────────────────────────────────── */

export function chavePauta(id: number | string) {
  return `clinitra:pauta:${id}`
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
  onPautaSalva: (atendId: number | string, texto: string) => void
}) {
  const [texto, setTexto] = useState('')
  const [salvo, setSalvo] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const raw = localStorage.getItem(chavePauta(atendimento.id))
    if (raw) startTransition(() => setTexto(raw))
    setTimeout(() => textareaRef.current?.focus(), 50)
  }, [atendimento.id])

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [texto])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onFechar()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onFechar])

  const salvarComDebounce = useCallback((novoTexto: string) => {
    setSalvo(false)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      localStorage.setItem(chavePauta(atendimento.id), novoTexto)
      onPautaSalva(atendimento.id, novoTexto)
      setSalvo(true)
    }, 1000)
  }, [atendimento.id, onPautaSalva])

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setTexto(e.target.value)
    salvarComDebounce(e.target.value)
  }

  function handleFechar() {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (texto.trim()) {
      localStorage.setItem(chavePauta(atendimento.id), texto)
      onPautaSalva(atendimento.id, texto)
    } else {
      localStorage.removeItem(chavePauta(atendimento.id))
      onPautaSalva(atendimento.id, '')
    }
    onFechar()
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={e => { if (e.target === e.currentTarget) handleFechar() }}
    >
      <div
        className="w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl border border-white/30 shadow-2xl flex flex-col max-h-[85vh]"
        style={{ backdropFilter: 'blur(20px)', backgroundColor: 'rgba(255,255,255,0.97)' }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-5 border-b shrink-0">
          <div className="flex items-start gap-3 min-w-0">
            <div className="rounded-lg p-2 bg-[#04c2fb]/10 shrink-0 mt-0.5">
              <NotebookPen className="h-4 w-4 text-[#04c2fb]" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-tight">Pauta da sessão</p>
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
        <div className="p-5 flex-1 overflow-y-auto">
          <textarea
            ref={textareaRef}
            value={texto}
            onChange={handleChange}
            placeholder="Escreva objetivos, ideias de atividades ou materiais para esta sessão..."
            className="w-full resize-none bg-transparent text-sm text-gray-800 placeholder:text-muted-foreground/60 focus:outline-none leading-relaxed min-h-[160px]"
            style={{ overflow: 'hidden' }}
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
                {texto.trim() ? 'Salvando...' : 'Nenhuma pauta ainda'}
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
