'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import {
  Menu, LayoutDashboard, Building2, Settings2, LogOut,
} from 'lucide-react'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { createClient } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { useQueryClient } from '@tanstack/react-query'

const NAV_ITEMS = [
  { title: 'Visao Geral', href: '/clinitra-admin', icon: LayoutDashboard },
  { title: 'Clinicas', href: '/clinitra-admin/clinicas', icon: Building2 },
  { title: 'Planos', href: '/clinitra-admin/planos', icon: Settings2 },
]

export function AdminMobileHeader() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const queryClient = useQueryClient()

  function isActive(href: string) {
    if (href === '/clinitra-admin') return pathname === '/clinitra-admin'
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
    <header className="md:hidden flex items-center justify-between px-4 py-3 sidebar-brand shrink-0">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg overflow-hidden"
          style={{ backgroundColor: 'rgba(4,194,251,0.15)', border: '1px solid rgba(4,194,251,0.3)' }}>
          <Image src="/logo.png" alt="Clinitra" width={24} height={24} className="object-contain brightness-0 invert" />
        </div>
        <span className="text-sm font-bold text-white tracking-wider uppercase">Admin</span>
      </div>

      <button onClick={() => setOpen(true)} className="p-2 text-white/80 hover:text-white">
        <Menu className="h-5 w-5" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72 p-0 sidebar-brand border-none">
          <SheetTitle className="sr-only">Menu admin</SheetTitle>

          <div className="flex items-center gap-3 px-5 py-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl overflow-hidden"
              style={{ backgroundColor: 'rgba(4,194,251,0.15)', border: '1px solid rgba(4,194,251,0.3)' }}>
              <Image src="/logo.png" alt="Clinitra" width={28} height={28} className="object-contain brightness-0 invert" />
            </div>
            <div>
              <p className="text-sm font-bold text-white tracking-widest uppercase">Clinitra</p>
              <p className="text-[10px] text-white/75 tracking-wider uppercase">Painel Admin</p>
            </div>
          </div>

          <div className="mx-3 h-px bg-white/20" />

          <nav className="flex-1 px-3 py-4 space-y-0.5">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                  isActive(item.href)
                    ? 'text-white border border-white/30'
                    : 'text-white/70 hover:bg-white/15 hover:text-white'
                )}
                style={isActive(item.href) ? { backgroundColor: 'rgba(255,255,255,0.2)' } : undefined}
              >
                <item.icon className={cn('h-5 w-5', isActive(item.href) ? 'text-white' : 'text-white/60')} />
                <span>{item.title}</span>
              </Link>
            ))}
          </nav>

          <div className="mx-3 h-px bg-white/20" />

          <div className="p-3">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/70 hover:bg-white/15 hover:text-white transition-all"
            >
              <LogOut className="h-5 w-5 text-white/60" />
              <span>Sair</span>
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  )
}
