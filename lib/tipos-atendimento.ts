export const TIPOS_ATENDIMENTO = [
  'Atendimento',
  'Atendimento família',
  'Atendimento em grupo',
  'Anamnese',
  'Devolutiva família',
  'Reunião com a escola',
  'Reunião multidisciplinar',
  'Outros',
] as const

export type TipoAtendimento = typeof TIPOS_ATENDIMENTO[number]
