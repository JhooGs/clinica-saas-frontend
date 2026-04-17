const SP = 'America/Sao_Paulo'

/** Data de hoje em SP no formato YYYY-MM-DD */
export function hojeISO(): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: SP }).format(new Date())
}

/** Data de N dias atrás em SP no formato YYYY-MM-DD */
export function diasAtrasISO(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return new Intl.DateTimeFormat('sv-SE', { timeZone: SP }).format(d)
}

/** Retorna um Date cujos getHours/getMinutes refletem a hora atual em SP */
export function nowSP(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: SP }))
}
