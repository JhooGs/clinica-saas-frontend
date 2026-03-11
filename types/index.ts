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

export interface Prontuario {
  id: string
  paciente_id: string
  medico_id: string
  titulo: string
  conteudo: string
  especialidade?: string
  arquivos?: { nome: string; url: string; tipo: string }[]
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
  prontuarios: { total: number }
  financeiro: {
    receita_mes: number
    despesa_mes: number
    saldo_mes: number
    a_receber: number
  }
}
