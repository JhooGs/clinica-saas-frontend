'use client'

import { useState, useEffect, useRef, Suspense, startTransition } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Calendar, Clock, User, Users, FileText, Save, ExternalLink, CheckCircle2, XCircle, X, Link2, Trash2, Tag, ChevronDown, NotebookPen, Pencil } from 'lucide-react'
import { cn, hoje, tiptapToHtml } from '@/lib/utils'
import { DatePicker } from '@/components/ui/date-picker'
import { toast } from 'sonner'
import RichEditor, { type UploadedFile } from '@/components/editor/rich-editor'
import { uploadImagem, uploadArquivo, removerArquivo } from '@/lib/registro-storage'
import { useRegistroDraft } from '@/hooks/use-registro-draft'
import { ConfirmDiscard } from '@/components/confirm-discard'
import { ConfirmDelete } from '@/components/confirm-delete'
import { chavePauta } from '@/components/modal-pauta'
import { TIPOS_ATENDIMENTO } from '@/lib/tipos-atendimento'
import { useRegistro, useAtualizarRegistro, useCriarRegistro, useCriarRegistroGrupo, useExcluirRegistro } from '@/hooks/use-registros'
import { useAgendamento } from '@/hooks/use-agenda'
import type { Registro } from '@/types'
import { PageLoader } from '@/components/ui/page-loader'

// ---------------------------------------------------------------------------
// Dropdown elegante de tipo de atendimento
// ---------------------------------------------------------------------------

