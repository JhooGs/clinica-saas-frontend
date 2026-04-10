import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const role = user?.user_metadata?.role as string | undefined

  // ── Guard: /clinitra-admin/* — apenas clinitra_admin ──────────────────────
  if (pathname.startsWith('/clinitra-admin')) {
    if (!user || role !== 'clinitra_admin') {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }
    return supabaseResponse
  }

  // ── clinitra_admin nunca acessa /dashboard (nao tem clinica_id) ───────────
  if (user && role === 'clinitra_admin' && pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/clinitra-admin', request.url))
  }

  // ── Guard: /dashboard/* — exige autenticacao ─────────────────────────────
  if (!user && pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  // ── Redirect pos-login: auth → destino correto ───────────────────────────
  if (user && pathname.startsWith('/auth')) {
    const rotasPermitidas = ['/auth/aguardando-confirmacao', '/auth/nova-senha']
    if (!rotasPermitidas.some(r => pathname.startsWith(r))) {
      if (role === 'clinitra_admin') {
        return NextResponse.redirect(new URL('/clinitra-admin', request.url))
      }
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  // Usuário autenticado mas sem clinica_id → e-mail ainda não confirmado
  if (user && !user.user_metadata?.clinica_id && pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/auth/aguardando-confirmacao', request.url))
  }

  if (user) {
    const isSuperAdmin = role === 'super_admin'
    const isAdmin = role === 'admin'

    if (pathname.startsWith('/dashboard/usuarios') && !isSuperAdmin && !isAdmin) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    if (
      (pathname.startsWith('/dashboard/configuracoes') || pathname.startsWith('/dashboard/planos')) &&
      !isSuperAdmin
    ) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/dashboard/:path*', '/auth/:path*', '/clinitra-admin/:path*'],
}