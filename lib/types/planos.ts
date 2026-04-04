// ---------------------------------------------------------------------------
// Tipos do sistema de Planos (Pacotes + Sessões) — API backend
// ---------------------------------------------------------------------------

export type TipoSessao = {
  id: string
  clinica_id?: string   // presente em respostas da API; ausente em objetos locais/mock
  nome: string
  padrao: boolean
  valor_padrao?: string | null
  criado_em?: string
}

export type SessaoPacote = {
  tipoSessaoId: string
}

export type Pacote = {
  id: string
  clinica_id?: string   // presente em respostas da API; ausente em objetos locais/mock
  nome: string
  descricao?: string | null
  valor?: string | null
  sessoes: SessaoPacote[]
  ativo: boolean
  sistema?: boolean
  criado_em?: string
}

export type TipoSessaoListResponse = {
  items: TipoSessao[]
  total: number
}

export type PacoteListResponse = {
  items: Pacote[]
  total: number
}

// ---------------------------------------------------------------------------
// PlanoAtendimento — salvo em pacientes/{id}/plano
// ---------------------------------------------------------------------------

export type SlotAgendamento = {
  diaSemana?: number | null   // 0-6
  diaMes?: number | null      // 1-31
  horario: string             // HH:MM
}

export type AgendaRecorrente = {
  slots: SlotAgendamento[]
}

export type PlanoAtendimentoPayload = {
  pacoteId: string | null
  recorrencia: 'semanal' | 'quinzenal' | 'mensal' | null
  vezesPorSemana: number | null
  cobranca: 'por_atendimento' | 'mensal' | null
  agenda: AgendaRecorrente | null
  sessoEmGrupo: boolean
  vigenciaInicio?: string | null
  vigenciaFim?: string | null
}

// ---------------------------------------------------------------------------
// Vigências do Pacote Gratuito — notificações
// ---------------------------------------------------------------------------

export type VigenciaGratuitoRead = {
  paciente_id: string
  paciente_nome: string
  vigencia_fim: string  // YYYY-MM-DD
}

export type VigenciasListResponse = {
  items: VigenciaGratuitoRead[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Retorna o Pacote Gratuito (sistema=true) da listagem, ou undefined */
export function getPacoteGratuito(data: PacoteListResponse | undefined): Pacote | undefined {
  return data?.items.find(p => p.sistema)
}
