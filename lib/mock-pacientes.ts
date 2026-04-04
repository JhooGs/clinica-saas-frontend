// ---------------------------------------------------------------------------
// Lista compartilhada de pacientes mock
// Usada em dropdowns de formulários (agenda, registros, etc.)
// ---------------------------------------------------------------------------

export type PacienteMock = {
  nome: string
  ativo: boolean
}

/** Paciente pode ser agendado: ativo */
export function podeAgendar(p: PacienteMock): boolean {
  return p.ativo
}

export const PACIENTES_MOCK: PacienteMock[] = [
  { nome: 'Angelo Gustavo P. Holub',    ativo: true  },
  { nome: 'Arthur da Silva Cardoso Leal', ativo: true },
  { nome: 'Arthur Felipe Belarmino',     ativo: true  },
  { nome: 'Arthur Henrique',             ativo: false },
  { nome: 'Bernardo Antonio L.F.',       ativo: true  },
  { nome: 'Felipe Konik Pertele',        ativo: true  },
  { nome: 'Gabriel Fernandes B.C.',      ativo: false },
  { nome: 'Henrique Pistelli Protz',     ativo: true  },
  { nome: 'Isadora Furman',              ativo: true  },
  { nome: 'Lorenzo de Souza Bueno',      ativo: true  },
  { nome: 'Luiz Henrique Antonio Rosa',  ativo: true  },
  { nome: 'Matteo Prado Oliveira',       ativo: true  },
  { nome: 'Moyses Costa de Almeida',     ativo: true  },
  { nome: 'Pietro Bizinelli Amorim',     ativo: true  },
  { nome: 'Rafaela Carnelosi Fonseca',   ativo: true  },
  { nome: 'Rafaela de Souza Bueno',      ativo: true  },
  { nome: 'Vinicius Augusto Padilha',    ativo: true  },
]

/** Lista de nomes apenas (retrocompatibilidade) */
export const NOMES_PACIENTES_MOCK = PACIENTES_MOCK.map(p => p.nome)
