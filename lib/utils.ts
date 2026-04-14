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

/** Converte um documento TipTap JSON em HTML sanitizado, preservando formatação. */
export function tiptapToHtml(json: Record<string, unknown> | null): string {
  if (!json) return ''

  function esc(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  }

  function nodeToHtml(node: Record<string, unknown>): string {
    const type = node.type as string
    const attrs = (node.attrs ?? {}) as Record<string, unknown>
    const inner = Array.isArray(node.content)
      ? (node.content as Record<string, unknown>[]).map(nodeToHtml).join('')
      : ''

    switch (type) {
      case 'doc': return inner
      case 'paragraph': {
        const align = attrs.textAlign as string | undefined
        const style = align && align !== 'left' ? ` style="text-align:${align}"` : ''
        return `<p${style}>${inner || '<br>'}</p>`
      }
      case 'heading': {
        const lvl = (attrs.level as number) || 1
        const align = attrs.textAlign as string | undefined
        const style = align && align !== 'left' ? ` style="text-align:${align}"` : ''
        return `<h${lvl}${style}>${inner}</h${lvl}>`
      }
      case 'bulletList': return `<ul>${inner}</ul>`
      case 'orderedList': return `<ol>${inner}</ol>`
      case 'listItem': return `<li>${inner}</li>`
      case 'blockquote': return `<blockquote>${inner}</blockquote>`
      case 'codeBlock': return `<pre><code>${inner}</code></pre>`
      case 'hardBreak': return '<br>'
      case 'horizontalRule': return '<hr>'
      case 'text': {
        const marks = (node.marks ?? []) as Record<string, unknown>[]
        let html = esc(node.text as string)
        for (const mark of marks) {
          const mt = mark.type as string
          const ma = (mark.attrs ?? {}) as Record<string, unknown>
          switch (mt) {
            case 'bold': html = `<strong>${html}</strong>`; break
            case 'italic': html = `<em>${html}</em>`; break
            case 'underline': html = `<u>${html}</u>`; break
            case 'strike': html = `<s>${html}</s>`; break
            case 'highlight': html = `<mark>${html}</mark>`; break
            case 'code': html = `<code>${html}</code>`; break
            case 'link': {
              const href = esc(String(ma.href ?? ''))
              html = `<a href="${href}" target="_blank" rel="noopener noreferrer">${html}</a>`
              break
            }
          }
        }
        return html
      }
      default: return inner
    }
  }

  return nodeToHtml(json)
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
