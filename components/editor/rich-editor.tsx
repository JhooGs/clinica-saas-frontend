'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Highlight from '@tiptap/extension-highlight'
import { useState, useCallback, useRef } from 'react'
import { cn } from '@/lib/utils'
import {
  Bold, Italic, UnderlineIcon, Strikethrough,
  List, ListOrdered, AlignLeft, AlignCenter, AlignRight,
  Link2, Image as ImageIcon, Highlighter, Undo, Redo,
  Paperclip, X,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export type UploadedFile = {
  nome: string
  url: string
  tipo: string
  tamanho: number
}

type RichEditorProps = {
  value?: Record<string, unknown> | null
  onChange?: (json: Record<string, unknown>) => void
  onUploadFile?: (file: File) => Promise<UploadedFile>
  uploadedFiles?: UploadedFile[]
  onRemoveFile?: (url: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

// ---------------------------------------------------------------------------
// Botão da toolbar
// ---------------------------------------------------------------------------

function ToolbarBtn({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void
  active?: boolean
  disabled?: boolean
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onMouseDown={e => { e.preventDefault(); onClick() }}
      disabled={disabled}
      title={title}
      className={cn(
        'rounded p-1.5 transition-colors',
        active
          ? 'bg-[#04c2fb]/15 text-[#04c2fb]'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        disabled && 'opacity-30 cursor-not-allowed pointer-events-none',
      )}
    >
      {children}
    </button>
  )
}

function Divider() {
  return <div className="h-5 w-px bg-border mx-0.5" />
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export default function RichEditor({
  value,
  onChange,
  onUploadFile,
  uploadedFiles = [],
  onRemoveFile,
  placeholder = 'Escreva as notas do atendimento...',
  disabled = false,
  className,
}: RichEditorProps) {
  const imageInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef  = useRef<HTMLInputElement>(null)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Underline,
      Highlight.configure({ multicolor: false }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: 'text-[#04c2fb] underline' } }),
      Placeholder.configure({ placeholder }),
    ],
    content: value ?? undefined,
    editable: !disabled,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getJSON() as Record<string, unknown>)
    },
  })

  // --- Inserir link ---
  const handleLink = useCallback(() => {
    if (!editor) return
    const prev = editor.getAttributes('link').href as string | undefined
    const url  = window.prompt('URL do link:', prev ?? 'https://')
    if (!url) return
    if (url === '') {
      editor.chain().focus().unsetLink().run()
    } else {
      editor.chain().focus().setLink({ href: url }).run()
    }
  }, [editor])

  if (!editor) return null

  const imagens  = uploadedFiles.filter(f => f.tipo.startsWith('image/'))
  const arquivos = uploadedFiles.filter(f => !f.tipo.startsWith('image/'))

  return (
    <div className={cn('flex flex-col rounded-xl border bg-background overflow-hidden', className)}>

      {/* Toolbar */}
      <div className={cn(
        'flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b bg-muted/30',
        disabled && 'opacity-40 pointer-events-none'
      )}>

        {/* Histórico */}
        <ToolbarBtn title="Desfazer" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>
          <Undo className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn title="Refazer" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>
          <Redo className="h-4 w-4" />
        </ToolbarBtn>

        <Divider />

        {/* Formatação de texto */}
        <ToolbarBtn title="Negrito" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn title="Itálico" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn title="Sublinhado" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <UnderlineIcon className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn title="Tachado" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}>
          <Strikethrough className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn title="Destaque" active={editor.isActive('highlight')} onClick={() => editor.chain().focus().toggleHighlight().run()}>
          <Highlighter className="h-4 w-4" />
        </ToolbarBtn>

        <Divider />

        {/* Listas */}
        <ToolbarBtn title="Lista com marcadores" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn title="Lista numerada" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered className="h-4 w-4" />
        </ToolbarBtn>

        <Divider />

        {/* Alinhamento */}
        <ToolbarBtn title="Alinhar à esquerda" active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()}>
          <AlignLeft className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn title="Centralizar" active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()}>
          <AlignCenter className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn title="Alinhar à direita" active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()}>
          <AlignRight className="h-4 w-4" />
        </ToolbarBtn>

        <Divider />

        {/* Link */}
        <ToolbarBtn title="Inserir link" active={editor.isActive('link')} onClick={handleLink}>
          <Link2 className="h-4 w-4" />
        </ToolbarBtn>

        {/* Imagem — só aparece se handler fornecido */}
        {onUploadFile && (
          <ToolbarBtn title="Inserir imagem" onClick={() => imageInputRef.current?.click()}>
            <ImageIcon className="h-4 w-4" />
          </ToolbarBtn>
        )}

        {/* Anexo — só aparece se handler fornecido */}
        {onUploadFile && (
          <ToolbarBtn title="Anexar arquivo" onClick={() => fileInputRef.current?.click()}>
            <Paperclip className="h-4 w-4" />
          </ToolbarBtn>
        )}
      </div>

      {/* Área de edição */}
      <EditorContent
        editor={editor}
        className={cn(
          'prose prose-sm max-w-none px-4 py-3 min-h-[200px] focus-within:outline-none',
          '[&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[180px]',
          '[&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-5 [&_.ProseMirror_ul]:my-2',
          '[&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-5 [&_.ProseMirror_ol]:my-2',
          '[&_.ProseMirror_li]:my-0.5',
          '[&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]',
          '[&_.ProseMirror_p.is-editor-empty:first-child::before]:text-muted-foreground',
          '[&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left',
          '[&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none',
          '[&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0',
          disabled && 'opacity-60 cursor-not-allowed pointer-events-none',
        )}
      />

      {/* Miniaturas de imagens */}
      {imagens.length > 0 && (
        <div className="border-t px-4 py-2 flex flex-wrap gap-2 bg-muted/20">
          {imagens.map(img => (
            <div key={img.url} className="relative group">
              <button
                type="button"
                onClick={() => setLightboxUrl(img.url)}
                title={img.nome}
                className="block h-16 w-16 rounded-lg overflow-hidden border border-border hover:ring-2 hover:ring-[#04c2fb]/50 transition-all"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt={img.nome}
                  className="h-full w-full object-cover"
                />
              </button>
              {onRemoveFile && (
                <button
                  type="button"
                  onClick={() => onRemoveFile(img.url)}
                  title="Remover imagem"
                  className="absolute -top-1.5 -right-1.5 hidden group-hover:flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white shadow-sm hover:bg-red-600 transition-colors"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Lista de arquivos anexados */}
      {arquivos.length > 0 && (
        <div className="border-t px-4 py-2 flex flex-wrap gap-2 bg-muted/20">
          {arquivos.map(f => (
            <div
              key={f.url}
              className="flex items-center gap-1.5 rounded-lg border bg-background px-2.5 py-1 text-xs text-muted-foreground"
            >
              <Paperclip className="h-3 w-3 shrink-0" />
              <a href={f.url} target="_blank" rel="noopener noreferrer" className="hover:text-foreground hover:underline max-w-[180px] truncate">
                {f.nome}
              </a>
              <span className="text-[10px] text-muted-foreground/60">
                ({(f.tamanho / 1024).toFixed(0)} KB)
              </span>
              {onRemoveFile && (
                <button
                  type="button"
                  onClick={() => onRemoveFile(f.url)}
                  className="ml-0.5 text-muted-foreground hover:text-red-500 transition-colors"
                  title="Remover anexo"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Inputs hidden para upload */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async e => {
          const file = e.target.files?.[0]
          if (file && onUploadFile) await onUploadFile(file)
          e.target.value = ''
        }}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.mp3,.mp4,.txt"
        className="hidden"
        onChange={async e => {
          const file = e.target.files?.[0]
          if (file && onUploadFile) await onUploadFile(file)
          e.target.value = ''
        }}
      />

      {/* Lightbox */}
      <Dialog open={!!lightboxUrl} onOpenChange={() => setLightboxUrl(null)}>
        <DialogContent className="max-w-3xl p-2 bg-black/90 border-0">
          <VisuallyHidden>
            <DialogTitle>Visualizar imagem</DialogTitle>
          </VisuallyHidden>
          {lightboxUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={lightboxUrl}
              alt="Visualizar imagem"
              className="max-h-[80vh] w-auto mx-auto rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
