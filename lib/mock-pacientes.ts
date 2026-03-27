// ---------------------------------------------------------------------------
// Lista compartilhada de pacientes mock
// Usada em dropdowns de formulários (agenda, registros, etc.)
// ---------------------------------------------------------------------------

export type PacienteMock = {
  nome: string
  ativo: boolean
  gratuito: boolean
  gratuitoFim: string        // dd/mm/yyyy ou '-'
  valorSessao: string        // ex: 'R$ 120,00' ou ''
}

/** Verifica se a gratuidade expirou (gratuitoFim < hoje) */
export function gratuidadeExpirou(p: PacienteMock): boolean {
  if (!p.gratuito) return false
  if (!p.gratuitoFim || p.gratuitoFim === '-' || p.gratuitoFim === '—') return false
  const [d, m, y] = p.gratuitoFim.split('/')
  const fim = new Date(+y, +m - 1, +d)
  fim.setHours(23, 59, 59, 999)
  return new Date() > fim
}

/** Paciente "pausado": gratuidade expirou e valor da sessao nao foi definido */
export function isPausado(p: PacienteMock): boolean {
  if (!p.ativo) return false
  if (!gratuidadeExpirou(p)) return false
  const val = p.valorSessao.replace(/[^\d]/g, '')
  return !val || val === '0' || val === '00' || val === '000'
}

/** Paciente pode ser agendado: ativo e nao pausado */
export function podeAgendar(p: PacienteMock): boolean {
  return p.ativo && !isPausado(p)
}

export const PACIENTES_MOCK: PacienteMock[] = [
  { nome: 'Angelo Gustavo P. Holub',    ativo: true,  gratuito: true,  gratuitoFim: '16/05/2024', valorSessao: 'R$ 100,00' },
  { nome: 'Arthur da Silva Cardoso Leal', ativo: true, gratuito: false, gratuitoFim: '-',          valorSessao: 'R$ 140,00' },
  { nome: 'Arthur Felipe Belarmino',     ativo: true,  gratuito: false, gratuitoFim: '-',          valorSessao: 'R$ 120,00' },
  { nome: 'Arthur Henrique',             ativo: false, gratuito: false, gratuitoFim: '-',          valorSessao: 'R$ 160,00' },
  { nome: 'Bernardo Antonio L.F.',       ativo: true,  gratuito: false, gratuitoFim: '-',          valorSessao: 'R$ 120,00' },
  { nome: 'Felipe Konik Pertele',        ativo: true,  gratuito: true,  gratuitoFim: '10/03/2026', valorSessao: ''          },
  { nome: 'Gabriel Fernandes B.C.',      ativo: false, gratuito: false, gratuitoFim: '-',          valorSessao: 'R$ 80,00'  },
  { nome: 'Henrique Pistelli Protz',     ativo: true,  gratuito: false, gratuitoFim: '-',          valorSessao: 'R$ 150,00' },
  { nome: 'Isadora Furman',              ativo: true,  gratuito: false, gratuitoFim: '-',          valorSessao: 'R$ 160,00' },
  { nome: 'Lorenzo de Souza Bueno',      ativo: true,  gratuito: false, gratuitoFim: '-',          valorSessao: 'R$ 150,00' },
  { nome: 'Luiz Henrique Antonio Rosa',  ativo: true,  gratuito: false, gratuitoFim: '-',          valorSessao: 'R$ 140,00' },
  { nome: 'Matteo Prado Oliveira',       ativo: true,  gratuito: false, gratuitoFim: '-',          valorSessao: 'R$ 130,00' },
  { nome: 'Moyses Costa de Almeida',     ativo: true,  gratuito: false, gratuitoFim: '-',          valorSessao: 'R$ 160,00' },
  { nome: 'Pietro Bizinelli Amorim',     ativo: true,  gratuito: false, gratuitoFim: '-',          valorSessao: 'R$ 150,00' },
  { nome: 'Rafaela Carnelosi Fonseca',   ativo: true,  gratuito: false, gratuitoFim: '-',          valorSessao: 'R$ 120,00' },
  { nome: 'Rafaela de Souza Bueno',      ativo: true,  gratuito: false, gratuitoFim: '-',          valorSessao: 'R$ 120,00' },
  { nome: 'Vinicius Augusto Padilha',    ativo: true,  gratuito: false, gratuitoFim: '-',          valorSessao: 'R$ 160,00' },
]

/** Lista de nomes apenas (retrocompatibilidade) */
export const NOMES_PACIENTES_MOCK = PACIENTES_MOCK.map(p => p.nome)

/** Contagem de pacientes pausados (para badges na sidebar) */
export function contarPausados(): number {
  return PACIENTES_MOCK.filter(isPausado).length
}