function TipoAtendimentoSelect({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  const [aberto, setAberto] = useState(false)
  const [indiceAtivo, setIndiceAtivo] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickFora(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAberto(false)
      }
    }
    document.addEventListener('mousedown', handleClickFora)
    return () => document.removeEventListener('mousedown', handleClickFora)
  }, [])

  useEffect(() => {
    const idx = (TIPOS_ATENDIMENTO as readonly string[]).indexOf(value)
    startTransition(() => setIndiceAtivo(Math.max(0, idx)))
  }, [value])

  function selecionar(tipo: string) {
    onChange(tipo)
    setAberto(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { setAberto(false); return }
    if (!aberto) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault(); setAberto(true); return
      }
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setIndiceAtivo(i => (i + 1) % TIPOS_ATENDIMENTO.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setIndiceAtivo(i => (i - 1 + TIPOS_ATENDIMENTO.length) % TIPOS_ATENDIMENTO.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      selecionar(TIPOS_ATENDIMENTO[indiceAtivo])
    }
  }

  return (
    <div className="relative" ref={containerRef} onKeyDown={handleKeyDown}>
      <button
        type="button"
        onClick={() => setAberto(prev => !prev)}
        className={cn(
          'w-full flex items-center justify-between gap-2 rounded-lg border bg-background px-3 py-2 text-sm transition-all focus:outline-none',
          aberto
            ? 'border-[#04c2fb]/60 ring-2 ring-[#04c2fb]/40'
            : 'border-gray-200 hover:border-gray-300 focus:ring-2 focus:ring-[#04c2fb]/40',
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Tag className="h-3.5 w-3.5 text-[#04c2fb] shrink-0" />
          <span className="font-medium text-gray-800 truncate">{value}</span>
        </div>
        <ChevronDown className={cn(
          'h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200',
          aberto && 'rotate-180',
        )} />
      </button>

      {aberto && (
        <div
          className="absolute left-0 right-0 top-full z-20 mt-1 rounded-lg border border-gray-200 shadow-lg overflow-hidden"
          style={{ backdropFilter: 'blur(12px)', backgroundColor: 'rgba(255,255,255,0.97)' }}
        >
          <div className="py-1">
            {TIPOS_ATENDIMENTO.map((tipo, i) => {
              const ativo = tipo === value
              return (
                <button
                  key={tipo}
                  type="button"
                  onMouseDown={e => { e.preventDefault(); selecionar(tipo) }}
                  onMouseEnter={() => setIndiceAtivo(i)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors',
                    ativo
                      ? 'bg-[#04c2fb]/8 text-[#04c2fb] font-semibold'
                      : i === indiceAtivo
                      ? 'bg-gray-50 text-gray-800'
                      : 'text-gray-700 hover:bg-gray-50',
                  )}
                >
                  <span className={cn(
                    'h-1.5 w-1.5 rounded-full shrink-0 transition-all',
                    ativo ? 'bg-[#04c2fb] scale-125' : 'bg-transparent',
                  )} />
                  {tipo}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function formatDataBR(iso: string) {
  if (!iso) return '-'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

// ---------------------------------------------------------------------------
// Estilos do rich-text (reutilizado em view e expandido inline)
// ---------------------------------------------------------------------------

const richTextClasses = cn(
  'text-sm text-gray-700 leading-relaxed',
  '[&_p]:my-1 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0',
  '[&_h1]:text-base [&_h1]:font-bold [&_h1]:my-1.5',
  '[&_h2]:text-sm [&_h2]:font-bold [&_h2]:my-1.5',
  '[&_h3]:text-sm [&_h3]:font-semibold [&_h3]:my-1',
  '[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1',
  '[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1',
  '[&_li]:my-0.5',
  '[&_strong]:font-semibold [&_em]:italic [&_u]:underline [&_s]:line-through',
  '[&_mark]:bg-yellow-200 [&_mark]:px-0.5 [&_mark]:rounded-sm',
  '[&_a]:text-[#04c2fb] [&_a]:underline [&_a]:break-all',
  '[&_blockquote]:border-l-2 [&_blockquote]:border-gray-300 [&_blockquote]:pl-3 [&_blockquote]:text-gray-500 [&_blockquote]:italic [&_blockquote]:my-1',
  '[&_code]:bg-gray-100 [&_code]:px-1 [&_code]:rounded [&_code]:text-xs [&_code]:font-mono',
  '[&_pre]:bg-gray-100 [&_pre]:p-2 [&_pre]:rounded [&_pre]:text-xs [&_pre]:overflow-x-auto [&_pre]:my-1.5',
  '[&_hr]:border-gray-200 [&_hr]:my-2',
)

// ---------------------------------------------------------------------------
// Modo visualização — registro já concluído
// ---------------------------------------------------------------------------

function RegistroViewMode({ registro }: { registro: Registro }) {
  const router = useRouter()
  const notasHtml = tiptapToHtml(registro.conteudo_json)
  const links = registro.link_youtube ? [registro.link_youtube] : []
  const imagens = (registro.arquivos ?? []).filter(f => f.tipo.startsWith('image/'))
  const outrosArquivos = (registro.arquivos ?? []).filter(f => !f.tipo.startsWith('image/'))

  return (
    <div className="max-w-4xl mx-auto space-y-5 p-4 sm:p-6">

      {/* Cabeçalho */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold tracking-tight truncate">
            {registro.paciente_nome ?? 'Registro de Atendimento'}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {formatDataBR(registro.data_atendimento ?? registro.criado_em.slice(0, 10))}
            {registro.tipo_atendimento && <> · {registro.tipo_atendimento}</>}
          </p>
        </div>
        <span className={cn(
          'hidden sm:inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium shrink-0',
          registro.presenca
            ? 'bg-green-50 border border-green-200 text-green-700'
            : 'bg-red-50 border border-red-200 text-red-600',
        )}>
          {registro.presenca
            ? <><CheckCircle2 className="h-3 w-3" /> Presente</>
            : <><XCircle className="h-3 w-3" /> Falta</>
          }
        </span>
        <button
          onClick={() => router.push(`/dashboard/registros/${registro.id}?editar=true`)}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-white shrink-0 hover:brightness-110 transition-all"
          style={{ background: 'linear-gradient(135deg, #0094c8 0%, #04c2fb 60%, #00d5f5 100%)' }}
        >
          <Pencil className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Editar</span>
        </button>
      </div>

      {/* Bloco de informações */}
      <div className="rounded-xl border bg-card shadow-sm p-4 sm:p-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-4">
          <div className="flex items-start gap-2">
            <User className="h-4 w-4 text-[#04c2fb] mt-0.5 shrink-0" />
            <div>
              <p className="text-[11px] text-muted-foreground">Paciente</p>
              <p className="text-sm font-medium text-gray-800 mt-0.5">{registro.paciente_nome ?? '—'}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Calendar className="h-4 w-4 text-[#04c2fb] mt-0.5 shrink-0" />
            <div>
              <p className="text-[11px] text-muted-foreground">Data</p>
              <p className="text-sm font-medium text-gray-800 mt-0.5">{formatDataBR(registro.data_atendimento ?? registro.criado_em.slice(0, 10))}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Tag className="h-4 w-4 text-[#04c2fb] mt-0.5 shrink-0" />
            <div>
              <p className="text-[11px] text-muted-foreground">Tipo de atendimento</p>
              <span className="inline-flex items-center rounded-full bg-[#04c2fb]/10 border border-[#04c2fb]/20 px-2 py-0.5 text-xs font-medium text-[#04c2fb] mt-0.5">
                {registro.tipo_atendimento ?? '—'}
              </span>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Clock className="h-4 w-4 text-[#04c2fb] mt-0.5 shrink-0" />
            <div>
              <p className="text-[11px] text-muted-foreground">Atendimento nº</p>
              <p className="text-sm font-medium text-gray-800 mt-0.5">
                {registro.numero_atendimento ?? <span className="text-muted-foreground">—</span>}
              </p>
            </div>
          </div>
        </div>

        <div className="h-px bg-border my-4" />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-4">
          <div>
            <p className="text-[11px] text-muted-foreground mb-1">Presença</p>
            <span className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
              registro.presenca ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
            )}>
              {registro.presenca
                ? <><CheckCircle2 className="h-3 w-3" /> Presente</>
                : <><XCircle className="h-3 w-3" /> Falta</>
              }
            </span>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground mb-1">Valor</p>
            {registro.valor_atendimento != null ? (
              <p className="text-sm font-semibold text-gray-800">
                {Number(registro.valor_atendimento).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
            ) : (
              <span className="inline-flex items-center rounded-full bg-gray-50 border border-gray-200 px-2 py-0.5 text-[11px] text-muted-foreground">
                sem cobrança
              </span>
            )}
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground mb-1">Material utilizado</p>
            <p className="text-sm text-gray-700">
              {registro.material && registro.material !== '-' ? registro.material : <span className="text-muted-foreground">—</span>}
            </p>
          </div>
        </div>

        {/* Links */}
        {links.length > 0 && (
          <>
            <div className="h-px bg-border my-4" />
            <div>
              <p className="text-[11px] text-muted-foreground mb-2">Links</p>
              <div className="flex flex-wrap gap-1.5">
                {links.map((link, i) => (
                  <a
                    key={i}
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-full border border-[#04c2fb]/30 bg-[#04c2fb]/5 px-2.5 py-0.5 text-[11px] text-[#04c2fb] hover:bg-[#04c2fb]/10 transition-colors max-w-[220px]"
                    title={link}
                  >
                    <ExternalLink className="h-3 w-3 shrink-0" />
                    <span className="truncate">{(() => { try { return new URL(link).hostname.replace('www.', '') } catch { return link } })()}</span>
                  </a>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Anexos */}
        {(imagens.length > 0 || outrosArquivos.length > 0) && (
          <>
            <div className="h-px bg-border my-4" />
            <div>
              <p className="text-[11px] text-muted-foreground mb-2">Anexos</p>
              <div className="flex flex-wrap gap-2">
                {imagens.map((f, i) => (
                  <a
                    key={i}
                    href={f.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative overflow-hidden rounded-lg border border-gray-200 w-16 h-16 hover:border-[#04c2fb]/40 transition-colors"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={f.url} alt={f.nome} className="w-full h-full object-cover group-hover:opacity-80 transition-opacity" />
                  </a>
                ))}
                {outrosArquivos.map((f, i) => (
                  <a
                    key={i}
                    href={f.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-700 hover:border-[#04c2fb]/40 hover:bg-[#04c2fb]/5 transition-colors max-w-[180px]"
                  >
                    <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">{f.nome}</span>
                  </a>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Observação */}
        {registro.observacao && (
          <>
            <div className="h-px bg-border my-4" />
            <div>
              <p className="text-[11px] text-muted-foreground mb-1">Observação</p>
              <p className="text-sm text-gray-700">{registro.observacao}</p>
            </div>
          </>
        )}
      </div>

      {/* Notas do atendimento */}
      {notasHtml && (
        <div className="rounded-xl border bg-card shadow-sm p-4 sm:p-5 space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-[#04c2fb]" />
            <span className="text-xs font-semibold text-[#04c2fb] uppercase tracking-wide">Notas do Atendimento</span>
          </div>
          <div
            className={richTextClasses}
            dangerouslySetInnerHTML={{ __html: notasHtml }}
          />
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Modo edição — registro existente
// ---------------------------------------------------------------------------

function RegistroEditMode({ id, registro }: { id: string; registro: Registro }) {
  const router = useRouter()
  const atualizarRegistro = useAtualizarRegistro()
  const excluirRegistro = useExcluirRegistro()

  const [form, setForm] = useState({
    data: registro.data_atendimento ?? hoje(),
    tipoAtendimento: registro.tipo_atendimento ?? 'Atendimento',
    numeroAtendimento: registro.numero_atendimento?.toString() ?? '',
    presenca: registro.presenca,
    valorAtendimento: registro.valor_atendimento?.toString() ?? '',
    material: registro.material === '-' ? '' : (registro.material ?? ''),
    links: registro.link_youtube ? [registro.link_youtube] : [],
    notasSessaoJson: registro.conteudo_json,
  })
  function handleNumeroSessaoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/[^\d]/g, '')
    f('numeroAtendimento', raw)
    setNumeroSessaoAlterado(raw !== (registro.numero_atendimento?.toString() ?? ''))
  }

  const [linkInput, setLinkInput] = useState('')
  const [arquivos, setArquivos] = useState<UploadedFile[]>((registro.arquivos ?? []) as UploadedFile[])
  const [salvando, setSalvando] = useState(false)
  const [temAlteracoes, setTemAlteracoes] = useState(false)
  const [confirmarDescartar, setConfirmarDescartar] = useState(false)
  const [confirmarDeletar, setConfirmarDeletar] = useState(false)
  const [numeroAtendimentoAlterado, setNumeroSessaoAlterado] = useState(false)

  function f(field: string, value: unknown) {
    setForm(prev => ({ ...prev, [field]: value }))
    setTemAlteracoes(true)
  }

  function tentarCancelar() {
    if (temAlteracoes) {
      setConfirmarDescartar(true)
    } else {
      router.back()
    }
  }

  async function executarDelete() {
    try {
      await excluirRegistro.mutateAsync(id)
      toast.success('Registro excluído', { description: 'O registro foi removido permanentemente.' })
      router.push('/dashboard/registros')
    } catch {
      toast.error('Erro ao excluir', { description: 'Tente novamente.' })
    }
  }

  async function handleUploadArquivo(file: File): Promise<UploadedFile> {
    const fn = file.type.startsWith('image/') ? uploadImagem : uploadArquivo
    const uploaded = await fn(file, id)
    setArquivos(prev => [...prev, uploaded])
    setTemAlteracoes(true)
    return uploaded
  }

  async function handleRemoverArquivo(url: string) {
    await removerArquivo(url)
    setArquivos(prev => prev.filter(a => a.url !== url))
    setTemAlteracoes(true)
  }

  async function salvar() {
    if (!form.data) {
      toast.error('Data obrigatória', { description: 'Informe a data do atendimento antes de salvar.' })
      return
    }
    setSalvando(true)
    const numeroAtendimentoParsed = parseInt(form.numeroAtendimento, 10)
    const numeroAtendimentoPayload =
      numeroAtendimentoAlterado && !isNaN(numeroAtendimentoParsed) && form.presenca
        ? { numero_atendimento: numeroAtendimentoParsed }
        : {}
    atualizarRegistro.mutate(
      {
        id,
        payload: {
          tipo_atendimento: form.tipoAtendimento || undefined,
          presenca: form.presenca,
          conteudo_json: form.notasSessaoJson,
          material: form.material || undefined,
          link_youtube: form.links[0] || undefined,
          observacao: undefined,
          data_atendimento: form.data,
          arquivos: arquivos,
          ...numeroAtendimentoPayload,
        },
      },
      {
        onSuccess: () => {
          toast.success('Registro atualizado', { description: 'As alterações foram salvas com sucesso.' })
          router.back()
        },
        onError: () => {
          toast.error('Erro ao salvar', { description: 'Não foi possível salvar as alterações. Tente novamente.' })
        },
        onSettled: () => setSalvando(false),
      }
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5 p-4 sm:p-6">

      {/* Cabeçalho */}
      <div className="flex items-center gap-3">
        <button
          onClick={tentarCancelar}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold tracking-tight">Editar Registro</h1>
          <p className="text-sm text-muted-foreground mt-0.5 truncate">{registro.paciente_nome}</p>
        </div>
      </div>

      {/* Formulário */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="p-4 sm:p-6 space-y-5">

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Data do atendimento</label>
                <div className="flex items-center gap-2 py-1.5 select-none">
                  <Calendar className="h-3.5 w-3.5 text-[#04c2fb] shrink-0" />
                  <span className="text-sm font-semibold text-gray-800">{formatDataBR(form.data)}</span>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Tipo de atendimento</label>
                <div className="flex items-center gap-2 py-1.5 select-none">
                  <Tag className="h-3.5 w-3.5 text-[#04c2fb] shrink-0" />
                  <span className="text-sm font-semibold text-gray-800">{form.tipoAtendimento}</span>
                </div>
              </div>
            </div>

            {form.presenca && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Nº Atendimento
                <span className="ml-1.5 text-[10px] text-muted-foreground/50 font-normal">
                  {numeroAtendimentoAlterado ? '(âncora manual)' : '(automático)'}
                </span>
              </label>
              <div className="space-y-1.5">
                <input
                  type="text"
                  inputMode="numeric"
                  value={form.numeroAtendimento}
                  onChange={handleNumeroSessaoChange}
                  placeholder={registro.numero_atendimento?.toString() ?? '—'}
                  className={cn(
                    'w-28 rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#04c2fb]/40',
                    numeroAtendimentoAlterado && 'border-amber-400 ring-1 ring-amber-400/30'
                  )}
                />
                {numeroAtendimentoAlterado && (
                  <p className="text-[11px] text-amber-600 leading-snug max-w-xs">
                    Ao salvar, os números de todas as sessões deste paciente serão
                    recalculados com este valor como referência.
                  </p>
                )}
              </div>
            </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Presença</label>
              <div className="flex items-center gap-3">
                <span className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium border',
                  form.presenca
                    ? 'bg-green-50 border-green-200 text-green-700'
                    : 'bg-red-50 border-red-200 text-red-600',
                )}>
                  {form.presenca
                    ? <><CheckCircle2 className="h-3.5 w-3.5" /> Presente</>
                    : <><XCircle className="h-3.5 w-3.5" /> Falta</>
                  }
                </span>
                <span className="text-[11px] text-muted-foreground/60 italic">
                  Definido no registro original e não pode ser alterado.
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Valor do atendimento</label>
              <div className="flex items-center gap-2 py-1.5 select-none">
                {registro.valor_atendimento != null ? (
                  <span className="text-sm font-semibold text-gray-800">
                    {Number(registro.valor_atendimento).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                ) : (
                  <span className="text-xs italic text-muted-foreground">sem cobrança</span>
                )}
              </div>
            </div>

            {form.presenca && (
            <>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Material utilizado</label>
              <input
                value={form.material}
                onChange={e => f('material', e.target.value)}
                placeholder="Ex: Bolas, cordas e tecidos"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#04c2fb]/40"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Links</label>
              <div className="rounded-lg border bg-background transition-all">
                {form.links.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 px-3 pt-2.5">
                    {form.links.map((link, i) => {
                      let label = link
                      try { label = new URL(link).hostname.replace('www.', '') } catch { /* mantém texto original */ }
                      return (
                        <span
                          key={i}
                          className="group inline-flex items-center gap-1 rounded-md border border-[#04c2fb]/25 bg-[#04c2fb]/5 pl-2 pr-1 py-1 text-[12px] text-[#04c2fb] max-w-[260px] animate-in fade-in slide-in-from-left-1 duration-150"
                          title={link}
                        >
                          <Link2 className="h-3 w-3 shrink-0" />
                          <a
                            href={link.startsWith('http') ? link : `https://${link}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="truncate hover:underline"
                            onClick={e => e.stopPropagation()}
                          >
                            {label}
                          </a>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = form.links.filter((_, idx) => idx !== i)
                              f('links', updated)
                            }}
                            className="ml-0.5 rounded p-0.5 text-[#04c2fb]/60 hover:text-red-500 hover:bg-red-50 transition-colors"
                            title="Remover link"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      )
                    })}
                  </div>
                )}
                <input
                  value={linkInput}
                  onChange={e => setLinkInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      const val = linkInput.trim()
                      if (!val) return
                      if (form.links.includes(val)) {
                        toast.error('Link duplicado', { description: 'Esse link já foi adicionado.' })
                        return
                      }
                      f('links', [...form.links, val])
                      setLinkInput('')
                    }
                  }}
                  onPaste={e => {
                    const text = e.clipboardData.getData('text').trim()
                    if (text && (text.startsWith('http://') || text.startsWith('https://'))) {
                      e.preventDefault()
                      if (form.links.includes(text)) {
                        toast.error('Link duplicado', { description: 'Esse link já foi adicionado.' })
                        return
                      }
                      f('links', [...form.links, text])
                      setLinkInput('')
                    }
                  }}
                  placeholder={form.links.length > 0 ? 'Adicionar outro link...' : 'Cole ou digite um link e pressione Enter'}
                  className={cn(
                    'w-full bg-transparent px-3 py-2 text-sm focus:outline-none placeholder:text-muted-foreground/50',
                    form.links.length > 0 && 'pt-1.5',
                  )}
                />
              </div>
              <p className="text-[11px] text-muted-foreground/70">
                Pressione <kbd className="rounded border border-gray-200 bg-gray-50 px-1 py-0.5 text-[10px] font-mono">Enter</kbd> para adicionar cada link
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Notas do atendimento</label>
              <RichEditor
                key={`edit-${id}`}
                value={form.notasSessaoJson}
                onChange={json => f('notasSessaoJson', json)}
                placeholder="Evolução, objetivos trabalhados, observações clínicas..."
                onUploadFile={handleUploadArquivo}
                uploadedFiles={arquivos}
                onRemoveFile={handleRemoverArquivo}
              />
            </div>
            </>
            )}

        </div>

        {/* Barra de ações */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-4 sm:px-6 py-4 border-t bg-muted/20">
          <button
            onClick={() => setConfirmarDeletar(true)}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-100 hover:border-red-300"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Deletar registro
          </button>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <button
              onClick={tentarCancelar}
              className="rounded-lg border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={salvar}
              disabled={!form.data || salvando}
              className={cn(
                'rounded-lg px-5 py-2 text-sm font-medium text-white transition-colors hover:brightness-110',
                (!form.data || salvando) && 'opacity-50 cursor-not-allowed'
              )}
              style={{ background: 'linear-gradient(135deg, #0094c8 0%, #04c2fb 60%, #00d5f5 100%)' }}
            >
              {salvando ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </div>
      </div>

      {confirmarDescartar && (
        <ConfirmDiscard
          onConfirmar={() => router.back()}
          onCancelar={() => setConfirmarDescartar(false)}
        />
      )}

      {confirmarDeletar && (
        <ConfirmDelete
          onConfirmar={executarDelete}
          onCancelar={() => setConfirmarDeletar(false)}
          titulo="Excluir este registro?"
          descricao="Esta ação não pode ser desfeita. O registro será removido permanentemente junto com todos os dados vinculados."
          consequencias={[
            'A transação financeira gerada por este registro será excluída',
            'Os números de atendimento dos registros seguintes serão recalculados',
            'O agendamento será marcado como cancelado',
            'Documentos e imagens anexados serão removidos permanentemente do storage',
          ]}
          textoBotaoConfirmar="Excluir registro"
          isLoading={excluirRegistro.isPending}
        />
      )}

    </div>
  )
}

// ---------------------------------------------------------------------------
// Modo formulário — agendamento pendente
// ---------------------------------------------------------------------------

function FormularioAtendimento({ id }: { id: string }) {
  const router = useRouter()
  const { data: agendamento, isLoading: agendamentoCarregando } = useAgendamento(id)
  const criarRegistro = useCriarRegistro()
  const criarRegistroGrupo = useCriarRegistroGrupo()
  const [pacienteId, setPacienteId] = useState<string>('')
  const [presencaMap, setPresencaMap] = useState<Record<string, boolean>>({})
  const [valorFaltaGrupoMap, setValorFaltaGrupoMap] = useState<Record<string, string>>({})
  const [form, setForm] = useState({
    data: hoje(),
    tipoAtendimento: 'Atendimento',
    numeroAtendimento: '',
    presenca: true,
    valorAtendimento: '',
    material: '',
    links: [] as string[],
    notasSessaoJson: null as Record<string, unknown> | null,
  })
  const [linkInput, setLinkInput] = useState('')
  const [arquivos, setArquivos] = useState<UploadedFile[]>([])
  const [salvando, setSalvando] = useState(false)
  const [rascunhoRestaurado, setRascunhoRestaurado] = useState(false)
  const [temAlteracoes, setTemAlteracoes] = useState(false)
  const [confirmarDescartar, setConfirmarDescartar] = useState(false)
  const [confirmarDeletar, setConfirmarDeletar] = useState(false)
  const [pauta, setPauta] = useState<string | null>(null)
  const [pautaVisivel, setPautaVisivel] = useState(true)

  const { carregarRascunho, salvarRascunho, descartarRascunho } = useRegistroDraft(id)

  useEffect(() => {
    if (!agendamento) return
    startTransition(() => {
      setPacienteId(agendamento.paciente_id)
      setForm(prev => ({
        ...prev,
        data: agendamento.data ?? prev.data,
        tipoAtendimento: agendamento.tipo_atendimento ?? prev.tipoAtendimento,
      }))
      // Inicializa presença como "presente" para todos os participantes do grupo
      // pacientes_ids já inclui o paciente principal — não duplicar
      if (agendamento.pacientes_ids && agendamento.pacientes_ids.length > 0) {
        setPresencaMap(Object.fromEntries(agendamento.pacientes_ids.map(pid => [pid, true])))
      }
    })
  }, [agendamento?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const draft = carregarRascunho()
    if (!draft) return
    startTransition(() => {
      setForm({
        ...draft.form,
        tipoAtendimento: draft.form.tipoAtendimento ?? agendamento?.tipo_atendimento ?? 'Atendimento',
        valorAtendimento: (draft.form as Record<string, unknown>).valorAtendimento as string ?? '',
        links: draft.form.links ?? [],
      })
      setArquivos(draft.arquivos ?? [])
      setRascunhoRestaurado(true)
    })
  }, [carregarRascunho, agendamento?.tipo_atendimento])

  useEffect(() => {
    const texto = localStorage.getItem(chavePauta(id))
    if (texto && texto.trim()) startTransition(() => setPauta(texto))
  }, [id])

  useEffect(() => {
    if (!rascunhoRestaurado && form.notasSessaoJson === null && arquivos.length === 0) return
    salvarRascunho(form, arquivos)
  }, [form, arquivos, salvarRascunho, rascunhoRestaurado])

  function f(field: string, value: unknown) {
    setForm(prev => ({ ...prev, [field]: value }))
    setTemAlteracoes(true)
  }

  function tentarCancelar() {
    if (temAlteracoes || rascunhoRestaurado) {
      setConfirmarDescartar(true)
    } else {
      router.back()
    }
  }

  function executarDescarte() {
    descartarRascunho()
    router.back()
  }

  function executarDelete() {
    descartarRascunho()
    // TODO: chamada real à API para deletar
    toast.success('Registro deletado', { description: 'O registro foi removido permanentemente.' })
    router.push('/dashboard/registros')
  }

  async function handleUploadArquivo(file: File): Promise<UploadedFile> {
    const fn = file.type.startsWith('image/') ? uploadImagem : uploadArquivo
    const uploaded = await fn(file, id)
    setArquivos(prev => [...prev, uploaded])
    return uploaded
  }

  async function handleRemoverArquivo(url: string) {
    await removerArquivo(url)
    setArquivos(prev => prev.filter(a => a.url !== url))
  }

  const isGrupo = (agendamento?.pacientes_ids?.length ?? 0) > 0

  function salvar() {
    if (!form.data) {
      toast.error('Data obrigatória', { description: 'Informe a data do atendimento antes de salvar.' })
      return
    }
    setSalvando(true)

    if (isGrupo && agendamento) {
      // pacientes_ids já inclui o paciente principal — não duplicar
      const participantesIds = agendamento.pacientes_ids ?? []
      criarRegistroGrupo.mutate(
        {
          agendamento_id: id,
          participantes: participantesIds.map(pid => {
            const presente = presencaMap[pid] ?? true
            const valorFalta = valorFaltaGrupoMap[pid]
            return {
              paciente_id: pid,
              presenca: presente,
              ...((!presente && valorFalta !== undefined)
                ? { valor_atendimento: parseFloat(valorFalta) || 0 }
                : {}),
            }
          }),
          tipo_atendimento: form.tipoAtendimento || undefined,
          data_atendimento: form.data,
          conteudo_json: form.notasSessaoJson,
          material: form.material || undefined,
          link_youtube: form.links[0] || undefined,
          arquivos: arquivos.length > 0 ? arquivos : undefined,
        },
        {
          onSuccess: () => {
            descartarRascunho()
            localStorage.removeItem(chavePauta(id))
            toast.success('Registros salvos', { description: `${participantesIds.length} registros criados com sucesso.` })
            router.push('/dashboard/registros')
          },
          onError: () => {
            toast.error('Erro ao salvar', { description: 'Não foi possível salvar os registros. Tente novamente.' })
          },
          onSettled: () => setSalvando(false),
        }
      )
      return
    }

    if (!pacienteId) {
      toast.error('Paciente obrigatório', { description: 'Selecione o paciente antes de salvar.' })
      setSalvando(false)
      return
    }
    criarRegistro.mutate(
      {
        paciente_id: pacienteId,
        agendamento_id: id,
        tipo_atendimento: form.tipoAtendimento || undefined,
        presenca: form.presenca,
        valor_atendimento: form.valorAtendimento ? parseFloat(form.valorAtendimento) : undefined,
        data_atendimento: form.data,
        conteudo_json: form.notasSessaoJson,
        material: form.material || undefined,
        link_youtube: form.links[0] || undefined,
        arquivos: arquivos.length > 0 ? arquivos : undefined,
      },
      {
        onSuccess: () => {
          descartarRascunho()
          localStorage.removeItem(chavePauta(id))
          toast.success('Registro salvo', { description: 'O atendimento foi registrado com sucesso.' })
          router.push('/dashboard/registros')
        },
        onError: () => {
          toast.error('Erro ao salvar', { description: 'Não foi possível salvar o registro. Tente novamente.' })
        },
        onSettled: () => setSalvando(false),
      }
    )
  }

  if (agendamentoCarregando) return <PageLoader />

  if (!agendamento) {
    return (
      <div className="max-w-4xl mx-auto space-y-5 p-4 sm:p-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>
        <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground text-sm">
          Agendamento não encontrado.
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5 p-4 sm:p-6">

      {/* Cabeçalho */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold tracking-tight">Registrar Atendimento</h1>
            {isGrupo && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                <Users className="h-3 w-3" />
                Grupo
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5 truncate">
            {isGrupo && agendamento.pacientes_nomes?.length
              ? agendamento.pacientes_nomes.join(', ')
              : (agendamento.paciente_nome ?? 'Documente o atendimento realizado')}
          </p>
        </div>
        {rascunhoRestaurado && (
          <div className="flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-[11px] text-amber-700 font-medium shrink-0">
            <Save className="h-3 w-3" />
            Rascunho restaurado
          </div>
        )}
      </div>

      {/* Card de contexto — compacto */}
      <div className="rounded-xl border bg-card shadow-sm p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Agendamento de origem</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="flex items-start gap-2">
            {isGrupo ? <Users className="h-4 w-4 text-[#04c2fb] mt-0.5 shrink-0" /> : <User className="h-4 w-4 text-[#04c2fb] mt-0.5 shrink-0" />}
            <div>
              <p className="text-[11px] text-muted-foreground">{isGrupo ? 'Participantes' : 'Paciente'}</p>
              <p className="text-sm font-medium text-gray-800">
                {isGrupo && agendamento.pacientes_nomes?.length
                  ? agendamento.pacientes_nomes.join(', ')
                  : (agendamento.paciente_nome ?? '-')}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Calendar className="h-4 w-4 text-[#04c2fb] mt-0.5 shrink-0" />
            <div>
              <p className="text-[11px] text-muted-foreground">Data agendada</p>
              <p className="text-sm font-medium text-gray-800">{formatDataBR(agendamento.data)}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Clock className="h-4 w-4 text-[#04c2fb] mt-0.5 shrink-0" />
            <div>
              <p className="text-[11px] text-muted-foreground">Horário · Tipo</p>
              <p className="text-sm font-medium text-gray-800">{agendamento.horario} · {agendamento.tipo_atendimento}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Formulário */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="p-4 sm:p-6 space-y-5">

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Data do atendimento *</label>
                <DatePicker
                  value={form.data}
                  onChange={v => f('data', v)}
                  placeholder="Selecionar data"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Tipo de atendimento</label>
                <TipoAtendimentoSelect
                  value={form.tipoAtendimento}
                  onChange={v => f('tipoAtendimento', v)}
                />
              </div>
            </div>

            {isGrupo ? (
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Presença por participante</label>
                <div className="rounded-lg border bg-muted/20 divide-y">
                  {(agendamento.pacientes_ids ?? []).map((pid, idx) => {
                    // pacientes_ids já inclui o paciente principal — nomes mapeados 1:1
                    const nome = agendamento.pacientes_nomes?.[idx] ?? pid
                    const presente = presencaMap[pid] ?? true
                    return (
                      <div key={pid} className="px-4 py-2.5 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="text-sm font-medium text-gray-800">{nome}</span>
                          </div>
                          <div className="flex gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setPresencaMap(prev => ({ ...prev, [pid]: true }))
                                setValorFaltaGrupoMap(prev => { const n = { ...prev }; delete n[pid]; return n })
                              }}
                              className={cn(
                                'flex items-center gap-1.5 rounded-md border px-3 py-1 text-xs font-medium transition-colors',
                                presente
                                  ? 'border-green-300 bg-green-50 text-green-700'
                                  : 'border-gray-200 bg-background text-muted-foreground hover:bg-muted/50'
                              )}
                            >
                              <span className={cn('h-1.5 w-1.5 rounded-full', presente ? 'bg-green-500' : 'bg-gray-300')} />
                              Presente
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setPresencaMap(prev => ({ ...prev, [pid]: false }))
                                if (presente) setValorFaltaGrupoMap(prev => ({ ...prev, [pid]: '0' }))
                              }}
                              className={cn(
                                'flex items-center gap-1.5 rounded-md border px-3 py-1 text-xs font-medium transition-colors',
                                !presente
                                  ? 'border-red-300 bg-red-50 text-red-600'
                                  : 'border-gray-200 bg-background text-muted-foreground hover:bg-muted/50'
                              )}
                            >
                              <span className={cn('h-1.5 w-1.5 rounded-full', !presente ? 'bg-red-500' : 'bg-gray-300')} />
                              Falta
                            </button>
                          </div>
                        </div>
                        {!presente && (
                          <div className="flex items-center gap-2 pl-5">
                            <label className="text-xs text-muted-foreground shrink-0">Cobrar falta</label>
                            <div className="relative">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={valorFaltaGrupoMap[pid] ?? '0'}
                                onChange={e => setValorFaltaGrupoMap(prev => ({ ...prev, [pid]: e.target.value }))}
                                className="w-28 rounded-md border bg-background pl-8 pr-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#04c2fb]/40"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Presença</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { f('presenca', true); f('valorAtendimento', '') }}
                    className={cn(
                      'flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
                      form.presenca
                        ? 'border-green-300 bg-green-50 text-green-700'
                        : 'border-gray-200 bg-background text-muted-foreground hover:bg-muted/50'
                    )}
                  >
                    <span className={cn('h-2 w-2 rounded-full', form.presenca ? 'bg-green-500' : 'bg-gray-300')} />
                    Presente
                  </button>
                  <button
                    type="button"
                    onClick={() => { f('presenca', false); if (form.presenca) f('valorAtendimento', '0') }}
                    className={cn(
                      'flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
                      !form.presenca
                        ? 'border-red-300 bg-red-50 text-red-600'
                        : 'border-gray-200 bg-background text-muted-foreground hover:bg-muted/50'
                    )}
                  >
                    <span className={cn('h-2 w-2 rounded-full', !form.presenca ? 'bg-red-500' : 'bg-gray-300')} />
                    Falta
                  </button>
                </div>

                {!form.presenca && (
                  <div className="mt-3 flex items-end gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Cobrar</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={form.valorAtendimento}
                          onChange={e => f('valorAtendimento', e.target.value)}
                          className="w-36 rounded-lg border bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#04c2fb]/40"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <label className={cn('text-xs font-medium', (!isGrupo && !form.presenca) ? 'text-muted-foreground/50' : 'text-muted-foreground')}>
                Material utilizado
              </label>
              <input
                value={form.material}
                onChange={e => f('material', e.target.value)}
                disabled={!isGrupo && !form.presenca}
                placeholder="Ex: Bolas, cordas e tecidos"
                className={cn(
                  'w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#04c2fb]/40',
                  (!isGrupo && !form.presenca) && 'opacity-40 cursor-not-allowed'
                )}
              />
            </div>

            <div className="space-y-1.5">
              <label className={cn('text-xs font-medium', (!isGrupo && !form.presenca) ? 'text-muted-foreground/50' : 'text-muted-foreground')}>
                Links
              </label>
              <div
                className={cn(
                  'rounded-lg border bg-background transition-all',
                  (!isGrupo && !form.presenca) && 'opacity-40 cursor-not-allowed',
                )}
              >
                {form.links.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 px-3 pt-2.5">
                    {form.links.map((link, i) => {
                      let label = link
                      try { label = new URL(link).hostname.replace('www.', '') } catch { /* mantém texto original */ }
                      return (
                        <span
                          key={i}
                          className="group inline-flex items-center gap-1 rounded-md border border-[#04c2fb]/25 bg-[#04c2fb]/5 pl-2 pr-1 py-1 text-[12px] text-[#04c2fb] max-w-[260px] animate-in fade-in slide-in-from-left-1 duration-150"
                          title={link}
                        >
                          <Link2 className="h-3 w-3 shrink-0" />
                          <a
                            href={link.startsWith('http') ? link : `https://${link}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="truncate hover:underline"
                            onClick={e => e.stopPropagation()}
                          >
                            {label}
                          </a>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = form.links.filter((_, idx) => idx !== i)
                              f('links', updated)
                            }}
                            disabled={!isGrupo && !form.presenca}
                            className="ml-0.5 rounded p-0.5 text-[#04c2fb]/60 hover:text-red-500 hover:bg-red-50 transition-colors"
                            title="Remover link"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      )
                    })}
                  </div>
                )}
                <input
                  value={linkInput}
                  onChange={e => setLinkInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      const val = linkInput.trim()
                      if (!val) return
                      if (form.links.includes(val)) {
                        toast.error('Link duplicado', { description: 'Esse link já foi adicionado.' })
                        return
                      }
                      f('links', [...form.links, val])
                      setLinkInput('')
                    }
                  }}
                  onPaste={e => {
                    const text = e.clipboardData.getData('text').trim()
                    if (text && (text.startsWith('http://') || text.startsWith('https://'))) {
                      e.preventDefault()
                      if (form.links.includes(text)) {
                        toast.error('Link duplicado', { description: 'Esse link já foi adicionado.' })
                        return
                      }
                      f('links', [...form.links, text])
                      setLinkInput('')
                    }
                  }}
                  disabled={!isGrupo && !form.presenca}
                  placeholder={form.links.length > 0 ? 'Adicionar outro link...' : 'Cole ou digite um link e pressione Enter'}
                  className={cn(
                    'w-full bg-transparent px-3 py-2 text-sm focus:outline-none placeholder:text-muted-foreground/50',
                    form.links.length > 0 && 'pt-1.5',
                  )}
                />
              </div>
              <p className="text-[11px] text-muted-foreground/70">
                Pressione <kbd className="rounded border border-gray-200 bg-gray-50 px-1 py-0.5 text-[10px] font-mono">Enter</kbd> para adicionar cada link
              </p>
            </div>

            {/* Pauta pré-atendimento */}
            {pauta && (
              <div className={cn(
                'rounded-xl border border-[#04c2fb]/25 bg-gradient-to-b from-[#04c2fb]/[0.06] to-[#04c2fb]/[0.02] overflow-hidden',
                (!isGrupo && !form.presenca) && 'opacity-40 pointer-events-none',
              )}>
                <button
                  type="button"
                  onClick={() => setPautaVisivel(v => !v)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-[#04c2fb]/5 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <NotebookPen className="h-4 w-4 text-[#04c2fb] shrink-0" />
                    <span className="text-sm font-semibold text-[#0094c8]">Pauta deste atendimento</span>
                    <span className="inline-flex items-center rounded-full bg-[#04c2fb]/10 border border-[#04c2fb]/20 px-2 py-0.5 text-[10px] font-semibold text-[#04c2fb]">
                      pré-atendimento
                    </span>
                  </div>
                  <ChevronDown className={cn('h-4 w-4 text-[#04c2fb] transition-transform shrink-0', pautaVisivel ? 'rotate-180' : '')} />
                </button>
                {pautaVisivel && (
                  <div className="px-4 pb-4">
                    <div className="rounded-lg bg-white/70 border border-[#04c2fb]/15 px-4 py-3">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{pauta}</p>
                    </div>
                    <div className="flex items-center justify-between mt-2.5">
                      <p className="text-[10px] text-muted-foreground/60 italic">Consulte a pauta enquanto redige suas notas abaixo</p>
                      <button
                        type="button"
                        onClick={() => {
                          localStorage.removeItem(chavePauta(id))
                          setPauta(null)
                        }}
                        className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 hover:border-red-300 transition-colors"
                      >
                        Descartar pauta
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <label className={cn('text-xs font-medium', (!isGrupo && !form.presenca) ? 'text-muted-foreground/50' : 'text-muted-foreground')}>
                Notas do atendimento
              </label>
              <RichEditor
                key={rascunhoRestaurado ? `draft-${id}` : `new-${id}`}
                value={form.notasSessaoJson}
                onChange={json => f('notasSessaoJson', json)}
                placeholder="Evolução, objetivos trabalhados, observações clínicas..."
                onUploadFile={handleUploadArquivo}
                uploadedFiles={arquivos}
                onRemoveFile={handleRemoverArquivo}
                disabled={!isGrupo && !form.presenca}
              />
            </div>

        </div>

        {/* Barra de ações */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-4 sm:px-6 py-4 border-t bg-muted/20">
          <button
            onClick={() => setConfirmarDeletar(true)}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-100 hover:border-red-300"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Deletar registro
          </button>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <button
              onClick={tentarCancelar}
              className="rounded-lg border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={salvar}
              disabled={!form.data || salvando}
              className={cn(
                'rounded-lg px-5 py-2 text-sm font-medium text-white transition-colors hover:brightness-110',
                (!form.data || salvando) && 'opacity-50 cursor-not-allowed'
              )}
              style={{ background: 'linear-gradient(135deg, #0094c8 0%, #04c2fb 60%, #00d5f5 100%)' }}
            >
              {salvando ? 'Salvando...' : 'Salvar Registro'}
            </button>
          </div>
        </div>
      </div>

      {confirmarDescartar && (
        <ConfirmDiscard
          onConfirmar={executarDescarte}
          onCancelar={() => setConfirmarDescartar(false)}
        />
      )}

      {confirmarDeletar && (
        <ConfirmDelete
          onConfirmar={executarDelete}
          onCancelar={() => setConfirmarDeletar(false)}
          titulo="Excluir este registro?"
          descricao="Esta ação é permanente e causa dois efeitos: (1) a transação financeira vinculada será excluída; (2) os números de atendimento dos registros seguintes serão recalculados."
          textoBotaoConfirmar="Excluir registro"
        />
      )}

    </div>
  )
}

// ---------------------------------------------------------------------------
// Página principal — roteador
// ---------------------------------------------------------------------------

function RegistrarAtendimentoContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const id = params.id as string
  const editar = searchParams.get('editar') === 'true'

  const { data: registro, isLoading, isError } = useRegistro(id)

  if (isLoading) return <PageLoader />

  if (registro && editar) {
    return <RegistroEditMode id={id} registro={registro} />
  }

  if (registro) {
    return <RegistroViewMode registro={registro} />
  }

  // 404 ou ID não-UUID (agendamento pendente do mock) → formulário de novo atendimento
  if (isError || !registro) {
    return <FormularioAtendimento id={id} />
  }

  return null
}

export default function RegistrarAtendimentoPage() {
  return (
    <Suspense>
      <RegistrarAtendimentoContent />
    </Suspense>
  )
}
