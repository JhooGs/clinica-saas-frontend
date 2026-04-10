'use client'

import { useState, useEffect, useCallback, useRef, Suspense, startTransition } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Calendar, Clock, User, FileText, Save, ExternalLink, CheckCircle2, XCircle, X, Link2, Trash2, Tag, ChevronDown, NotebookPen, Loader2 } from 'lucide-react'
import { cn, hoje, extractTiptapText } from '@/lib/utils'
import { DatePicker } from '@/components/ui/date-picker'
import { toast } from 'sonner'
import RichEditor, { type UploadedFile } from '@/components/editor/rich-editor'
import { uploadImagem, uploadArquivo, removerArquivo } from '@/lib/registro-storage'
import { useRegistroDraft } from '@/hooks/use-registro-draft'
import { ConfirmDiscard } from '@/components/confirm-discard'
import { ConfirmDelete } from '@/components/confirm-delete'
import { chavePauta } from '@/components/modal-pauta'
import { TIPOS_SESSAO } from '@/lib/tipos-sessao'
import { useRegistro, useAtualizarRegistro, useCriarRegistro } from '@/hooks/use-registros'
import { useAgendamento } from '@/hooks/use-agenda'
import { usePacientes } from '@/hooks/use-pacientes'
import type { Registro } from '@/types'

// ---------------------------------------------------------------------------
// Dropdown elegante de tipo de sessão
// ---------------------------------------------------------------------------

