export interface Paciente {
  id: string
  clinica_id: string
  nome: string
  cpf?: string
  data_nascimento?: string
  telefone?: string
  email?: string
  endereco?: Record<string, string>
  dados_extras?: Record<string, unknown>
  responsavel?: string
  data_anamnese?: string  // ISO YYYY-MM-DD
  data_inicio?: string    // ISO YYYY-MM-DD
  plano_atendimento?: Record<string, unknown> | null
  // Campos financeiros próprios
  gratuito: boolean
  valor_atendimento?: number | null
  dia_vencimento: number
  gratuito_inicio?: string | null  // YYYY-MM-DD
  gratuito_fim?: string | null     // YYYY-MM-DD
  ativo: boolean
  criado_em: string
  anonimizado_em?: string | null
}

export interface Registro {
  id: string
  paciente_id: string
  terapeuta_id: string
  clinica_id: string
  agendamento_id?: string  // UUID do agendamento de origem (nullable)
  titulo?: string
  tipo_atendimento?: string
  conteudo_json: Record<string, unknown> | null  // JSON do Tiptap
  numero_atendimento?: number
  numero_atendimento_manual?: boolean
  presenca: boolean
  valor_atendimento?: number
  data_atendimento?: string  // YYYY-MM-DD
  material?: string
  link_youtube?: string
  observacao?: string
  arquivos?: { nome: string; url: string; tipo: string; tamanho: number }[]
  ativo: boolean
  criado_em: string
  atualizado_em: string
  paciente_nome?: string
}

export type FormaPagamento = 'pix' | 'cartao_credito' | 'cartao_debito' | 'dinheiro' | 'transferencia' | 'convenio'

export interface Financeiro {
  id: string
  clinica_id: string
  paciente_id?: string
  registro_id?: string
  tipo: 'receita' | 'despesa'
  descricao: string
  valor: number
  status: 'pendente' | 'pago' | 'atrasado' | 'cancelado'
  data_referencia: string  // YYYY-MM — mês/ano de referência da transação
  data_vencimento?: string
  data_pagamento?: string
  data_atendimento?: string
  tipo_atendimento?: string
  forma_pagamento?: FormaPagamento
  criado_em: string
  paciente_nome?: string
  origem_cobranca?: 'pacote' | 'avulso' | 'mensalidade' | 'falta' | 'gratuito'
  comprovante_url?: string
}

export interface FinanceiroResumo {
  receita_mes: number
  despesa_mes: number
  a_receber: number
  atrasado: number
}

export interface FinanceiroListResponse {
  items: Financeiro[]
  total: number
  resumo: FinanceiroResumo
}

export interface DashboardResumo {
  pacientes: { total: number; novos_mes: number }
  registros: { total: number }
  financeiro: {
    receita_mes: number
    despesa_mes: number
    saldo_mes: number
    a_receber: number
  }
}

export type StatusAgendamento = 'agendado' | 'confirmado' | 'realizado' | 'cancelado' | 'falta' | 'reagendamento'
export type ConfirmacaoStatus = 'pendente' | 'confirmado' | 'reagendamento' | 'cancelado'

export interface ConfirmacaoGrupoItem {
  paciente_nome: string
  status: ConfirmacaoStatus
}

export interface Agendamento {
  id: string
  clinica_id: string
  paciente_id: string
  terapeuta_id: string
  tipo_atendimento: string
  data: string           // YYYY-MM-DD
  horario: string        // HH:MM
  horario_fim?: string   // HH:MM
  status: StatusAgendamento
  observacao?: string
  pacientes_ids?: string[]
  ativo: boolean
  criado_em: string
  atualizado_em: string
  paciente_nome?: string
  terapeuta_nome?: string
  pacientes_nomes?: string[]
  confirmacao_status?: ConfirmacaoStatus | null
  confirmacao_pendente?: boolean
  confirmacoes_grupo?: ConfirmacaoGrupoItem[]
}

export interface AgendamentoListResponse {
  items: Agendamento[]
  total: number
}

export interface AgendamentoCreatePayload {
  paciente_id: string
  tipo_atendimento: string
  data: string           // YYYY-MM-DD
  horario: string        // HH:MM
  horario_fim?: string
  observacao?: string
  pacientes_ids?: string[]
}

export interface AgendamentoUpdatePayload {
  paciente_id?: string
  tipo_atendimento?: string
  data?: string
  horario?: string
  horario_fim?: string
  status?: StatusAgendamento
  observacao?: string
  pacientes_ids?: string[]
}

