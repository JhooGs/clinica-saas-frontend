'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { SlidersHorizontal, Database, Plug, Tag } from 'lucide-react'

const configNav = [
  { title: 'Geral',           href: '/dashboard/configuracoes',              icon: SlidersHorizontal },
  { title: 'Tipos de Sessão', href: '/dashboard/configuracoes/tipos-sessao', icon: Tag },
  { title: 'Dados',           href: '/dashboard/configuracoes/dados',         icon: Database },
  { title: 'Conexões',        href: '/dashboard/configuracoes/conexoes',      icon: Plug },
]

export default function ConfiguracoesLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Configurações</h1>
        <p className="text-muted-foreground mt-1">Gerencie as configurações da clínica</p>
      </div>

      {/* Mobile: nav horizontal scrollável */}
      <nav className="flex md:hidden gap-1 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
        {configNav.map(item => {
          const active =
            item.href === '/dashboard/configuracoes'
              ? pathname === '/dashboard/configuracoes'
              : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors shrink-0',
                active
                  ? 'bg-[#04c2fb]/10 text-[#04c2fb]'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
              )}
            >
              <item.icon className="h-3.5 w-3.5 shrink-0" />
              {item.title}
            </Link>
          )
        })}
      </nav>

      <div className="flex gap-8">
        {/* Desktop: nav lateral */}
        <nav className="hidden md:block w-48 shrink-0 space-y-0.5">
          {configNav.map(item => {
            const active =
              item.href === '/dashboard/configuracoes'
                ? pathname === '/dashboard/configuracoes'
                : pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'bg-[#04c2fb]/10 text-[#04c2fb]'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.title}
              </Link>
            )
          })}
        </nav>

        {/* Conteúdo */}
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  )
}
