// ---------------------------------------------------------------------------
// Dados mock compartilhados — registros e agendamentos pendentes
// ---------------------------------------------------------------------------

export const TIPOS_SESSAO = [
  'Sessão',
  'Sessão família',
  'Sessão em grupo',
  'Anamnese',
  'Devolutiva família',
  'Reunião com a escola',
  'Reunião multidisciplinar',
  'Outros',
] as const

export type TipoSessao = typeof TIPOS_SESSAO[number]

export type Registro = {
  id: number
  paciente: string
  tipoSessao: TipoSessao
  numeroSessao: number | null
  data: string
  presenca: boolean
  observacao: string
  material: string
  links: string[]
  notasSessaoJson: Record<string, unknown> | null
}

export type RelatorioPendente = {
  id: number
  paciente: string
  tipo: string
  data: string
  horario: string
}

// ---------------------------------------------------------------------------
// Notas TipTap JSON
// ---------------------------------------------------------------------------

export const notasBernardo: Record<string, unknown> = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'O paciente demonstrou evolução significativa no controle motor. Utilizamos caixas e bambolês para trabalhar coordenação bilateral. Boa resposta ao estímulo tátil com os tecidos — manteve contato por mais de 3 minutos sem interrupção.' },
      ],
    },
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Objetivo para próxima sessão: introduzir bastões para equilíbrio unipodal.' },
      ],
    },
  ],
}

export const notasAngelo: Record<string, unknown> = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Sessão focada em regulação sensorial. Angelo apresentou hipersensibilidade ao toque leve, mas tolerou bem a pressão profunda com caixas empilhadas. Iniciou atividade de imitação motora com sucesso — conseguiu replicar 4 dos 6 movimentos propostos.' },
      ],
    },
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Família relatou melhora no sono durante a semana. Continuar com protocolo de pressão profunda.' },
      ],
    },
  ],
}

export const notasLorenzo: Record<string, unknown> = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Lorenzo está apresentando avanços consistentes na integração bilateral. Hoje conseguiu realizar sequência de pular com bambolê no chão por 8 repetições sem apoio. Vocalização espontânea durante a atividade lúdica — dito "vai!" ao empurrar as caixas.' },
      ],
    },
  ],
}

export const notasVinicius: Record<string, unknown> = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Excelente sessão. Vinícius trabalhou equilíbrio dinâmico sobre a prancha com bastões como apoio lateral. Progressão notável no planejamento motor — completou o circuito de obstáculos em 2min20s (recorde pessoal). Humor muito positivo durante toda a sessão.' },
      ],
    },
  ],
}

export const notasMoyses: Record<string, unknown> = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Sessão de reintegração após falta na semana anterior. Moysés apresentou alguma resistência inicial, mas engajou bem após 10 minutos. Trabalhamos propriocepção com caixas de peso variado. Coordenação óculo-manual em desenvolvimento — acertou 7 de 10 lançamentos no alvo.' },
      ],
    },
  ],
}

// ---------------------------------------------------------------------------
// Registros concluídos (IDs 1–99)
// ---------------------------------------------------------------------------

export const registrosIniciais: Registro[] = [
  { id: 1,  paciente: 'Bernardo Antonio L.F.',    tipoSessao: 'Sessão',                  numeroSessao: 111, data: '2025-12-16', presenca: true,  observacao: '',                   material: 'Caixas, bambolês, bastões e cordas', links: ['https://youtube.com/watch?v=abc111'], notasSessaoJson: notasBernardo },
  { id: 2,  paciente: 'Angelo Gustavo P. Holub',  tipoSessao: 'Sessão',                  numeroSessao: 77,  data: '2025-12-18', presenca: true,  observacao: '',                   material: 'Caixas, tecidos e cordas',           links: [],                                     notasSessaoJson: notasAngelo },
  { id: 3,  paciente: 'Lorenzo de Souza Bueno',   tipoSessao: 'Anamnese',                numeroSessao: 74,  data: '2025-12-17', presenca: true,  observacao: '',                   material: 'Caixas, tecidos e cordas',           links: ['https://youtube.com/watch?v=xyz74', 'https://drive.google.com/file/d/abc'], notasSessaoJson: notasLorenzo },
  { id: 4,  paciente: 'Pietro Bizinelli Amorim',  tipoSessao: 'Sessão',                  numeroSessao: null, data: '2025-11-04', presenca: false, observacao: 'Bambolês e tecidos', material: '-',                                  links: [],                                     notasSessaoJson: null },
  { id: 5,  paciente: 'Isadora Furman',           tipoSessao: 'Sessão família',           numeroSessao: 29,  data: '2025-12-17', presenca: true,  observacao: '',                   material: 'Caixas, tecidos e cordas',           links: [],                                     notasSessaoJson: null },
  { id: 6,  paciente: 'Matteo Prado Oliveira',    tipoSessao: 'Sessão',                  numeroSessao: 33,  data: '2025-12-18', presenca: true,  observacao: '',                   material: 'Caixas, tecidos e cordas',           links: [],                                     notasSessaoJson: null },
  { id: 7,  paciente: 'Vinícius Augusto Padilha', tipoSessao: 'Devolutiva família',      numeroSessao: 38,  data: '2025-12-12', presenca: true,  observacao: '',                   material: 'Caixas, bastões e cordas',           links: ['https://youtube.com/watch?v=vin38'],  notasSessaoJson: notasVinicius },
  { id: 8,  paciente: 'Moysés Costa de Almeida',  tipoSessao: 'Sessão',                  numeroSessao: 41,  data: '2025-12-18', presenca: true,  observacao: '',                   material: 'Caixas, tecidos e cordas',           links: [],                                     notasSessaoJson: notasMoyses },
  { id: 9,  paciente: 'Henrique Pistelli Protz',  tipoSessao: 'Reunião com a escola',    numeroSessao: 19,  data: '2025-12-17', presenca: true,  observacao: '',                   material: 'Caixas, tecidos e cordas',           links: [],                                     notasSessaoJson: null },
  { id: 10, paciente: 'Rafaela de Souza Bueno',   tipoSessao: 'Sessão em grupo',         numeroSessao: 55,  data: '2025-12-17', presenca: true,  observacao: '',                   material: 'Caixas, tecidos e cordas',           links: [],                                     notasSessaoJson: null },
]

// ---------------------------------------------------------------------------
// Agendamentos pendentes (IDs 101+)
// ---------------------------------------------------------------------------

export const relatoriosPendentesIniciais: RelatorioPendente[] = [
  { id: 104, paciente: 'Bernardo Antonio L.F.',    tipo: 'Sessão',         data: '2026-03-24', horario: '08:30' },
  { id: 107, paciente: 'Arthur Felipe Belarmino',  tipo: 'Sessão',         data: '2026-03-24', horario: '14:00' },
  { id: 111, paciente: 'Moysés Costa de Almeida',  tipo: 'Sessão',         data: '2026-03-26', horario: '14:30' },
  { id: 112, paciente: 'Rafaela de Souza Bueno',   tipo: 'Sessão',         data: '2026-03-26', horario: '15:30' },
]
