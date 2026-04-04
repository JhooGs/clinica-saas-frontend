import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Extrai texto puro de um documento TipTap JSON, com limite de caracteres. */
export function extractTiptapText(json: Record<string, unknown> | null, maxChars = 200): string {
  if (!json) return ''
  const parts: string[] = []
  function walk(node: Record<string, unknown>) {
    if (node.type === 'text' && typeof node.text === 'string') {
      parts.push(node.text)
    }
    if (Array.isArray(node.content)) {
      ;(node.content as Record<string, unknown>[]).forEach(walk)
    }
  }
  walk(json)
  const full = parts.join(' ').replace(/\s+/g, ' ').trim()
  return full.length > maxChars ? full.slice(0, maxChars).trimEnd() + '…' : full
}

/** Retorna a próxima hora cheia (HH:00) a partir de agora. Ex: 22:32 → '23:00', 14:00 → '14:00' */
export function proximaHoraCheia(): string {
  const d = new Date()
  const min = d.getMinutes()
  let h = d.getHours()
  if (min > 0) h = (h + 1) % 24
  return `${String(h).padStart(2, '0')}:00`
}

/** Retorna a data de hoje no formato YYYY-MM-DD (sem desvio de timezone). */
export function hoje(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
