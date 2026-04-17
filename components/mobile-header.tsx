'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import {
  Menu, X as XIcon, Home, Users, ClipboardList, CalendarDays,
  DollarSign, BarChart2, Settings, LogOut, Package, UserCog,
} from 'lucide-react'
import { NotificationsBell } from '@/components/notifications-bell'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { createClient } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { useQueryClient } from '@tanstack/react-query'
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

export function MobileHeader() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [email, setEmail] = useState('')
  const [initials, setInitials] = useState('CL')
  const { role, can, isSuperAdmin, isAdmin } = usePermissions()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      const e = data.user?.email ?? ''
      setEmail(e)
      setInitials(e.slice(0, 2).toUpperCase())
    })
  }, [])

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    queryClient.clear()
    router.push('/auth/login')
    router.refresh()
  }

  return (
    <>
      {/* Barra superior visível apenas em mobile */}
      <header className="flex md:hidden shrink-0 items-center justify-between border-b bg-background px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg overflow-hidden shrink-0"
            style={{ background: 'linear-gradient(135deg, #0094c8, #04c2fb)' }}
          >
            <Image src="/logo.png" alt="Clinitra" width={20} height={20} className="object-contain brightness-0 invert" />
          </div>
          <span className="text-sm font-bold tracking-widest uppercase text-[#04c2fb]">Clinitra</span>
        </div>
        <div className="flex items-center gap-1">
          <NotificationsBell />
          <button
            onClick={() => setOpen(v => !v)}
            aria-label={open ? 'Fechar menu' : 'Abrir menu'}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-900 hover:bg-gray-100 active:bg-gray-200 transition-colors duration-150"
          >
          <span
            className="relative flex h-5 w-5 items-center justify-center"
            style={{ transition: 'transform 0.2s linear' }}
          >
            <Menu
              className="absolute h-5 w-5 transition-all duration-200 linear"
              style={{ opacity: open ? 0 : 1, transform: open ? 'rotate(90deg) scale(0.7)' : 'rotate(0deg) scale(1)' }}
            />
            <XIcon
              className="absolute h-5 w-5 transition-all duration-200 linear"
              style={{ opacity: open ? 1 : 0, transform: open ? 'rotate(0deg) scale(1)' : 'rotate(-90deg) scale(0.7)' }}
            />
          </span>
          </button>
        </div>
      </header>

      {/* Drawer lateral para mobile */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="left"
          showCloseButton={false}
          className="w-60 p-0 gap-0 border-r-0 bg-transparent"
        >
          <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
          <div className="sidebar-brand flex h-full flex-col">
            {/* Logo */}
            <div className="flex items-center gap-3 px-5 py-5">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl overflow-hidden"
                style={{ backgroundColor: 'rgba(4,194,251,0.15)', border: '1px solid rgba(4,194,251,0.3)' }}
              >
                <Image src="/logo.png" alt="Clinitra" width={28} height={28} className="object-contain brightness-0 invert" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white tracking-widest leading-none uppercase">Clinitra</p>
                <p className="text-[10px] text-white/75 mt-0.5 leading-none tracking-wider uppercase">Gestão Clínica</p>
              </div>
            </div>

            <div className="mx-3 h-px bg-white/20" />

            {/* Nav links */}
            <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
              {[
                { title: 'Início', href: '/dashboard', icon: Home, show: true },
                { title: 'Pacientes', href: '/dashboard/pacientes', icon: Users, show: can('pacientes') },
                { title: 'Registros', href: '/dashboard/registros', icon: ClipboardList, show: can('registros') },
                { title: 'Agenda', href: '/dashboard/agenda', icon: CalendarDays, show: can('agenda') },
                { title: 'Relatórios', href: '/dashboard/relatorios', icon: BarChart2, show: can('relatorios') },
                { title: 'Financeiro', href: '/dashboard/financeiro', icon: DollarSign, show: can('financeiro') },
                { title: 'Usuários', href: '/dashboard/usuarios', icon: UserCog, show: isAdmin || isSuperAdmin },
                { title: 'Planos', href: '/dashboard/planos', icon: Package, show: isSuperAdmin },
                { title: 'Configurações', href: '/dashboard/configuracoes', icon: Settings, show: isSuperAdmin },
              ].filter(item => item.show).map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
                    isActive(item.href)
                      ? 'text-white border border-white/30'
                      : 'text-white/70 hover:bg-white/15 hover:text-white',
                  )}
                  style={isActive(item.href) ? { backgroundColor: 'rgba(255,255,255,0.2)' } : undefined}
                >
                  <item.icon className={cn(
                    'h-5 w-5 shrink-0',
                    isActive(item.href) ? 'text-white' : 'text-white/60',
                  )} />
                  <span className="flex-1">{item.title}</span>
                </Link>
              ))}
            </nav>

            <div className="mx-3 h-px bg-white/20" />

            {/* Footer de usuário */}
            <div className="p-3">
              <div className="flex items-center gap-3 rounded-lg px-2 py-2.5">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="text-[11px] font-bold text-white" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white truncate leading-none">{email || 'Usuário'}</p>
                  <p className="text-[10px] text-white/75 mt-0.5 leading-none">{roleLabel(role)}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-1.5 rounded-md hover:bg-white/20 text-white/70 hover:text-white transition-colors"
                  title="Sair"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
