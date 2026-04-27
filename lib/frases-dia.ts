export const FRASES_COM_ATENDIMENTOS = [
  'Tudo pronto pro dia.',
  'Que o dia seja leve e produtivo.',
  'Um atendimento de cada vez, com calma e presença.',
  'Foco, empatia e um bom café.',
  'Bora fazer um dia incrível.',
  'Respira fundo, você está preparado.',
  'Cada atendimento é uma chance de cuidar de alguém.',
  'Dia cheio, mas dá pra fazer bonito.',
  'Um novo dia, uma nova oportunidade de fazer algo melhor.',
]

export const FRASES_SEM_ATENDIMENTOS = [
  'Hoje o dia está mais tranquilo.',
  'Um bom momento pra colocar os registros em dia.',
  'Agenda livre: aproveita pra respirar.',
  'Dia sem atendimentos, ótimo pra planejar a semana.',
  'Sem atendimentos hoje, uma pausa merecida.',
  'Tempo livre pra cuidar do que ficou pendente.',
  'Dia calmo pela frente, aproveite ele bem.',
]

/** seed: valor de Math.random() fixo por montagem do componente */
export function escolherFrase(temAtendimentos: boolean, seed: number): string {
  const lista = temAtendimentos ? FRASES_COM_ATENDIMENTOS : FRASES_SEM_ATENDIMENTOS
  return lista[Math.floor(seed * lista.length)]
}
