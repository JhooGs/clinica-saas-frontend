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
