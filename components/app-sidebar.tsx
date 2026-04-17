'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  Home, Users, ClipboardList, CalendarDays,
  DollarSign, BarChart2, Settings, LogOut, PanelLeft, Package, UserCog,
} from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { createClient } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { usePermissions } from '@/hooks/use-permissions'
import type { Role } from '@/types'

function roleLabel(role: Role | null): string {
  switch (role) {
    case 'super_admin': return 'Super Admin'
    case 'admin': return 'Admin'
    case 'usuario': return 'Usuário'
    default: return 'Usuário'
  }
}

function NavItem({
  item,
  active,
  collapsed,
  badge,
}: {
  item: { title: string; href: string; icon: React.ElementType }
  active: boolean
  collapsed: boolean
  badge?: number
}) {
  return (
    <Link
      href={item.href}
      title={collapsed ? item.title : undefined}
      className={cn(
        'relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
        collapsed && 'justify-center px-0',
        active
          ? 'text-white border border-white/30'
          : 'text-white/70 hover:bg-white/15 hover:text-white'
      )}
      style={active ? { backgroundColor: 'rgba(255,255,255,0.2)' } : undefined}
    >
      <item.icon className={cn(
        'h-5 w-5 shrink-0 transition-colors',
        active ? 'text-white' : 'text-white/60'
      )} />
      {!collapsed && (
        <>
          <span className="truncate flex-1">{item.title}</span>
          {!!badge && badge > 0 && (
            <span className="flex items-center justify-center h-5 min-w-5 rounded-full bg-amber-400 text-[10px] font-bold text-amber-950 px-1.5 shrink-0">
              {badge}
            </span>
          )}
        </>
      )}
      {collapsed && !!badge && badge > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center h-4 w-4 rounded-full bg-amber-400 text-[9px] font-bold text-amber-950">
          {badge}
        </span>
      )}
    </Link>
  )
}

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [email, setEmail] = useState('')
  const [initials, setInitials] = useState('CL')
  const [collapsed, setCollapsed] = useState(false)
  const { role, can, isSuperAdmin, isAdmin } = usePermissions()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      const e = data.user?.email ?? ''
      setEmail(e)
      setInitials(e.slice(0, 2).toUpperCase())
    })
  }, [])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    queryClient.clear()
    router.push('/auth/login')
    router.refresh()
  }

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  if (pathname.startsWith('/dashboard/onboarding')) {
    return null
  }

  return (
    <aside
      className={cn(
        'sidebar-brand relative hidden md:flex h-screen shrink-0 flex-col overflow-visible transition-all duration-300',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo + Toggle */}
      <div className={cn(
        'flex items-center py-5',
        collapsed ? 'justify-center px-0' : 'gap-3 px-5'
      )}>
        {collapsed ? (
          /* Fechado: botão ocupa o lugar da logo */
          <button
            onClick={() => setCollapsed(false)}
            title="Expandir menu"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white transition-all duration-150 hover:brightness-110"
            style={{ backgroundColor: 'rgba(4,194,251,0.35)', boxShadow: '0 0 12px rgba(4,194,251,0.5)' }}
          >
            <PanelLeft className="h-4 w-4" />
          </button>
        ) : (
          /* Aberto: logo + texto + botão toggle alinhado à direita */
          <>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl overflow-hidden"
              style={{ backgroundColor: 'rgba(4,194,251,0.15)', border: '1px solid rgba(4,194,251,0.3)' }}>
              <Image
                src="/logo.png"
                alt="Clinitra"
                width={28}
                height={28}
                className="object-contain brightness-0 invert"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white tracking-widest leading-none uppercase">
                Clinitra
              </p>
              <p className="text-[10px] text-white/75 mt-0.5 leading-none tracking-wider uppercase">
                Gestão Clínica
              </p>
            </div>
            <button
              onClick={() => setCollapsed(true)}
              title="Recolher menu"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-white transition-all duration-150 hover:brightness-110"
              style={{ backgroundColor: 'rgba(4,194,251,0.35)', boxShadow: '0 0 10px rgba(4,194,251,0.45)' }}
            >
              <PanelLeft className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>

      <div className="mx-3 h-px bg-white/20" />

      {/* Nav */}
      <nav className={cn(
        'flex-1 overflow-y-auto py-4 space-y-5',
        collapsed ? 'px-1' : 'px-3'
      )}>
        <div className="space-y-0.5">
          {!collapsed && (
            <p className="px-3 text-[10px] font-semibold uppercase tracking-widest text-white/60 mb-2">
              Principal
            </p>
          )}
          <NavItem item={{ title: 'Início', href: '/dashboard', icon: Home }} active={isActive('/dashboard')} collapsed={collapsed} />
          {can('pacientes') && (
            <NavItem item={{ title: 'Pacientes', href: '/dashboard/pacientes', icon: Users }} active={isActive('/dashboard/pacientes')} collapsed={collapsed} />
          )}
          {can('registros') && (
            <NavItem item={{ title: 'Registros', href: '/dashboard/registros', icon: ClipboardList }} active={isActive('/dashboard/registros')} collapsed={collapsed} />
          )}
          {can('agenda') && (
            <NavItem item={{ title: 'Agenda', href: '/dashboard/agenda', icon: CalendarDays }} active={isActive('/dashboard/agenda')} collapsed={collapsed} />
          )}
          {can('relatorios') && (
            <NavItem item={{ title: 'Relatórios', href: '/dashboard/relatorios', icon: BarChart2 }} active={isActive('/dashboard/relatorios')} collapsed={collapsed} />
          )}
          {can('financeiro') && (
            <NavItem item={{ title: 'Financeiro', href: '/dashboard/financeiro', icon: DollarSign }} active={isActive('/dashboard/financeiro')} collapsed={collapsed} />
          )}
        </div>

        {(isAdmin || isSuperAdmin) && (
          <div className="space-y-0.5">
            {!collapsed && (
              <p className="px-3 text-[10px] font-semibold uppercase tracking-widest text-white/60 mb-2">
                Administração
              </p>
            )}
            <NavItem item={{ title: 'Usuários', href: '/dashboard/usuarios', icon: UserCog }} active={isActive('/dashboard/usuarios')} collapsed={collapsed} />
            {isSuperAdmin && (
              <>
                <NavItem item={{ title: 'Planos', href: '/dashboard/planos', icon: Package }} active={isActive('/dashboard/planos')} collapsed={collapsed} />
                <NavItem item={{ title: 'Configurações', href: '/dashboard/configuracoes', icon: Settings }} active={isActive('/dashboard/configuracoes')} collapsed={collapsed} />
              </>
            )}
          </div>
        )}
      </nav>

      <div className="mx-3 h-px bg-white/20" />

      {/* Footer */}
      <div className={cn('p-3', collapsed && 'flex flex-col items-center gap-2')}>
        {collapsed ? (
          <>
            <Avatar className="h-8 w-8 shrink-0" title={email || 'Usuário'}>
              <AvatarFallback className="text-[11px] font-bold text-white" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                {initials}
              </AvatarFallback>
            </Avatar>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-md hover:bg-white/20 text-white/70 hover:text-white transition-colors"
              title="Sair"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </>
        ) : (
          <div className="flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-white/15 transition-colors">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarFallback className="text-[11px] font-bold text-white" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate leading-none">
                {email || 'Usuário'}
              </p>
              <p className="text-[10px] text-white/75 mt-0.5 leading-none">
                {roleLabel(role)}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-md hover:bg-white/20 text-white/70 hover:text-white transition-colors"
              title="Sair"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
