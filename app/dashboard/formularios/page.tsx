'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  FileText,
  Plus,
  FolderOpen,
  Loader2,
  Pencil,
  FilePlus2,
  CheckCircle2,
  Clock,
  Sparkles,
  Trash2,
  Info,
} from 'lucide-react'
import { toast } from 'sonner'
import { format, isThisMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useTemplates, useCriarTemplate, useDeletarTemplate } from '@/hooks/use-templates'
import { useFormulariosClinica } from '@/hooks/use-formularios-clinica'
import { useDeletarFormularioGlobal } from '@/hooks/use-formularios-paciente'
import { useConfiguracoes } from '@/hooks/use-configuracoes'
import { ModalCriarTemplate } from '@/components/formularios/modal-criar-template'
import { ModalNovoFormularioGlobal } from '@/components/formularios/modal-novo-formulario-global'
import { ModalPortal } from '@/components/modal-portal'
import { cn } from '@/lib/utils'
import type { FormularioSchema } from '@/types'

const CATEGORIA_LABELS: Record<string, string> = {
  anamnese: 'Anamnese',
  evolucao: 'Evolução',
  avaliacao: 'Avaliação',
  consentimento: 'Consentimento',
  outro: 'Outro',
}

const CATEGORIA_CORES: Record<string, string> = {
  anamnese: 'bg-violet-100 text-violet-700',
  evolucao: 'bg-blue-100 text-blue-700',
  avaliacao: 'bg-amber-100 text-amber-700',
  consentimento: 'bg-green-100 text-green-700',
  outro: 'bg-gray-100 text-gray-600',
}

type FiltroHistorico = 'todos' | 'rascunho' | 'finalizado'

const FILTROS: { valor: FiltroHistorico; label: string }[] = [
  { valor: 'todos', label: 'Todos' },
  { valor: 'rascunho', label: 'Rascunhos' },
  { valor: 'finalizado', label: 'Finalizados' },
]

