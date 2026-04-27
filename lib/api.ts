import { toast } from 'sonner'
import { createClient } from '@/lib/supabase'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

// ── Erros tipados ─────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly detail?: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/** 403 — endpoint exige MFA completado (AAL2). Tratar exibindo ModalMFARequired. */
export class MFARequiredError extends ApiError {
  constructor() {
    super(403, 'Autenticação de dois fatores obrigatória para esta operação.')
    this.name = 'MFARequiredError'
  }
}

/** 429 — limite de requisições atingido. Toast exibido automaticamente pelo apiFetch. */
export class RateLimitError extends ApiError {
  constructor() {
    super(429, 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.')
    this.name = 'RateLimitError'
  }
}

// ── apiFetch ──────────────────────────────────────────────────────────────────

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  })

  if (!res.ok) {
    // 429 — toast global automático, sem precisar tratar em cada mutation
    if (res.status === 429) {
      toast.warning('Muitas tentativas', {
        description: 'Aguarde alguns minutos antes de tentar novamente.',
        id: 'rate-limit', // evita empilhar toasts iguais
      })
      throw new RateLimitError()
    }

    const text = await res.text()

    // 403 MFA — surface como erro tipado para o componente exibir ModalMFARequired
    if (res.status === 403 && text.includes('dois fatores')) throw new MFARequiredError()

    throw new ApiError(res.status, `Erro ${res.status}`, text)
  }

  if (res.status === 204 || res.headers.get('content-length') === '0') return undefined as T
  return res.json()
}
