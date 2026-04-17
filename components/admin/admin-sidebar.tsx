'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  LayoutDashboard, Building2, Settings2, LogOut, PanelLeft,
} from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { createClient } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { title: 'Visao Geral', href: '/clinitra-admin', icon: LayoutDashboard },
  { title: 'Clinicas', href: '/clinitra-admin/clinicas', icon: Building2 },
  { title: 'Planos', href: '/clinitra-admin/planos', icon: Settings2 },
]

function NavItem({
  item,
  active,
  collapsed,
}: {
  item: { title: string; href: string; icon: React.ElementType }
  active: boolean
  collapsed: boolean
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
      {!collapsed && <span className="truncate flex-1">{item.title}</span>}
    </Link>
  )
}

export function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [email, setEmail] = useState('')
  const [initials, setInitials] = useState('CA')
  const [collapsed, setCollapsed] = useState(false)

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
    if (href === '/clinitra-admin') return pathname === '/clinitra-admin'
    return pathname.startsWith(href)
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
          <button
            onClick={() => setCollapsed(false)}
            title="Expandir menu"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white transition-all duration-150 hover:brightness-110"
            style={{ backgroundColor: 'rgba(4,194,251,0.35)', boxShadow: '0 0 12px rgba(4,194,251,0.5)' }}
          >
            <PanelLeft className="h-4 w-4" />
          </button>
        ) : (
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
                Painel Admin
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
        'flex-1 overflow-y-auto py-4 space-y-0.5',
        collapsed ? 'px-1' : 'px-3'
      )}>
        {NAV_ITEMS.map((item) => (
          <NavItem key={item.href} item={item} active={isActive(item.href)} collapsed={collapsed} />
        ))}
      </nav>

      <div className="mx-3 h-px bg-white/20" />

      {/* Footer */}
      <div className={cn('p-3', collapsed && 'flex flex-col items-center gap-2')}>
        {collapsed ? (
          <>
            <Avatar className="h-8 w-8 shrink-0" title={email || 'Admin'}>
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
                {email || 'Admin'}
              </p>
              <p className="text-[10px] text-white/75 mt-0.5 leading-none">
                Clinitra Admin
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
