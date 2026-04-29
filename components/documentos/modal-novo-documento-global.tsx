'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, FileText, Loader2, Search, ChevronRight, ChevronLeft, User } from 'lucide-react'
import { toast } from 'sonner'
import { ModalPortal } from '@/components/modal-portal'
import { useTemplates } from '@/hooks/use-templates'
import { usePacientes } from '@/hooks/use-pacientes'
import { useCriarDocumento } from '@/hooks/use-documentos-paciente'
import type { DocumentoTemplate } from '@/types'

interface Props {
  onFechar: () => void
  templatePreSelecionado?: { id: string; nome: string }
}

const CATEGORIA_LABELS: Record<string, string> = {
  anamnese: 'Anamnese',
  evolucao: 'Evolução',
  avaliacao: 'Avaliação',
  consentimento: 'Consentimento',
  outro: 'Outro',
}

export function ModalNovoDocumentoGlobal({ onFechar, templatePreSelecionado }: Props) {
  const router = useRouter()
  // Quando há template pré-selecionado começa na etapa 1 (paciente) e nunca vai para etapa 2
  const [etapa, setEtapa] = useState<1 | 2>(1)
  const [busca, setBusca] = useState('')
  const [pacienteSelecionado, setPacienteSelecionado] = useState<{ id: string; nome: string } | null>(null)
  const [categoriaFiltro, setCategoriaFiltro] = useState('')

  const { data: pacientesData, isLoading: loadingPacientes } = usePacientes(
    busca ? { busca, ativo: true, page_size: 20 } : { ativo: true, page_size: 20 },
  )
  const { data: templates = [], isLoading: loadingTemplates } = useTemplates()

  const criarDocumento = useCriarDocumento(pacienteSelecionado?.id ?? '')

  const pacientes = pacientesData?.items ?? []

  const categorias = useMemo(() => {
    const cats = new Set(templates.map(t => t.categoria))
    return Array.from(cats).sort()
  }, [templates])

  const templatesFiltrados = useMemo(() => {
    if (!categoriaFiltro) return templates
    return templates.filter(t => t.categoria === categoriaFiltro)
  }, [templates, categoriaFiltro])

  function criarComTemplate(templateId: string, templateNome: string, pacienteId: string) {
    criarDocumento.mutate(
      { template_id: templateId, nome: templateNome },
      {
        onSuccess: doc => {
          toast.success('Documento criado', { description: `Abrindo "${templateNome}"` })
          onFechar()
          router.push(`/dashboard/pacientes/${pacienteId}/documentos/${doc.id}`)
        },
        onError: () => toast.error('Erro ao criar documento'),
      },
    )
  }

  function handleSelecionarPaciente(paciente: { id: string; nome: string }) {
    if (templatePreSelecionado) {
      // Template já conhecido: cria direto sem etapa 2
      setPacienteSelecionado(paciente)
      criarComTemplate(templatePreSelecionado.id, templatePreSelecionado.nome, paciente.id)
    } else {
      setPacienteSelecionado(paciente)
      setEtapa(2)
    }
  }

  function handleSelecionarTemplate(template: DocumentoTemplate) {
    if (!pacienteSelecionado) return
    criarComTemplate(template.id, template.nome, pacienteSelecionado.id)
  }

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center p-4"
        style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
        onClick={onFechar}
      >
        <div
          className="w-full max-w-lg rounded-2xl border border-white/30 shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]"
          style={{ backdropFilter: 'blur(24px)', backgroundColor: 'rgba(255,255,255,0.97)' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-6 pb-4 shrink-0">
            <div className="flex items-center gap-3">
              {etapa === 2 && !templatePreSelecionado && (
                <button
                  onClick={() => setEtapa(1)}
                  className="rounded-lg p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              )}
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  {templatePreSelecionado
                    ? 'Selecionar paciente'
                    : etapa === 1 ? 'Selecionar paciente' : 'Selecionar template'}
                </h2>
                {templatePreSelecionado && (
                  <p className="text-xs text-gray-400 mt-0.5">Template: {templatePreSelecionado.nome}</p>
                )}
                {!templatePreSelecionado && etapa === 2 && pacienteSelecionado && (
                  <p className="text-xs text-gray-400 mt-0.5">Paciente: {pacienteSelecionado.nome}</p>
                )}
              </div>
            </div>
            <button
              onClick={onFechar}
              className="rounded-lg p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Indicador de etapa — só exibe no fluxo completo (sem template pré-selecionado) */}
          {!templatePreSelecionado && (
            <div className="px-6 pb-4 shrink-0">
              <div className="flex gap-1.5">
                <div className="h-1 flex-1 rounded-full bg-[#04c2fb]" />
                <div className={`h-1 flex-1 rounded-full transition-colors ${etapa === 2 ? 'bg-[#04c2fb]' : 'bg-gray-200'}`} />
              </div>
            </div>
          )}

          {/* ─── ETAPA 1: Paciente ─── */}
          {etapa === 1 && (
            <>
              <div className="px-6 pb-3 shrink-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    autoFocus
                    type="text"
                    placeholder="Buscar paciente..."
                    value={busca}
                    onChange={e => setBusca(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-4 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-[#04c2fb] focus:bg-white transition-colors"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-1.5 min-h-0">
                {loadingPacientes ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-[#04c2fb]" />
                  </div>
                ) : pacientes.length === 0 ? (
                  <div className="py-10 text-center">
                    <User className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                    <p className="text-sm text-gray-400">
                      {busca ? 'Nenhum paciente encontrado.' : 'Nenhum paciente cadastrado.'}
                    </p>
                  </div>
                ) : (
                  pacientes.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      disabled={criarDocumento.isPending}
                      onClick={() => handleSelecionarPaciente({ id: p.id, nome: p.nome })}
                      className="w-full flex items-center gap-3 rounded-xl border border-gray-200 p-3 text-left hover:border-[#04c2fb] hover:bg-[#04c2fb]/5 transition-all group disabled:opacity-60"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#04c2fb]/10 text-[#04c2fb] text-sm font-semibold">
                        {p.nome.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-gray-900 flex-1 truncate">{p.nome}</span>
                      {criarDocumento.isPending && pacienteSelecionado?.id === p.id
                        ? <Loader2 className="h-4 w-4 text-[#04c2fb] animate-spin shrink-0" />
                        : <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-[#04c2fb] transition-colors shrink-0" />
                      }
                    </button>
                  ))
                )}
              </div>
            </>
          )}

          {/* ─── ETAPA 2: Template ─── */}
          {etapa === 2 && (
            <>
              {categorias.length > 0 && (
                <div className="px-6 pb-3 shrink-0">
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                    <button
                      type="button"
                      onClick={() => setCategoriaFiltro('')}
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-all ${
                        categoriaFiltro === '' ? 'bg-[#04c2fb] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      Todos
                    </button>
                    {categorias.map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategoriaFiltro(cat)}
                        className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-all ${
                          categoriaFiltro === cat ? 'bg-[#04c2fb] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {CATEGORIA_LABELS[cat] ?? cat}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-2 min-h-0">
                {loadingTemplates ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-[#04c2fb]" />
                  </div>
                ) : templatesFiltrados.length === 0 ? (
                  <div className="py-10 text-center">
                    <FileText className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                    <p className="text-sm text-gray-400">
                      {templates.length === 0 ? 'Nenhum template criado ainda.' : 'Nenhum template nessa categoria.'}
                    </p>
                  </div>
                ) : (
                  templatesFiltrados.map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleSelecionarTemplate(t)}
                      disabled={criarDocumento.isPending}
                      className="w-full flex items-start gap-3 rounded-xl border border-gray-200 p-3 text-left hover:border-[#04c2fb] hover:bg-[#04c2fb]/5 transition-all disabled:opacity-60"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#04c2fb]/10">
                        <FileText className="h-4 w-4 text-[#04c2fb]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">{t.nome}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{CATEGORIA_LABELS[t.categoria] ?? t.categoria}</p>
                      </div>
                      {criarDocumento.isPending && (
                        <Loader2 className="ml-auto h-4 w-4 animate-spin text-[#04c2fb] shrink-0 self-center" />
                      )}
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </ModalPortal>
  )
}
