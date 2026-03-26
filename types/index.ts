export interface Paciente {
  id: string
  clinica_id: string
  nome: string
  cpf?: string
  data_nascimento?: string
  telefone?: string
  email?: string
  ativo: boolean
  criado_em: string
}

export interface Registro {
  id: string
  paciente_id: string
  terapeuta_id: string
  clinica_id: string
  titulo: string
  conteudo_json: Record<string, unknown> | null  // JSON do Tiptap
  numero_sessao?: number
  presenca: boolean
  material?: string
  link_youtube?: string
  observacao?: string
  arquivos?: { nome: string; url: string; tipo: string; tamanho: number }[]
  criado_em: string
  atualizado_em: string
}

export interface Financeiro {
  id: string
  clinica_id: string
  paciente_id?: string
  tipo: 'receita' | 'despesa'
  descricao: string
  valor: number
  status: 'pendente' | 'pago' | 'cancelado'
  data_vencimento?: string
  data_pagamento?: string
  criado_em: string
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
