'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Save, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { useTemplate, useEditarTemplate } from '@/hooks/use-templates'
import { TemplateFormBuilder } from '@/components/documentos/template-form-builder'
import { SelectClinitra } from '@/components/ui/select-clinitra'
import type { DocumentoTemplate, DocumentoSchema } from '@/types'

const CATEGORIAS = [
  { value: 'anamnese', label: 'Anamnese' },
  { value: 'evolucao', label: 'Evolução' },
  { value: 'avaliacao', label: 'Avaliação' },
  { value: 'consentimento', label: 'Consentimento' },
  { value: 'outro', label: 'Outro' },
]

const CATEGORIA_CORES: Record<string, string> = {
  anamnese: 'bg-violet-100 text-violet-700',
  evolucao: 'bg-blue-100 text-blue-700',
  avaliacao: 'bg-amber-100 text-amber-700',
  consentimento: 'bg-green-100 text-green-700',
  outro: 'bg-gray-100 text-gray-600',
}

function EditorForm({ template }: { template: DocumentoTemplate }) {
  const router = useRouter()
  const editarMutation = useEditarTemplate()

  const [nome, setNome] = useState(template.nome)
  const [categoria, setCategoria] = useState(template.categoria)
  const [descricao, setDescricao] = useState(template.descricao ?? '')
  const [schema, setSchema] = useState<DocumentoSchema>(template.schema)

  const totalCampos = schema.secoes.reduce((acc, s) => acc + s.campos.length, 0)

  function handleSalvar() {
    if (!nome.trim()) {
      toast.error('Nome obrigatório')
      return
    }
    editarMutation.mutate(
      { id: template.id, nome, categoria, descricao: descricao || undefined, schema },
      {
        onSuccess: () => {
          toast.success('Template salvo')
          router.push('/dashboard/documentos')
        },
        onError: () => toast.error('Erro ao salvar template'),
      },
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50/50">

      {/* Barra superior fixa */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push('/dashboard/documentos')}
            className="rounded-lg p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-2 min-w-0 flex-1">
            <FileText className="h-4 w-4 text-[#04c2fb] shrink-0" />
            <span className="text-sm font-semibold text-gray-900 truncate">{nome || 'Sem nome'}</span>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium hidden sm:inline-flex ${CATEGORIA_CORES[categoria] ?? 'bg-gray-100 text-gray-600'}`}>
              {CATEGORIAS.find(c => c.value === categoria)?.label ?? categoria}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-gray-400 hidden sm:inline">
              {schema.secoes.length} {schema.secoes.length === 1 ? 'seção' : 'seções'} · {totalCampos} {totalCampos === 1 ? 'campo' : 'campos'}
            </span>
            <button
              type="button"
              onClick={handleSalvar}
              disabled={editarMutation.isPending}
              className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white transition-all hover:brightness-110 disabled:opacity-70"
              style={{ background: 'linear-gradient(135deg, #0094c8 0%, #04c2fb 60%, #00d5f5 100%)' }}
            >
              {editarMutation.isPending
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Save className="h-4 w-4" />}
              <span className="hidden sm:inline">Salvar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-6 space-y-5">

        {/* Metadados */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 rounded-t-2xl bg-gray-50/60">
            <h2 className="text-sm font-semibold text-gray-800">Informações do template</h2>
          </div>
          <div className="px-5 py-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Nome</label>
              <input
                type="text"
                value={nome}
                onChange={e => setNome(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#04c2fb]/30 focus:border-[#04c2fb] transition-colors"
                placeholder="Ex: Anamnese Adulto"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Categoria</label>
                <SelectClinitra
                  value={categoria}
                  onChange={setCategoria}
                  options={CATEGORIAS}
                  searchPlaceholder="Filtrar categorias..."
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Descrição (opcional)</label>
                <input
                  type="text"
                  value={descricao}
                  onChange={e => setDescricao(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#04c2fb]/30 focus:border-[#04c2fb] transition-colors"
                  placeholder="Breve descrição do template"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Form builder */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 rounded-t-2xl bg-gray-50/60">
            <h2 className="text-sm font-semibold text-gray-800">Campos do formulário</h2>
            <p className="text-xs text-gray-400 mt-0.5">Organize em seções e adicione os campos que serão preenchidos pelo profissional.</p>
          </div>
          <div className="px-5 py-5">
            <TemplateFormBuilder schema={schema} onChange={setSchema} />
          </div>
        </div>

        {/* Salvar bottom — conveniência em mobile */}
        <div className="flex justify-end pb-4">
          <button
            type="button"
            onClick={handleSalvar}
            disabled={editarMutation.isPending}
            className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium text-white transition-all hover:brightness-110 disabled:opacity-70"
            style={{ background: 'linear-gradient(135deg, #0094c8 0%, #04c2fb 60%, #00d5f5 100%)' }}
          >
            {editarMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar template
          </button>
        </div>
      </div>
    </div>
  )
}

export default function EditarTemplatePage() {
  const { id } = useParams<{ id: string }>()
  const { data: template, isLoading } = useTemplate(id)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-[#04c2fb]" />
      </div>
    )
  }

  if (!template) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-gray-400">
        Template não encontrado.
      </div>
    )
  }

  return <EditorForm key={template.id} template={template} />
}