export interface RegistroGrupoParticipante {
  paciente_id: string
  presenca: boolean
  valor_atendimento?: number
}

export interface RegistroGrupoCreatePayload {
  agendamento_id: string
  participantes: RegistroGrupoParticipante[]
  tipo_atendimento?: string
  data_atendimento?: string
  conteudo_json?: Record<string, unknown> | null
  material?: string
  link_youtube?: string
  arquivos?: { nome: string; url: string; tipo: string; tamanho: number }[]
}

export interface WhatsAppTemplate {
  id: string
  clinica_id: string
  nome: string
  conteudo: string
  padrao: boolean
  criado_em: string
  atualizado_em: string
}

export interface WhatsAppTemplateListResponse {
  items: WhatsAppTemplate[]
  total: number
}

export interface WhatsAppTemplateCreatePayload {
  nome: string
  conteudo: string
  padrao?: boolean
}

export interface WhatsAppTemplateUpdatePayload {
  nome?: string
  conteudo?: string
  padrao?: boolean
}

export type Role = 'super_admin' | 'admin' | 'usuario'

export interface Permissoes {
  pacientes: boolean
  registros: boolean
  agenda: boolean
  financeiro: boolean
  relatorios: boolean
}

export interface Usuario {
  id: string
  clinica_id: string
  nome: string
  email: string
  role: Role
  ativo: boolean
  criado_em: string
  permissoes: Permissoes | null
}

// ── Formulários ───────────────────────────────────────────────────────────────

export type TipoCampo =
  | 'texto_curto'
  | 'texto_longo'
  | 'escolha_unica'
  | 'escolha_multipla'
  | 'escala'
  | 'data'
  | 'numero'
  | 'sim_nao'
  | 'secao'
  | 'texto_informativo'

export interface Campo {
  id: string
  tipo: TipoCampo
  label: string
  obrigatorio?: boolean
  opcoes?: string[]
  min?: number
  max?: number
  conteudo?: string
}

export interface Secao {
  id: string
  titulo: string
  campos: Campo[]
}

export interface FormularioSchema {
  secoes: Secao[]
}

export type FormularioStatus = 'rascunho' | 'finalizado'

export interface FormularioTemplate {
  id: string
  clinica_id: string
  criado_por: string
  nome: string
  categoria: string
  descricao?: string
  schema: FormularioSchema
  origem: 'manual' | 'ia'
  arquivo_origem_url?: string
  ativo: boolean
  uso_count?: number
  criado_em: string
  atualizado_em: string
}

export interface FormularioPaciente {
  id: string
  paciente_id: string
  clinica_id: string
  template_id?: string
  criado_por: string
  nome: string
  schema_snapshot?: FormularioSchema
  respostas?: Record<string, unknown>
  status: FormularioStatus
  arquivo_anexo_url?: string
  ativo: boolean
  criado_em: string
  atualizado_em: string
}

// ── Financeiro Admin (Clinitra) ───────────────────────────────────────────────

export type ClinitraCategoriaExpensa =
  | 'infraestrutura'
  | 'ferramentas'
  | 'marketing'
  | 'pessoal'
  | 'impostos'
  | 'outros'

export type ClinitraCategoriaReceita = 'assinaturas' | 'consultoria' | 'outros'

export type ClinitraCategoria = ClinitraCategoriaExpensa | ClinitraCategoriaReceita

export interface ClinitraAssinatura {
  id: string
  nome: string
  descricao?: string
  tipo: 'receita' | 'despesa'
  categoria: string
  valor: number
  dia_cobranca: number
  ativo: boolean
  inicio: string   // YYYY-MM-DD
  fim?: string     // YYYY-MM-DD
  criado_em: string
  criado_por_email: string
  total_lancamentos: number
}

export interface ClinitraFinanceiro {
  id: string
  tipo: 'receita' | 'despesa'
  categoria: string
  descricao: string
  valor: number
  status: 'pendente' | 'pago' | 'atrasado' | 'cancelado'
  data_referencia: string   // YYYY-MM
  data_vencimento?: string  // YYYY-MM-DD
  data_pagamento?: string   // YYYY-MM-DD
  assinatura_id?: string
  assinatura_nome?: string
  criado_em: string
  criado_por_email?: string
}

export interface ClinitraFinanceiroResumo {
  receita_mes: number
  despesa_mes: number
  saldo_mes: number
  a_pagar: number
}

export interface ClinitraFinanceiroListResponse {
  items: ClinitraFinanceiro[]
  total: number
  resumo: ClinitraFinanceiroResumo
}