function TipoSessaoSelect({
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
    const idx = (TIPOS_SESSAO as readonly string[]).indexOf(value)
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
      setIndiceAtivo(i => (i + 1) % TIPOS_SESSAO.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setIndiceAtivo(i => (i - 1 + TIPOS_SESSAO.length) % TIPOS_SESSAO.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      selecionar(TIPOS_SESSAO[indiceAtivo])
    }
  }

  return (
    <div className="relative" ref={containerRef} onKeyDown={handleKeyDown}>
      {/* Trigger */}
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

      {/* Lista */}
      {aberto && (
        <div
          className="absolute left-0 right-0 top-full z-20 mt-1 rounded-lg border border-gray-200 shadow-lg overflow-hidden"
          style={{ backdropFilter: 'blur(12px)', backgroundColor: 'rgba(255,255,255,0.97)' }}
        >
          <div className="py-1">
            {TIPOS_SESSAO.map((tipo, i) => {
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
// Modo visualização — registro já concluído
// ---------------------------------------------------------------------------

function RegistroViewMode({ registro }: { registro: Registro }) {
  const router = useRouter()
  const textoNotas = extractTiptapText(registro.conteudo_json, 2000)
  const links = registro.link_youtube ? [registro.link_youtube] : []

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-4 sm:p-6">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-semibold tracking-tight">Registro de Sessão</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Visualização do registro concluído</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 border border-green-200 px-3 py-1 text-[11px] text-green-700 font-medium">
          <CheckCircle2 className="h-3 w-3" />
          Concluído
        </span>
      </div>

      {/* Dados do registro */}
      <div className="rounded-xl border bg-card shadow-sm p-4 sm:p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Dados da sessão</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="flex items-start gap-2">
            <User className="h-4 w-4 text-[#04c2fb] mt-0.5 shrink-0" />
            <div>
              <p className="text-[11px] text-muted-foreground">Paciente</p>
              <p className="text-sm font-medium text-gray-800">{registro.paciente_nome ?? '—'}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Calendar className="h-4 w-4 text-[#04c2fb] mt-0.5 shrink-0" />
            <div>
              <p className="text-[11px] text-muted-foreground">Data</p>
              <p className="text-sm font-medium text-gray-800">{formatDataBR(registro.data_sessao ?? registro.criado_em.slice(0, 10))}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Tag className="h-4 w-4 text-[#04c2fb] mt-0.5 shrink-0" />
            <div>
              <p className="text-[11px] text-muted-foreground">Tipo de sessão</p>
              <span className="inline-flex items-center rounded-full bg-[#04c2fb]/10 border border-[#04c2fb]/20 px-2 py-0.5 text-xs font-medium text-[#04c2fb] mt-0.5">
                {registro.tipo_sessao ?? '—'}
              </span>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Clock className="h-4 w-4 text-[#04c2fb] mt-0.5 shrink-0" />
            <div>
              <p className="text-[11px] text-muted-foreground">Nº Sessão</p>
              <p className="text-sm font-medium text-gray-800">
                {registro.numero_sessao ?? <span className="text-muted-foreground">—</span>}
              </p>
            </div>
          </div>
        </div>

        <div className="h-px bg-border" />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
            <p className="text-[11px] text-muted-foreground mb-1">Valor da sessão</p>
            {registro.valor_sessao != null ? (
              <p className="text-sm font-semibold text-gray-800">
                {registro.valor_sessao.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
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

        <div className="h-px bg-border" />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <p className="text-[11px] text-muted-foreground mb-1">Links</p>
            {links.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {links.map((link, i) => (
                  <a
                    key={i}
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-full border border-[#04c2fb]/30 bg-[#04c2fb]/5 px-2.5 py-0.5 text-[11px] text-[#04c2fb] hover:bg-[#04c2fb]/10 transition-colors max-w-[200px]"
                    title={link}
                  >
                    <ExternalLink className="h-3 w-3 shrink-0" />
                    <span className="truncate">{(() => { try { return new URL(link).hostname.replace('www.', '') } catch { return link } })()}</span>
                  </a>
                ))}
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">—</span>
            )}
          </div>
        </div>

        {registro.observacao && (
          <>
            <div className="h-px bg-border" />
            <div>
              <p className="text-[11px] text-muted-foreground mb-1">Observação</p>
              <p className="text-sm text-gray-700">{registro.observacao}</p>
            </div>
          </>
        )}
      </div>

      {textoNotas && (
        <div className="rounded-xl border bg-card shadow-sm p-4 sm:p-5 space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-[#04c2fb]" />
            <span className="text-xs font-semibold text-[#04c2fb] uppercase tracking-wide">Notas da Sessão</span>
          </div>
          <div className="rounded-lg border-l-4 border-[#04c2fb] bg-[#04c2fb]/5 px-4 py-3">
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{textoNotas}</p>
          </div>
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

  const [form, setForm] = useState({
    data: registro.data_sessao ?? hoje(),
    tipoSessao: registro.tipo_sessao ?? 'Sessão',
    numeroSessao: registro.numero_sessao?.toString() ?? '',
    presenca: registro.presenca,
    valorSessao: registro.valor_sessao?.toString() ?? '',
    material: registro.material === '-' ? '' : (registro.material ?? ''),
    links: registro.link_youtube ? [registro.link_youtube] : [],
    notasSessaoJson: registro.conteudo_json,
  })
  const [linkInput, setLinkInput] = useState('')
  const [arquivos, setArquivos] = useState<UploadedFile[]>([])
  const [salvando, setSalvando] = useState(false)
  const [temAlteracoes, setTemAlteracoes] = useState(false)
  const [confirmarDescartar, setConfirmarDescartar] = useState(false)
  const [confirmarDeletar, setConfirmarDeletar] = useState(false)

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

  function executarDelete() {
    // TODO: chamada real à API para deletar
    toast.success('Registro deletado', { description: 'O registro foi removido permanentemente.' })
    router.push('/dashboard/registros')
  }

  const handleUploadImagem = useCallback(async (file: File): Promise<string> => {
    return uploadImagem(file, id)
  }, [id])

  const handleUploadArquivo = useCallback(async (file: File): Promise<UploadedFile> => {
    const uploaded = await uploadArquivo(file, id)
    setArquivos(prev => [...prev, uploaded])
    return uploaded
  }, [id])

  const handleRemoverArquivo = useCallback(async (url: string) => {
    await removerArquivo(url)
    setArquivos(prev => prev.filter(a => a.url !== url))
  }, [])

  async function salvar() {
    if (!form.data) {
      toast.error('Data obrigatória', { description: 'Informe a data da sessão antes de salvar.' })
      return
    }
    setSalvando(true)
    atualizarRegistro.mutate(
      {
        id,
        payload: {
          tipo_sessao: form.tipoSessao || undefined,
          presenca: form.presenca,
          conteudo_json: form.notasSessaoJson,
          material: form.material || undefined,
          link_youtube: form.links[0] || undefined,
          observacao: undefined,
          data_sessao: form.data,
        },
      },
      {
        onSuccess: () => {
          toast.success('Registro atualizado', { description: 'As alterações foram salvas com sucesso.' })
          router.push('/dashboard/registros')
        },
        onError: () => {
          toast.error('Erro ao salvar', { description: 'Não foi possível salvar as alterações. Tente novamente.' })
        },
        onSettled: () => setSalvando(false),
      }
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-4 sm:p-6">

      {/* Cabeçalho */}
      <div className="flex items-center gap-3">
        <button
          onClick={tentarCancelar}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-semibold tracking-tight">Editar Registro</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{registro.paciente_nome}</p>
        </div>
      </div>

      {/* Formulário */}
      <div className="rounded-xl border bg-card shadow-sm p-4 sm:p-6 space-y-5">

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Data da sessão *</label>
            <DatePicker
              value={form.data}
              onChange={v => f('data', v)}
              placeholder="Selecionar data"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Tipo de sessão</label>
            <TipoSessaoSelect
              value={form.tipoSessao}
              onChange={v => f('tipoSessao', v)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Nº Sessão
              <span className="ml-1.5 text-[10px] text-amber-500 font-normal">(automático)</span>
            </label>
            <div className="flex items-center h-9 rounded-lg border border-dashed border-gray-200 bg-muted/30 px-3 text-sm text-muted-foreground select-none">
              {registro.numero_sessao ?? <span className="text-gray-300 text-xs italic">calculado pelo backend</span>}
            </div>
          </div>
        </div>


        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Presença</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => f('presenca', true)}
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
              onClick={() => f('presenca', false)}
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
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Valor da sessão
            {form.presenca && <span className="ml-1.5 text-[10px] text-amber-500 font-normal">(automático)</span>}
          </label>
          {form.presenca ? (
            <div className="flex items-center h-9 rounded-lg border border-dashed border-gray-200 bg-muted/30 px-3 text-sm select-none">
              <span className="text-gray-600">
                {registro.valor_sessao != null
                  ? registro.valor_sessao.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                  : <span className="text-gray-300 text-xs italic">calculado pelo backend</span>
                }
              </span>
            </div>
          ) : (
            <>
              <div className="relative max-w-[180px]">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground select-none">R$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.valorSessao}
                  onChange={e => f('valorSessao', e.target.value)}
                  placeholder="0,00"
                  className="w-full rounded-lg border bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#04c2fb]/40"
                />
              </div>
              <p className="text-[11px] text-muted-foreground/70">
                Deixe em 0 para não gerar cobrança pela falta.
              </p>
            </>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className={cn('text-xs font-medium', !form.presenca ? 'text-muted-foreground/50' : 'text-muted-foreground')}>
              Material utilizado
            </label>
            <input
              value={form.material}
              onChange={e => f('material', e.target.value)}
              disabled={!form.presenca}
              placeholder="Ex: Bolas, cordas e tecidos"
              className={cn(
                'w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#04c2fb]/40',
                !form.presenca && 'opacity-40 cursor-not-allowed'
              )}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className={cn('text-xs font-medium', !form.presenca ? 'text-muted-foreground/50' : 'text-muted-foreground')}>
            Links
          </label>
          <div
            className={cn(
              'rounded-lg border bg-background transition-all',
              !form.presenca && 'opacity-40 cursor-not-allowed',
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
                        disabled={!form.presenca}
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
              disabled={!form.presenca}
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
          <label className="text-xs font-medium text-muted-foreground">Notas da sessão</label>
          <RichEditor
            key={`edit-${id}`}
            value={form.notasSessaoJson}
            onChange={json => f('notasSessaoJson', json)}
            placeholder="Evolução, objetivos trabalhados, observações clínicas..."
            onUploadImage={handleUploadImagem}
            onUploadFile={handleUploadArquivo}
            uploadedFiles={arquivos}
            onRemoveFile={handleRemoverArquivo}
          />
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t">
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
        />
      )}

    </div>
  )
}

// ---------------------------------------------------------------------------
// Modo formulário — agendamento pendente
// ---------------------------------------------------------------------------

function FormularioSessao({ id }: { id: string }) {
  const router = useRouter()
  const { data: agendamento } = useAgendamento(id)
  const criarRegistro = useCriarRegistro()
  const { data: pacientesData } = usePacientes({ page_size: 200 })

  const [pacienteId, setPacienteId] = useState<string>('')
  const [form, setForm] = useState({
    data: hoje(),
    tipoSessao: 'Sessão',
    numeroSessao: '',
    presenca: true,
    valorSessao: '',
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

  // Quando o agendamento carregar da API, pré-preenche o form e define o paciente
  useEffect(() => {
    if (!agendamento) return
    startTransition(() => {
      setPacienteId(agendamento.paciente_id)
      setForm(prev => ({
        ...prev,
        data: agendamento.data ?? prev.data,
        tipoSessao: agendamento.tipo_sessao ?? prev.tipoSessao,
      }))
    })
  }, [agendamento?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const draft = carregarRascunho()
    if (!draft) return
    startTransition(() => {
      setForm({
        ...draft.form,
        tipoSessao: draft.form.tipoSessao ?? agendamento?.tipo_sessao ?? 'Sessão',
        valorSessao: (draft.form as Record<string, unknown>).valorSessao as string ?? '',
        links: draft.form.links ?? [],
      })
      setArquivos(draft.arquivos ?? [])
      setRascunhoRestaurado(true)
    })
  }, [carregarRascunho, agendamento?.tipo_sessao])

  // Carrega pauta pré-sessão do localStorage
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

  const handleUploadImagem = useCallback(async (file: File): Promise<string> => {
    return uploadImagem(file, id)
  }, [id])

  const handleUploadArquivo = useCallback(async (file: File): Promise<UploadedFile> => {
    const uploaded = await uploadArquivo(file, id)
    setArquivos(prev => [...prev, uploaded])
    return uploaded
  }, [id])

  const handleRemoverArquivo = useCallback(async (url: string) => {
    await removerArquivo(url)
    setArquivos(prev => prev.filter(a => a.url !== url))
  }, [])

  function salvar() {
    if (!form.data) {
      toast.error('Data obrigatória', { description: 'Informe a data da sessão antes de salvar.' })
      return
    }
    if (!pacienteId) {
      toast.error('Paciente obrigatório', { description: 'Selecione o paciente antes de salvar.' })
      return
    }
    setSalvando(true)
    criarRegistro.mutate(
      {
        paciente_id: pacienteId,
        agendamento_id: id,  // vincula 1:1 com o agendamento de origem
        tipo_sessao: form.tipoSessao || undefined,
        presenca: form.presenca,
        valor_sessao: form.valorSessao ? parseFloat(form.valorSessao) : undefined,
        data_sessao: form.data,
        conteudo_json: form.notasSessaoJson,
        material: form.material || undefined,
        link_youtube: form.links[0] || undefined,
      },
      {
        onSuccess: () => {
          descartarRascunho()
          localStorage.removeItem(chavePauta(id))
          toast.success('Registro salvo', { description: 'A sessão foi registrada com sucesso.' })
          router.push('/dashboard/registros')
        },
        onError: () => {
          toast.error('Erro ao salvar', { description: 'Não foi possível salvar o registro. Tente novamente.' })
        },
        onSettled: () => setSalvando(false),
      }
    )
  }

  if (!agendamento) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 p-4 sm:p-6">
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
    <div className="max-w-2xl mx-auto space-y-6 p-4 sm:p-6">

      {/* Cabeçalho */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-semibold tracking-tight">Registrar Sessão</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Documente a sessão realizada</p>
        </div>


        {rascunhoRestaurado && (
          <div className="flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-[11px] text-amber-700 font-medium">
            <Save className="h-3 w-3" />
            Rascunho restaurado
          </div>
        )}
      </div>

      {/* Card de contexto */}
      <div className="rounded-xl border bg-card shadow-sm p-4 sm:p-5 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Agendamento de origem</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex items-start gap-2">
            <User className="h-4 w-4 text-[#04c2fb] mt-0.5 shrink-0" />
            <div>
              <p className="text-[11px] text-muted-foreground">Paciente</p>
              <p className="text-sm font-medium text-gray-800">{agendamento.paciente_nome ?? '-'}</p>
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
              <p className="text-sm font-medium text-gray-800">{agendamento.horario} · {agendamento.tipo_sessao}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Formulário */}
      <div className="rounded-xl border bg-card shadow-sm p-4 sm:p-6 space-y-5">

        {/* Seletor de paciente — necessário quando não há agendamento real vinculado */}
        {!agendamento && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Paciente *</label>
            <select
              value={pacienteId}
              onChange={e => setPacienteId(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#04c2fb]/40"
            >
              <option value="">Selecione o paciente</option>
              {(pacientesData?.items ?? []).map(p => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Data da sessão *</label>
            <DatePicker
              value={form.data}
              onChange={v => f('data', v)}
              placeholder="Selecionar data"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Tipo de sessão</label>
            <TipoSessaoSelect
              value={form.tipoSessao}
              onChange={v => f('tipoSessao', v)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Nº Sessão
              <span className="ml-1.5 text-[10px] text-amber-500 font-normal">(automático)</span>
            </label>
            <div className="flex items-center h-9 rounded-lg border border-dashed border-gray-200 bg-muted/30 px-3 text-sm select-none">
              <span className="text-gray-300 text-xs italic">calculado pelo backend</span>
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Presença</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => f('presenca', true)}
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
              onClick={() => f('presenca', false)}
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
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Valor da sessão
            {form.presenca && <span className="ml-1.5 text-[10px] text-amber-500 font-normal">(automático)</span>}
          </label>
          {form.presenca ? (
            <div className="flex items-center h-9 rounded-lg border border-dashed border-gray-200 bg-muted/30 px-3 text-sm select-none">
              <span className="text-gray-300 text-xs italic">calculado pelo backend</span>
            </div>
          ) : (
            <>
              <div className="relative max-w-[180px]">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground select-none">R$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.valorSessao}
                  onChange={e => f('valorSessao', e.target.value)}
                  placeholder="0,00"
                  className="w-full rounded-lg border bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#04c2fb]/40"
                />
              </div>
              <p className="text-[11px] text-muted-foreground/70">
                Deixe em 0 para não gerar cobrança pela falta.
              </p>
            </>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className={cn('text-xs font-medium', !form.presenca ? 'text-muted-foreground/50' : 'text-muted-foreground')}>
              Material utilizado
            </label>
            <input
              value={form.material}
              onChange={e => f('material', e.target.value)}
              disabled={!form.presenca}
              placeholder="Ex: Bolas, cordas e tecidos"
              className={cn(
                'w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#04c2fb]/40',
                !form.presenca && 'opacity-40 cursor-not-allowed'
              )}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className={cn('text-xs font-medium', !form.presenca ? 'text-muted-foreground/50' : 'text-muted-foreground')}>
            Links
          </label>
          <div
            className={cn(
              'rounded-lg border bg-background transition-all',
              !form.presenca && 'opacity-40 cursor-not-allowed',
            )}
          >
            {/* Tags dos links já adicionados */}
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
                        disabled={!form.presenca}
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

            {/* Input para digitar novo link */}
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
              disabled={!form.presenca}
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

        {/* Pauta pré-sessão — visível junto ao editor para consulta rápida */}
        {pauta && (
          <div className="rounded-xl border border-[#04c2fb]/25 bg-gradient-to-b from-[#04c2fb]/[0.06] to-[#04c2fb]/[0.02] overflow-hidden">
            <button
              type="button"
              onClick={() => setPautaVisivel(v => !v)}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-[#04c2fb]/5 transition-colors"
            >
              <div className="flex items-center gap-2">
                <NotebookPen className="h-4 w-4 text-[#04c2fb] shrink-0" />
                <span className="text-sm font-semibold text-[#0094c8]">Pauta desta sessão</span>
                <span className="inline-flex items-center rounded-full bg-[#04c2fb]/10 border border-[#04c2fb]/20 px-2 py-0.5 text-[10px] font-semibold text-[#04c2fb]">
                  pré-sessão
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
          <label className="text-xs font-medium text-muted-foreground">Notas da sessão</label>
          <RichEditor
            key={rascunhoRestaurado ? `draft-${id}` : `new-${id}`}
            value={form.notasSessaoJson}
            onChange={json => f('notasSessaoJson', json)}
            placeholder="Evolução, objetivos trabalhados, observações clínicas..."
            onUploadImage={handleUploadImagem}
            onUploadFile={handleUploadArquivo}
            uploadedFiles={arquivos}
            onRemoveFile={handleRemoverArquivo}
          />
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t">
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
        />
      )}

    </div>
  )
}

// ---------------------------------------------------------------------------
// Página principal — roteador
// ---------------------------------------------------------------------------

function RegistrarSessaoContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const id = params.id as string
  const editar = searchParams.get('editar') === 'true'

  const { data: registro, isLoading, isError } = useRegistro(id)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-[#04c2fb]" />
      </div>
    )
  }

  if (registro && editar) {
    return <RegistroEditMode id={id} registro={registro} />
  }

  if (registro) {
    return <RegistroViewMode registro={registro} />
  }

  // 404 ou ID não-UUID (agendamento pendente do mock) → formulário de nova sessão
  if (isError || !registro) {
    return <FormularioSessao id={id} />
  }

  return null
}

export default function RegistrarSessaoPage() {
  return (
    <Suspense>
      <RegistrarSessaoContent />
    </Suspense>
  )
}
