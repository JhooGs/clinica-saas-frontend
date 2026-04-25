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
