'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import {
  initTokenClient,
  requestToken,
  saveTokenLocally,
  loadTokenLocally,
  clearTokenLocally,
  fetchEvents,
  createEvent,
  deleteEvent as deleteGcalEvent,
  mapGoogleEvent,
  type GoogleTokenInfo,
  type AgendamentoComSource,
} from '@/lib/google-calendar'

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? ''

// Janela de busca: hoje - 7 dias até hoje + 60 dias
function getTimeWindow() {
  const now = new Date()
  const min = new Date(now)
  min.setDate(min.getDate() - 7)
  const max = new Date(now)
  max.setDate(max.getDate() + 60)
  return { timeMin: min.toISOString(), timeMax: max.toISOString() }
}

type TokenClient = {
  requestAccessToken: (options?: { prompt?: string }) => void
}

export function useGoogleCalendar() {
  const [connected, setConnected] = useState(false)
  const [googleEmail, setGoogleEmail] = useState<string | null>(null)
  const [events, setEvents] = useState<AgendamentoComSource[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [lastSynced, setLastSynced] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)

  const tokenRef = useRef<GoogleTokenInfo | null>(null)
  const clientRef = useRef<TokenClient | null>(null)
  const supabase = createClient()

  // -------------------------------------------------------------------------
  // Busca eventos do Google Calendar
  // -------------------------------------------------------------------------
  const loadEvents = useCallback(async (accessToken: string) => {
    try {
      const { timeMin, timeMax } = getTimeWindow()
      const raw = await fetchEvents(accessToken, timeMin, timeMax)
      setEvents(raw.map(mapGoogleEvent))
      setLastSynced(new Date())
    } catch (err) {
      console.error('Erro ao buscar eventos Google Calendar:', err)
      setEvents([])
    }
  }, [])

  // -------------------------------------------------------------------------
  // Inicializa o token client GIS (após script carregar)
  // -------------------------------------------------------------------------
  const ensureClient = useCallback(
    (onReady: (client: TokenClient) => void) => {
      if (clientRef.current) {
        onReady(clientRef.current)
        return
      }

      const tryInit = () => {
        const client = initTokenClient(
          CLIENT_ID,
          (tokenInfo) => {
            tokenRef.current = tokenInfo
            saveTokenLocally(tokenInfo)
            setConnected(true)
            setError(null)
            loadEvents(tokenInfo.access_token)
          },
          (err) => {
            if (err !== 'popup_closed_by_user' && err !== 'access_denied') {
              setError('Falha na autenticação com o Google.')
            }
            setLoading(false)
          }
        )

        if (client) {
          clientRef.current = client
          onReady(client)
        } else {
          // Script ainda não carregou — aguarda
          setTimeout(tryInit, 500)
        }
      }

      tryInit()
    },
    [loadEvents]
  )

  // -------------------------------------------------------------------------
  // Na montagem: verifica metadata do Supabase e tenta token silencioso
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!CLIENT_ID) return

    const init = async () => {
      // Verifica user_metadata
      const { data } = await supabase.auth.getUser()
      const meta = data?.user?.user_metadata ?? {}
      const wasConnected = meta.gcal_connected === true
      const storedEmail = meta.gcal_email as string | undefined

      // Token ainda válido no localStorage?
      const local = loadTokenLocally()
      if (local) {
        tokenRef.current = local
        setConnected(true)
        if (storedEmail) setGoogleEmail(storedEmail)
        loadEvents(local.access_token)
        return
      }

      // Sem token local, mas metadata diz conectado → tenta silencioso
      if (wasConnected) {
        if (storedEmail) setGoogleEmail(storedEmail)
        ensureClient((client) => {
          requestToken(client, true) // silent
        })
      }
    }

    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // -------------------------------------------------------------------------
  // Conectar (abre popup)
  // -------------------------------------------------------------------------
  const connect = useCallback(() => {
    if (!CLIENT_ID) {
      setError('NEXT_PUBLIC_GOOGLE_CLIENT_ID não configurado.')
      return
    }
    setLoading(true)
    setError(null)

    ensureClient((client) => {
      // Após receber token, salva metadata no Supabase
      const originalCallback = client.requestAccessToken.bind(client)
      void originalCallback // usado abaixo

      // Sobrescreve o callback via closure do initTokenClient — aqui usamos
      // o onToken já definido em ensureClient; apenas chamamos requestToken
      requestToken(client, false)

      // O callback do initTokenClient cuida de setConnected + loadEvents;
      // aqui só precisamos atualizar o Supabase metadata após token chegar.
      // Para isso, observamos tokenRef em um polling rápido (max 30s).
      const start = Date.now()
      const poll = setInterval(async () => {
        if (tokenRef.current || Date.now() - start > 30_000) {
          clearInterval(poll)
          setLoading(false)

          if (tokenRef.current) {
            // Busca email da conta Google (userinfo)
            try {
              const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${tokenRef.current.access_token}` },
              })
              if (res.ok) {
                const info = await res.json()
                const email = info.email as string
                setGoogleEmail(email)
                await supabase.auth.updateUser({
                  data: { gcal_connected: true, gcal_email: email },
                })
              }
            } catch {}
          }
        }
      }, 500)
    })
  }, [ensureClient, supabase])

  // -------------------------------------------------------------------------
  // Desconectar
  // -------------------------------------------------------------------------
  const disconnect = useCallback(async () => {
    clearTokenLocally()
    tokenRef.current = null
    setConnected(false)
    setGoogleEmail(null)
    setEvents([])
    await supabase.auth.updateUser({
      data: { gcal_connected: false, gcal_email: null },
    })
  }, [supabase])

  // -------------------------------------------------------------------------
  // Exportar agendamento Clinitra → Google Calendar
  // -------------------------------------------------------------------------
  const exportEvent = useCallback(
    async (ag: { paciente: string; tipo: string; data: string; horario: string; horarioFim?: string }) => {
      if (!tokenRef.current) throw new Error('Não conectado ao Google Calendar.')

      const start = new Date(`${ag.data}T${ag.horario}:00`)
      const end = ag.horarioFim
        ? new Date(`${ag.data}T${ag.horarioFim}:00`)
        : new Date(start.getTime() + 50 * 60_000) // fallback: 50 min

      await createEvent(tokenRef.current.access_token, {
        summary: `${ag.tipo} — ${ag.paciente}`,
        description: `Agendamento Clinitra\nPaciente: ${ag.paciente}\nTipo: ${ag.tipo}`,
        start: start.toISOString(),
        end: end.toISOString(),
      })
    },
    []
  )

  // -------------------------------------------------------------------------
  // Deletar evento do Google Calendar
  // -------------------------------------------------------------------------
  const deleteEventFromGoogle = useCallback(
    async (googleEventId: string) => {
      if (!tokenRef.current) throw new Error('Não conectado ao Google Calendar.')
      await deleteGcalEvent(tokenRef.current.access_token, googleEventId)
    },
    []
  )

  // -------------------------------------------------------------------------
  // Atualizar eventos manualmente
  // -------------------------------------------------------------------------
  const refresh = useCallback(async () => {
    if (!tokenRef.current || refreshing) return
    setRefreshing(true)
    try {
      const { timeMin, timeMax } = getTimeWindow()
      const raw = await fetchEvents(tokenRef.current.access_token, timeMin, timeMax)
      setEvents(raw.map(mapGoogleEvent))
      setLastSynced(new Date())
    } catch (err) {
      console.error('Erro ao atualizar eventos Google Calendar:', err)
    } finally {
      setRefreshing(false)
    }
  }, [refreshing])

  return {
    connected,
    googleEmail,
    events,
    loading,
    refreshing,
    lastSynced,
    error,
    connect,
    disconnect,
    exportEvent,
    deleteEventFromGoogle,
    refresh,
  }
}
