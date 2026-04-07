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

  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  if (user && request.nextUrl.pathname.startsWith('/auth')) {
    // Permitir acesso a estas rotas mesmo autenticado
    const rotasPermitidas = ['/auth/aguardando-confirmacao', '/auth/nova-senha']
    if (!rotasPermitidas.some(r => request.nextUrl.pathname.startsWith(r))) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  // Usuário autenticado mas sem clinica_id → e-mail ainda não confirmado
  if (user && !user.user_metadata?.clinica_id && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/auth/aguardando-confirmacao', request.url))
  }

  if (user) {
    const role = user.user_metadata?.role as string | undefined
    const pathname = request.nextUrl.pathname

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
  matcher: ['/dashboard/:path*', '/auth/:path*'],
}