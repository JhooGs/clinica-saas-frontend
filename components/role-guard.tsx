'use client'

import { usePermissions } from '@/hooks/use-permissions'
import type { Role } from '@/types'

interface RoleGuardProps {
  roles: Role[]
  children: React.ReactNode
}

export function RoleGuard({ roles, children }: RoleGuardProps) {
  const { role, isLoading } = usePermissions()

  if (isLoading || !role) return null
  if (!roles.includes(role)) return null

  return <>{children}</>
}

interface ModuleGuardProps {
  module: string
  children: React.ReactNode
}

export function ModuleGuard({ module, children }: ModuleGuardProps) {
  const { can, isLoading } = usePermissions()

  if (isLoading) return null
  if (!can(module)) return null

  return <>{children}</>
}
