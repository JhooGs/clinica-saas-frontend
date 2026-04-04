// ---------------------------------------------------------------------------
// Agendamentos mock compartilhados
// Usado tanto na página de Agenda quanto na validação de conflitos ao salvar
// planos de atendimento. Quando o backend estiver pronto, este arquivo deixa
// de existir — a fonte de verdade passa a ser a API.
// ---------------------------------------------------------------------------

import type { AgendamentoComSource } from '@/lib/google-calendar'

// ── Helpers de data ISO ──────────────────────────────────────────────────────

export function hojeISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function diasAFrenteISO(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const HOJE  = hojeISO()
const AMANHA = diasAFrenteISO(1)
function d(n: number) { return diasAFrenteISO(n) }

// ── Agendamentos base ────────────────────────────────────────────────────────
// Datas relativas a hoje para ficarem sempre atuais.
// NÃO altere os horários sem verificar conflitos — eles são a referência para
// testes de sobreposição em toda a aplicação.

export const AGENDAMENTOS_BASE: AgendamentoComSource[] = [
  // Hoje
  { id: 301, paciente: 'Angelo Gustavo P. Holub',   tipo: 'Sessão',         data: HOJE,  horario: '08:30', source: 'clinitra' },
  { id: 302, paciente: 'Lorenzo de Souza Bueno',    tipo: 'Sessão',         data: HOJE,  horario: '09:15', source: 'clinitra' },
  { id: 303, paciente: 'Isadora Furman',             tipo: 'Sessão família', data: HOJE,  horario: '10:00', source: 'clinitra' },
  { id: 304, paciente: 'Pietro Bizinelli Amorim',   tipo: 'Sessão',         data: HOJE,  horario: '11:00', source: 'clinitra' },
  { id: 305, paciente: 'Vinícius Augusto Padilha',  tipo: 'Sessão',         data: HOJE,  horario: '14:00', source: 'clinitra' },
  { id: 306, paciente: 'Moysés Costa de Almeida',   tipo: 'Sessão',         data: HOJE,  horario: '15:00', source: 'clinitra' },
  { id: 307, paciente: 'Rafaela de Souza Bueno',    tipo: 'Sessão',         data: HOJE,  horario: '16:00', source: 'clinitra' },
  // Amanhã
  { id: 308, paciente: 'Bernardo Antonio L.F.',             tipo: 'Sessão',               data: AMANHA, horario: '08:30', source: 'clinitra' },
  { id: 309, paciente: 'Arthur da Silva Cardoso Leal',      tipo: 'Sessão',               data: AMANHA, horario: '10:00', source: 'clinitra' },
  { id: 310, paciente: 'Felipe Konik Pertele',              tipo: 'Sessão avaliação',     data: AMANHA, horario: '11:30', source: 'clinitra' },
  { id: 311, paciente: 'Arthur Felipe Belarmino',           tipo: 'Sessão família',       data: AMANHA, horario: '14:00', source: 'clinitra' },
  { id: 312, paciente: 'Luiz Henrique Antônio Rosa',        tipo: 'Sessão',               data: AMANHA, horario: '15:30', source: 'clinitra' },
  // +2 dias
  { id: 313, paciente: 'Lorenzo de Souza Bueno',    tipo: 'Sessão',         data: d(2), horario: '08:30', source: 'clinitra' },
  { id: 314, paciente: 'Isadora Furman',             tipo: 'Sessão',         data: d(2), horario: '10:00', source: 'clinitra' },
  { id: 315, pacientes: ['Lorenzo de Souza Bueno', 'Arthur Henrique'], paciente: 'Lorenzo de Souza Bueno, Arthur Henrique', tipo: 'Sessão em grupo', data: d(2), horario: '14:00', source: 'clinitra' },
  // +3 dias
  { id: 316, paciente: 'Angelo Gustavo P. Holub',   tipo: 'Sessão',              data: d(3), horario: '09:00', source: 'clinitra' },
  { id: 317, paciente: 'Matteo Prado Oliveira',      tipo: 'Sessão',              data: d(3), horario: '10:30', source: 'clinitra' },
  { id: 318, pacientes: ['Isadora Furman', 'Rafaela Carnelosi Fonseca', 'Matteo Prado Oliveira'], paciente: 'Isadora Furman, Rafaela Carnelosi Fonseca, Matteo Prado Oliveira', tipo: 'Sessão em grupo', data: d(3), horario: '15:00', source: 'clinitra' },
  // +4 dias
  { id: 319, paciente: 'Vinícius Augusto Padilha',  tipo: 'Sessão',               data: d(4), horario: '08:30', source: 'clinitra' },
  { id: 320, paciente: 'Henrique Pistelli Protz',   tipo: 'Reunião com a escola', data: d(4), horario: '11:00', source: 'clinitra' },
]
