// ---------------------------------------------------------------------------
// Google Calendar — helpers OAuth (GIS) + chamadas à API Calendar
// ---------------------------------------------------------------------------

export type GoogleTokenInfo = {
  access_token: string
  expiry: number // timestamp ms
}

export type GoogleCalendarEvent = {
  id: string
  summary: string
  start: { dateTime?: string; date?: string }
  end: { dateTime?: string; date?: string }
  description?: string
}

// Tipo compatível com RelatorioPendente + campo extra source
export type AgendamentoComSource = {
  id: number | string
  paciente: string
  paciente_id?: string         // UUID, presente para agendamentos Clinitra
  pacientes?: string[]         // nomes (display)
  pacientes_ids?: string[]     // UUIDs (sessão em grupo)
  tipo: string
  data: string
  horario: string
  horarioFim?: string
  source?: 'google' | 'clinitra' | 'recorrente'
  googleEventId?: string
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string
            scope: string
            callback: (response: { access_token?: string; error?: string }) => void
            error_callback?: (error: { type: string }) => void
          }) => TokenClient
        }
      }
    }
  }
}

type TokenClient = {
  requestAccessToken: (options?: { prompt?: string }) => void
}

const GCAL_API = 'https://www.googleapis.com/calendar/v3'
const LS_KEY = 'clinitra_gcal_token'

// ---------------------------------------------------------------------------
// Persistência local
// ---------------------------------------------------------------------------

export function saveTokenLocally(info: GoogleTokenInfo): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(info))
  } catch {}
}

export function loadTokenLocally(): GoogleTokenInfo | null {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return null
    const info = JSON.parse(raw) as GoogleTokenInfo
    if (info.expiry < Date.now()) {
      localStorage.removeItem(LS_KEY)
      return null
    }
    return info
  } catch {
    return null
  }
}

export function clearTokenLocally(): void {
  try {
    localStorage.removeItem(LS_KEY)
  } catch {}
}

// ---------------------------------------------------------------------------
// Token client GIS
// ---------------------------------------------------------------------------

export function initTokenClient(
  clientId: string,
  onToken: (token: GoogleTokenInfo) => void,
  onError?: (err: string) => void
): TokenClient | null {
  if (typeof window === 'undefined' || !window.google?.accounts?.oauth2) return null

  return window.google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: 'https://www.googleapis.com/auth/calendar',
    callback: (response) => {
      if (response.access_token) {
        onToken({
          access_token: response.access_token,
          expiry: Date.now() + 55 * 60 * 1000, // 55 min (margem de 5min)
        })
      } else {
        onError?.(response.error ?? 'unknown_error')
      }
    },
    error_callback: (err) => {
      onError?.(err.type)
    },
  })
}

export function requestToken(client: TokenClient, silent = false): void {
  client.requestAccessToken({ prompt: silent ? '' : 'select_account' })
}

// ---------------------------------------------------------------------------
// Chamadas à API
// ---------------------------------------------------------------------------

export async function fetchEvents(
  accessToken: string,
  timeMin: string,
  timeMax: string
): Promise<GoogleCalendarEvent[]> {
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '100',
  })

  const res = await fetch(`${GCAL_API}/calendars/primary/events?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!res.ok) throw new Error(`Google Calendar API error: ${res.status}`)
  const data = await res.json()
  return (data.items ?? []) as GoogleCalendarEvent[]
}

export async function createEvent(
  accessToken: string,
  event: {
    summary: string
    description?: string
    start: string // ISO datetime
    end: string
  }
): Promise<GoogleCalendarEvent> {
  const body = {
    summary: event.summary,
    description: event.description,
    start: { dateTime: event.start, timeZone: 'America/Sao_Paulo' },
    end: { dateTime: event.end, timeZone: 'America/Sao_Paulo' },
  }

  const res = await fetch(`${GCAL_API}/calendars/primary/events`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) throw new Error(`Google Calendar create error: ${res.status}`)
  return res.json()
}

export async function deleteEvent(accessToken: string, eventId: string): Promise<void> {
  const res = await fetch(`${GCAL_API}/calendars/primary/events/${eventId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok && res.status !== 404) throw new Error(`Google Calendar delete error: ${res.status}`)
}

// ---------------------------------------------------------------------------
// Mapeamento Google Event → AgendamentoComSource
// ---------------------------------------------------------------------------

export function mapGoogleEvent(event: GoogleCalendarEvent): AgendamentoComSource {
  const dateTimeStr = event.start.dateTime ?? event.start.date ?? ''
  const data = dateTimeStr.substring(0, 10)
  const horario = event.start.dateTime
    ? new Date(event.start.dateTime).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '00:00'
  const horarioFim = event.end?.dateTime
    ? new Date(event.end.dateTime).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : undefined

  const nome = event.summary ?? '(sem título)'
  return {
    id: `gcal_${event.id}`,
    paciente: nome,
    pacientes: [nome],
    tipo: 'Google Calendar',
    data,
    horario,
    horarioFim,
    source: 'google',
    googleEventId: event.id,
  }
}