export default function FormulariosPage() {
  const router = useRouter()
  const [modalTemplate, setModalTemplate] = useState(false)
  const [modalFormulario, setModalFormulario] = useState<{ templateId?: string; templateNome?: string } | null>(null)
  const [filtro, setFiltro] = useState<FiltroHistorico>('todos')
  const [excluindoTemplate, setExcluindoTemplate] = useState<{ id: string; nome: string } | null>(null)
  const [excluindoForm, setExcluindoForm] = useState<{ id: string; pacienteId: string; nome: string } | null>(null)

  const { data: templates = [], isLoading: loadingTemplates } = useTemplates()
  const { data: formularios = [], isLoading: loadingForms } = useFormulariosClinica({ tipo: 'formulario', limit: 100 })
  const { data: config } = useConfiguracoes()
  const criarTemplate = useCriarTemplate()
  const deletarTemplate = useDeletarTemplate()
  const deletarFormulario = useDeletarFormularioGlobal()

  const planoFree = config?.plano === 'free'

  const stats = useMemo(() => {
    const templateAtivos = templates.length
    const formsMes = formularios.filter(d => isThisMonth(new Date(d.criado_em))).length
    const rascunhos = formularios.filter(d => d.status === 'rascunho').length
    return { templateAtivos, formsMes, rascunhos }
  }, [templates, formularios])

  const formulariosFiltrados = useMemo(() => {
    if (filtro === 'rascunho') return formularios.filter(d => d.status === 'rascunho')
    if (filtro === 'finalizado') return formularios.filter(d => d.status === 'finalizado')
    return formularios
  }, [formularios, filtro])

  function confirmarExclusaoForm() {
    if (!excluindoForm) return
    const nome = excluindoForm.nome
    deletarFormulario.mutate(
      { pacienteId: excluindoForm.pacienteId, formularioId: excluindoForm.id },
      {
        onSuccess: () => {
          setExcluindoForm(null)
          toast.success('Formulário removido', { description: `"${nome}" foi removido.` })
        },
        onError: () => toast.error('Erro ao remover formulário'),
      },
    )
  }

  function handleManual() {
    setModalTemplate(false)
    const schemaVazio: FormularioSchema = { secoes: [] }
    criarTemplate.mutate(
      { nome: 'Novo template', categoria: 'outro', schema: schemaVazio },
      {
        onSuccess: t => {
          toast.success('Template criado')
          router.push(`/dashboard/formularios/templates/${t.id}/editar`)
        },
        onError: () => toast.error('Erro ao criar template'),
      },
    )
  }

  function confirmarExclusaoTemplate() {
    if (!excluindoTemplate) return
    const nome = excluindoTemplate.nome
    deletarTemplate.mutate(excluindoTemplate.id, {
      onSuccess: () => {
        setExcluindoTemplate(null)
        toast.success('Template removido', { description: `"${nome}" foi removido.` })
      },
      onError: () => toast.error('Erro ao remover template'),
    })
  }

  function handleIASuccess(schema: FormularioSchema, arquivoNome: string) {
    setModalTemplate(false)
    const nome = arquivoNome.replace(/\.[^.]+$/, '') || 'Template gerado por IA'
    criarTemplate.mutate(
      { nome, categoria: 'outro', schema, origem: 'ia' },
      {
        onSuccess: t => {
          toast.success('Template gerado com IA', { description: 'Revise e ajuste os campos antes de usar.' })
          router.push(`/dashboard/formularios/templates/${t.id}/editar`)
        },
        onError: () => toast.error('Erro ao salvar template'),
      },
    )
  }

  return (
    <div className="p-3 sm:p-6 space-y-6 max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-semibold text-gray-900">Formulários</h1>
          <p className="text-sm text-gray-500 mt-0.5">Templates e histórico de preenchimentos</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setModalTemplate(true)}
            className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Novo template</span>
            <span className="sm:hidden">Template</span>
          </button>
          <button
            type="button"
            onClick={() => setModalFormulario({})}
            className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white transition-all hover:brightness-110"
            style={{ background: 'linear-gradient(135deg, #0094c8 0%, #04c2fb 60%, #00d5f5 100%)' }}
          >
            <FilePlus2 className="h-4 w-4" />
            <span className="hidden sm:inline">Novo formulário</span>
            <span className="sm:hidden">Formulário</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-4 flex flex-col gap-1 shadow-sm">
          <div className="flex items-center gap-2 text-gray-400">
            <FolderOpen className="h-4 w-4 shrink-0" />
            <span className="text-xs truncate">Templates</span>
          </div>
          <span className="text-2xl font-bold text-gray-900">
            {loadingTemplates ? <Loader2 className="h-5 w-5 animate-spin text-gray-300" /> : stats.templateAtivos}
          </span>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4 flex flex-col gap-1 shadow-sm">
          <div className="flex items-center gap-2 text-gray-400">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span className="text-xs truncate">Este mês</span>
          </div>
          <span className="text-2xl font-bold text-gray-900">
            {loadingForms ? <Loader2 className="h-5 w-5 animate-spin text-gray-300" /> : stats.formsMes}
          </span>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4 flex flex-col gap-1 shadow-sm">
          <div className="flex items-center gap-2 text-gray-400">
            <Clock className="h-4 w-4 shrink-0" />
            <span className="text-xs truncate">Rascunhos</span>
          </div>
          <span className="text-2xl font-bold text-gray-900">
            {loadingForms ? <Loader2 className="h-5 w-5 animate-spin text-gray-300" /> : stats.rascunhos}
          </span>
        </div>
      </div>

      {/* Templates */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">Templates</h2>

        {loadingTemplates ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-[#04c2fb]" />
          </div>
        ) : templates.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-gray-200 p-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#04c2fb]/10 mx-auto mb-3">
              <Sparkles className="h-7 w-7 text-[#04c2fb]" strokeWidth={1.5} />
            </div>
            <p className="text-sm font-medium text-gray-700">Nenhum template criado</p>
            <p className="text-xs text-gray-400 mt-1 mb-4">
              Crie templates de anamnese, evolução ou consentimentos para aplicar em pacientes.
            </p>
            <button
              type="button"
              onClick={() => setModalTemplate(true)}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white"
              style={{ background: 'linear-gradient(135deg, #0094c8 0%, #04c2fb 60%, #00d5f5 100%)' }}
            >
              <Plus className="h-4 w-4" />
              Criar primeiro template
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {templates.slice(0, 6).map(t => (
              <div
                key={t.id}
                className="rounded-2xl border border-gray-100 bg-white p-4 flex flex-col gap-3 hover:border-[#04c2fb]/40 hover:shadow-sm transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#04c2fb]/10">
                    <FileText className="h-5 w-5 text-[#04c2fb]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{t.nome}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', CATEGORIA_CORES[t.categoria] ?? 'bg-gray-100 text-gray-600')}>
                        {CATEGORIA_LABELS[t.categoria] ?? t.categoria}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {t.uso_count} {t.uso_count === 1 ? 'uso' : 'usos'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 pt-2 border-t border-gray-50 mt-auto">
                  <button
                    type="button"
                    onClick={() => setModalFormulario({ templateId: t.id, templateNome: t.nome })}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium text-white transition-all hover:brightness-110"
                    style={{ background: 'linear-gradient(135deg, #0094c8 0%, #04c2fb 100%)' }}
                  >
                    <FilePlus2 className="h-3.5 w-3.5" />
                    Usar
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push(`/dashboard/formularios/templates/${t.id}/editar`)}
                    className="flex items-center justify-center rounded-lg border border-gray-200 px-3 py-1.5 text-gray-500 hover:bg-gray-50 transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setExcluindoTemplate({ id: t.id, nome: t.nome })}
                    className="flex items-center justify-center rounded-lg border border-gray-200 px-3 py-1.5 text-gray-500 hover:bg-red-50 hover:border-red-200 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Histórico */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">Histórico de formulários</h2>

        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {FILTROS.map(f => (
            <button
              key={f.valor}
              type="button"
              onClick={() => setFiltro(f.valor)}
              className={cn(
                'shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-all',
                filtro === f.valor
                  ? 'bg-[#04c2fb] text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loadingForms ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-[#04c2fb]" />
          </div>
        ) : formulariosFiltrados.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-gray-200 p-10 text-center">
            <FileText className="h-10 w-10 text-gray-200 mx-auto mb-3" strokeWidth={1.5} />
            <p className="text-sm font-medium text-gray-500">
              {filtro === 'todos' ? 'Nenhum formulário criado ainda' : `Nenhum formulário ${filtro}`}
            </p>
            {filtro === 'todos' && (
              <p className="text-xs text-gray-400 mt-1">
                Use &ldquo;Novo formulário&rdquo; para preencher um template para um paciente.
              </p>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Paciente</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider hidden sm:table-cell">Formulário</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider hidden md:table-cell">Data</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-3 py-3 w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {formulariosFiltrados.map(doc => (
                    <tr
                      key={doc.id}
                      className="hover:bg-[#04c2fb]/5 transition-colors"
                    >
                      <td
                        className="px-4 py-3 cursor-pointer"
                        onClick={() => router.push(`/dashboard/pacientes/${doc.paciente_id}/formularios/${doc.id}`)}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#04c2fb]/10 text-[#04c2fb] text-xs font-semibold">
                            {doc.paciente_nome.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate">{doc.paciente_nome}</p>
                            <p className="text-xs text-gray-400 sm:hidden truncate">{doc.nome}</p>
                          </div>
                        </div>
                      </td>
                      <td
                        className="px-4 py-3 hidden sm:table-cell cursor-pointer"
                        onClick={() => router.push(`/dashboard/pacientes/${doc.paciente_id}/formularios/${doc.id}`)}
                      >
                        <div className="min-w-0">
                          <p className="text-sm text-gray-700 truncate max-w-[200px]">{doc.nome}</p>
                          {doc.template_nome && doc.template_nome !== doc.nome && (
                            <p className="text-xs text-gray-400 truncate max-w-[200px]">{doc.template_nome}</p>
                          )}
                        </div>
                      </td>
                      <td
                        className="px-4 py-3 hidden md:table-cell cursor-pointer"
                        onClick={() => router.push(`/dashboard/pacientes/${doc.paciente_id}/formularios/${doc.id}`)}
                      >
                        <span className="text-xs text-gray-500">
                          {format(new Date(doc.criado_em), "dd 'de' MMM, yyyy", { locale: ptBR })}
                        </span>
                      </td>
                      <td
                        className="px-4 py-3 cursor-pointer"
                        onClick={() => router.push(`/dashboard/pacientes/${doc.paciente_id}/formularios/${doc.id}`)}
                      >
                        <span
                          className={cn(
                            'inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold',
                            doc.status === 'finalizado'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-amber-100 text-amber-700',
                          )}
                        >
                          {doc.status === 'finalizado' ? 'Finalizado' : 'Rascunho'}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <button
                          type="button"
                          onClick={() => setExcluindoForm({ id: doc.id, pacienteId: doc.paciente_id, nome: doc.nome })}
                          className="rounded-lg p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modais */}
      {modalTemplate && (
        <ModalCriarTemplate
          onManual={handleManual}
          onIASuccess={handleIASuccess}
          onFechar={() => setModalTemplate(false)}
          planoFree={planoFree}
        />
      )}
      {modalFormulario && (
        <ModalNovoFormularioGlobal
          onFechar={() => setModalFormulario(null)}
          templatePreSelecionado={
            modalFormulario.templateId && modalFormulario.templateNome
              ? { id: modalFormulario.templateId, nome: modalFormulario.templateNome }
              : undefined
          }
        />
      )}
      {excluindoTemplate && (
        <ModalExclusaoTemplate
          nome={excluindoTemplate.nome}
          onConfirmar={confirmarExclusaoTemplate}
          onCancelar={() => setExcluindoTemplate(null)}
          isPending={deletarTemplate.isPending}
        />
      )}
      {excluindoForm && (
        <ModalExclusaoForm
          nome={excluindoForm.nome}
          onConfirmar={confirmarExclusaoForm}
          onCancelar={() => setExcluindoForm(null)}
          isPending={deletarFormulario.isPending}
        />
      )}
    </div>
  )
}

function ModalExclusaoTemplate({
  nome,
  onConfirmar,
  onCancelar,
  isPending,
}: {
  nome: string
  onConfirmar: () => void
  onCancelar: () => void
  isPending: boolean
}) {
  return (
    <ModalPortal>
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backdropFilter: 'blur(5px)', background: 'rgba(0,0,0,0.22)' }}
      onClick={e => { if (e.target === e.currentTarget) onCancelar() }}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-white/60 shadow-2xl"
        style={{ background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(24px)' }}
      >
        <div className="px-6 pt-6 pb-6 space-y-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 border border-red-100">
              <Trash2 className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">Remover template</h2>
              <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                Tem certeza que deseja remover{' '}
                <span className="font-semibold text-gray-800">&ldquo;{nome}&rdquo;</span>?
                {' '}Ele deixará de aparecer nas opções de novos formulários.
              </p>
              <p className="text-xs text-gray-400 mt-2 flex items-start gap-1.5">
                <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                Formulários já criados com este template não são afetados.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 justify-end">
            <button
              onClick={onCancelar}
              className="rounded-xl px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors border border-gray-200"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirmar}
              disabled={isPending}
              className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-60"
            >
              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              Remover
            </button>
          </div>
        </div>
      </div>
    </div>
    </ModalPortal>
  )
}

function ModalExclusaoForm({
  nome,
  onConfirmar,
  onCancelar,
  isPending,
}: {
  nome: string
  onConfirmar: () => void
  onCancelar: () => void
  isPending: boolean
}) {
  return (
    <ModalPortal>
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backdropFilter: 'blur(5px)', background: 'rgba(0,0,0,0.22)' }}
      onClick={e => { if (e.target === e.currentTarget) onCancelar() }}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-white/60 shadow-2xl"
        style={{ background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(24px)' }}
      >
        <div className="px-6 pt-6 pb-6 space-y-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 border border-red-100">
              <Trash2 className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">Remover formulário</h2>
              <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                Tem certeza que deseja remover{' '}
                <span className="font-semibold text-gray-800">&ldquo;{nome}&rdquo;</span>?
                {' '}Esta ação não pode ser desfeita.
              </p>
              <p className="text-xs text-gray-400 mt-2 flex items-start gap-1.5">
                <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                As respostas preenchidas serão removidas permanentemente.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 justify-end">
            <button
              onClick={onCancelar}
              className="rounded-xl px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors border border-gray-200"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirmar}
              disabled={isPending}
              className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-60"
            >
              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              Remover
            </button>
          </div>
        </div>
      </div>
    </div>
    </ModalPortal>
  )
}
