'use client'

import { useRef, useState } from 'react'
import { Loader2, MessageSquare, Pencil, Plus, Save, Star, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  useWhatsAppTemplates,
  useCriarWhatsAppTemplate,
  useAtualizarWhatsAppTemplate,
  useDeletarWhatsAppTemplate,
} from '@/hooks/use-whatsapp-templates'
import type { WhatsAppTemplate } from '@/types'

const GRADIENT = 'linear-gradient(135deg, #0094c8 0%, #04c2fb 60%, #00d5f5 100%)'

const VARIAVEIS_WA = [
  { key: '{nome}',             label: 'Nome do paciente' },
  { key: '{responsavel}',      label: 'Responsável (menores)' },
  { key: '{data}',             label: 'Data' },
  { key: '{horario}',          label: 'Horário' },
  { key: '{tipo}',             label: 'Tipo de atendimento' },
  { key: '{link_confirmacao}', label: 'Link de confirmação' },
]

interface EditorState {
  id: string | null
  nome: string
  conteudo: string
  padrao: boolean
}

const EDITOR_VAZIO: EditorState = { id: null, nome: '', conteudo: '', padrao: false }

export function WhatsAppTemplateEditor() {
  const { data, isLoading } = useWhatsAppTemplates()
  const criar = useCriarWhatsAppTemplate()
  const atualizar = useAtualizarWhatsAppTemplate()
  const deletar = useDeletarWhatsAppTemplate()

  const templates = data?.items ?? []
  const [editor, setEditor] = useState<EditorState>(EDITOR_VAZIO)
  const [confirmandoDelete, setConfirmandoDelete] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const isSaving = criar.isPending || atualizar.isPending

  function selecionarTemplate(t: WhatsAppTemplate) {
    setEditor({ id: t.id, nome: t.nome, conteudo: t.conteudo, padrao: t.padrao })
    setConfirmandoDelete(false)
  }

  function novoTemplate() {
    setEditor(EDITOR_VAZIO)
    setConfirmandoDelete(false)
  }

  function inserirVariavel(variavel: string) {
    const ta = textareaRef.current
    const conteudoAtual = editor.conteudo
    if (!ta) {
      setEditor(prev => ({ ...prev, conteudo: conteudoAtual + variavel }))
      return
    }
    const ini = ta.selectionStart
    const fim = ta.selectionEnd
    const novo = conteudoAtual.slice(0, ini) + variavel + conteudoAtual.slice(fim)
    setEditor(prev => ({ ...prev, conteudo: novo }))
    requestAnimationFrame(() => {
      ta.focus()
      ta.setSelectionRange(ini + variavel.length, ini + variavel.length)
    })
  }

  async function salvar() {
    if (!editor.nome.trim()) { toast.error('Dê um nome ao template'); return }
    if (!editor.conteudo.trim()) { toast.error('A mensagem não pode estar vazia'); return }

    if (editor.id) {
      atualizar.mutate(
        { id: editor.id, payload: { nome: editor.nome, conteudo: editor.conteudo, padrao: editor.padrao } },
        { onSuccess: (t) => setEditor({ id: t.id, nome: t.nome, conteudo: t.conteudo, padrao: t.padrao }) },
      )
    } else {
      criar.mutate(
        { nome: editor.nome, conteudo: editor.conteudo, padrao: editor.padrao },
        { onSuccess: (t) => setEditor({ id: t.id, nome: t.nome, conteudo: t.conteudo, padrao: t.padrao }) },
      )
    }
  }

  function confirmarDelete() {
    if (!editor.id) return
    if (!confirmandoDelete) { setConfirmandoDelete(true); return }
    deletar.mutate(editor.id, {
      onSuccess: () => { setEditor(EDITOR_VAZIO); setConfirmandoDelete(false) },
    })
  }

  const previewMensagem = editor.conteudo
    .replace('{nome}', 'Maria Silva')
    .replace('{responsavel}', 'Ana Silva')
    .replace('{data}', '25/04/2026')
    .replace('{horario}', '14:30')
    .replace('{tipo}', 'Atendimento')
    .replace('{link_confirmacao}', 'https://app.clinitra.com.br/confirmar-agendamento/...')

  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3 p-4 sm:p-5 border-b bg-gradient-to-r from-green-50 to-emerald-50">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white border shadow-sm">
          <MessageSquare className="h-5 w-5 text-green-500" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-slate-800">Templates de Mensagem WhatsApp</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isLoading ? 'Carregando...' : `${templates.length} template${templates.length !== 1 ? 's' : ''} criado${templates.length !== 1 ? 's' : ''}`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x">
        {/* Lista de templates */}
        <div className="sm:col-span-2 p-3 flex flex-col gap-1 min-h-[180px]">
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : templates.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 py-6 text-center">
              <div className="h-10 w-10 rounded-full flex items-center justify-center" style={{ background: GRADIENT }}>
                <MessageSquare className="h-5 w-5 text-white" />
              </div>
              <p className="text-xs text-muted-foreground">Nenhum template criado ainda</p>
              <button
                type="button"
                onClick={novoTemplate}
                className="mt-1 inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:brightness-110 active:scale-95 transition-all"
                style={{ background: GRADIENT }}
              >
                <Plus className="h-3.5 w-3.5" />
                Criar primeiro template
              </button>
            </div>
          ) : (
            <>
              {templates.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => selecionarTemplate(t)}
                  className={cn(
                    'w-full text-left rounded-xl border-2 px-3 py-2.5 transition-all hover:border-[#04c2fb]/40 hover:bg-[#04c2fb]/3',
                    editor.id === t.id
                      ? 'border-[#04c2fb] bg-[#04c2fb]/5'
                      : 'border-transparent bg-slate-50',
                  )}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    {t.padrao && (
                      <Star className="h-3 w-3 text-amber-400 fill-amber-400 shrink-0" />
                    )}
                    <span className="text-xs font-semibold text-slate-700 truncate">{t.nome}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{t.conteudo}</p>
                </button>
              ))}
              <button
                type="button"
                onClick={novoTemplate}
                className="mt-1 w-full flex items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-slate-200 py-2 text-xs font-medium text-slate-400 hover:border-[#04c2fb]/40 hover:text-[#04c2fb] transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Novo template
              </button>
            </>
          )}
        </div>

        {/* Editor */}
        <div className="sm:col-span-3 p-4 sm:p-5 space-y-3">
          <div className="flex items-center gap-2">
            {editor.id ? (
              <Pencil className="h-3.5 w-3.5 text-[#04c2fb] shrink-0" />
            ) : (
              <Plus className="h-3.5 w-3.5 text-[#04c2fb] shrink-0" />
            )}
            <span className="text-xs font-semibold text-slate-600">
              {editor.id ? 'Editar template' : 'Novo template'}
            </span>
          </div>

          {/* Nome + Padrão */}
          <div className="flex gap-2">
            <input
              type="text"
              value={editor.nome}
              onChange={(e) => setEditor(prev => ({ ...prev, nome: e.target.value }))}
              placeholder="Nome do template (ex: Confirmação de presença)"
              maxLength={100}
              className="flex-1 min-w-0 rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#04c2fb]/30 focus:border-[#04c2fb]/50 transition-colors"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none w-fit">
            <input
              type="checkbox"
              checked={editor.padrao}
              onChange={(e) => setEditor(prev => ({ ...prev, padrao: e.target.checked }))}
              className="h-3.5 w-3.5 accent-amber-500 cursor-pointer"
            />
            <span className="text-xs text-slate-600 flex items-center gap-1">
              <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
              Definir como template padrão
            </span>
          </label>

          {/* Variáveis */}
          <div>
            <p className="text-[11px] font-medium text-slate-500 mb-1.5">Variáveis — clique para inserir no texto:</p>
            <div className="flex flex-wrap gap-1.5">
              {VARIAVEIS_WA.map((v) => (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => inserirVariavel(v.key)}
                  title={v.label}
                  className="inline-flex items-center rounded-full border border-[#04c2fb]/30 bg-[#04c2fb]/5 px-2.5 py-1 text-[11px] font-medium text-[#04c2fb] hover:bg-[#04c2fb]/15 transition-colors"
                >
                  {v.key}
                </button>
              ))}
            </div>
          </div>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={editor.conteudo}
            onChange={(e) => setEditor(prev => ({ ...prev, conteudo: e.target.value }))}
            rows={5}
            placeholder="Digite a mensagem aqui... Use as variáveis acima para personalizar."
            className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#04c2fb]/30 focus:border-[#04c2fb]/50 transition-colors"
          />

          {/* Preview */}
          {editor.conteudo && (
            <details className="group">
              <summary className="text-xs font-medium text-slate-500 cursor-pointer hover:text-slate-700 select-none list-none flex items-center gap-1">
                <span className="transition-transform group-open:rotate-90 inline-block">▶</span>
                Preview da mensagem
              </summary>
              <div className="mt-2 rounded-lg border border-green-100 bg-green-50 p-3 text-xs text-slate-700 whitespace-pre-wrap font-mono">
                {previewMensagem}
              </div>
            </details>
          )}

          {/* Ações */}
          <div className="flex items-center justify-between pt-1">
            {editor.id ? (
              <button
                type="button"
                onClick={confirmarDelete}
                disabled={deletar.isPending}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                  confirmandoDelete
                    ? 'border-red-300 bg-red-50 text-red-700 hover:bg-red-100'
                    : 'border-slate-200 text-slate-500 hover:border-red-200 hover:text-red-600',
                )}
              >
                {deletar.isPending
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <Trash2 className="h-3.5 w-3.5" />
                }
                {confirmandoDelete ? 'Confirmar exclusão' : 'Excluir'}
              </button>
            ) : <div />}

            <button
              type="button"
              onClick={salvar}
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:brightness-110 active:scale-95 transition-all disabled:opacity-60"
              style={{ background: GRADIENT }}
            >
              {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Salvar template
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
