'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  LayoutDashboard, Users, FileText,
  DollarSign, BarChart2, Settings, LogOut,
} from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { createClient } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

const navMain = [
  { title: 'Dashboard',   href: '/dashboard',             icon: LayoutDashboard },
  { title: 'Pacientes',   href: '/dashboard/pacientes',   icon: Users },
  { title: 'Prontuários', href: '/dashboard/prontuarios', icon: FileText },
  { title: 'Financeiro',  href: '/dashboard/financeiro',  icon: DollarSign },
  { title: 'Relatórios',  href: '/dashboard/relatorios',  icon: BarChart2 },
]

const navAdmin = [
  { title: 'Configurações', href: '/dashboard/configuracoes', icon: Settings },
]

function NavItem({
  item, active,
}: {
  item: { title: string; href: string; icon: React.ElementType }
  active: boolean
}) {
  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
        active
          ? 'text-white border border-white/30'
          : 'text-white/70 hover:bg-white/15 hover:text-white'
      )}
      style={active ? { backgroundColor: 'rgba(255,255,255,0.2)' } : undefined}
    >
      <item.icon className={cn(
        'h-4 w-4 shrink-0 transition-colors',
        active ? 'text-white' : 'text-white/60'
      )} />
      {item.title}
    </Link>
  )
}

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [initials, setInitials] = useState('CL')

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
    router.push('/auth/login')
    router.refresh()
  }

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  return (
    <aside className="sidebar-brand flex h-screen w-60 shrink-0 flex-col">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl overflow-hidden" style={{ backgroundColor: 'rgba(4,194,251,0.15)', border: '1px solid rgba(4,194,251,0.3)' }}>
          <Image
            src="/logo.png"
            alt="Clinitra"
            width={28}
            height={28}
            className="object-contain brightness-0 invert"
          />
        </div>
        <div>
          <p className="text-sm font-bold text-white tracking-widest leading-none uppercase">
            Clinitra
          </p>
          <p className="text-[10px] text-white/75 mt-0.5 leading-none tracking-wider uppercase">
            Gestão Clínica
          </p>
        </div>
      </div>

      <div className="mx-4 h-px bg-white/20" />

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        <div className="space-y-0.5">
          <p className="px-3 text-[10px] font-semibold uppercase tracking-widest text-white/60 mb-2">
            Principal
          </p>
          {navMain.map((item) => (
            <NavItem key={item.href} item={item} active={isActive(item.href)} />
          ))}
        </div>

        <div className="space-y-0.5">
          <p className="px-3 text-[10px] font-semibold uppercase tracking-widest text-white/60 mb-2">
            Administração
          </p>
          {navAdmin.map((item) => (
            <NavItem key={item.href} item={item} active={isActive(item.href)} />
          ))}
        </div>
      </nav>

      <div className="mx-4 h-px bg-white/20" />

      {/* Footer */}
      <div className="p-3">
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
              Administrador
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
      </div>
    </aside>
  )
}