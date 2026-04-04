'use client'

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase'
import { apiFetch } from '@/lib/api'
import type { Role, Permissoes } from '@/types'

export function usePermissions() {
  const [role, setRole] = useState<Role | null>(null)
  const [roleLoading, setRoleLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      const r = (data.user?.user_metadata?.role ?? null) as Role | null
      setRole(r)
      setRoleLoading(false)
    })
  }, [])

  const isSuperAdmin = role === 'super_admin'

  const { data: permissoes, isLoading: permissoesLoading } = useQuery<Permissoes | null>({
    queryKey: ['permissoes'],
    queryFn: () =>
      apiFetch<{ role: string; permissoes: Permissoes | null; acesso_total: boolean }>(
        '/api/v1/usuarios/me/permissoes'
      ).then((r) => r.permissoes),
    staleTime: Infinity,
    enabled: !roleLoading && !isSuperAdmin,
  })

  function can(module: string): boolean {
    if (isSuperAdmin) return true
    if (!permissoes) return false
    return (permissoes as unknown as Record<string, boolean>)[module] ?? false
  }

  const isLoading = roleLoading || (!isSuperAdmin && permissoesLoading)

  return {
    role,
    permissoes: isSuperAdmin ? null : permissoes ?? null,
    can,
    isSuperAdmin,
    isAdmin: role === 'admin',
    isLoading,
  }
}
