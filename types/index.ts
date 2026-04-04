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
  plano_atendimento?: Record<string, unknown> | null
  ativo: boolean
  criado_em: string
}

export interface Registro {
  id: string
  paciente_id: string
  terapeuta_id: string
  clinica_id: string
  titulo?: string
  tipo_sessao?: string
  conteudo_json: Record<string, unknown> | null  // JSON do Tiptap
  numero_sessao?: number
  presenca: boolean
  valor_sessao?: number
  data_sessao?: string  // YYYY-MM-DD
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
  data_vencimento?: string
  data_pagamento?: string
  data_sessao?: string
  tipo_sessao?: string
  forma_pagamento?: FormaPagamento
  criado_em: string
  paciente_nome?: string
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

export type StatusAgendamento = 'agendado' | 'confirmado' | 'realizado' | 'cancelado' | 'falta'

export interface Agendamento {
  id: string
  clinica_id: string
  paciente_id: string
  terapeuta_id: string
  tipo_sessao: string
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
}

export interface AgendamentoListResponse {
  items: Agendamento[]
  total: number
}

export interface AgendamentoCreatePayload {
  paciente_id: string
  tipo_sessao: string
  data: string           // YYYY-MM-DD
  horario: string        // HH:MM
  horario_fim?: string
  observacao?: string
  pacientes_ids?: string[]
}

export interface AgendamentoUpdatePayload {
  tipo_sessao?: string
  data?: string
  horario?: string
  horario_fim?: string
  status?: StatusAgendamento
  observacao?: string
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
