'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { SlidersHorizontal, Database, Plug, Banknote } from 'lucide-react'

const configNav = [
  { title: 'Geral',      href: '/dashboard/configuracoes',            icon: SlidersHorizontal },
  { title: 'Financeiro', href: '/dashboard/configuracoes/financeiro', icon: Banknote },
  { title: 'Dados',      href: '/dashboard/configuracoes/dados',      icon: Database },
  { title: 'Conexões',   href: '/dashboard/configuracoes/conexoes',   icon: Plug },
]

export default function ConfiguracoesLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Configurações</h1>
        <p className="text-muted-foreground mt-1">Gerencie as configurações da clínica</p>
      </div>

      {/* Tabs estilo Excel — formato trapézio com gradiente Clinitra no ativo */}
      <nav className="flex items-end border-b-2 border-slate-200">
        {configNav.map((item, i) => {
          const active =
            item.href === '/dashboard/configuracoes'
              ? pathname === '/dashboard/configuracoes'
              : pathname.startsWith(item.href)

          return (
            <div
              key={item.href}
              className={cn(
                'shrink-0 rounded-t-md -skew-x-6 transition-all duration-150',
                i > 0 && '-ml-2',
                active
                  ? 'relative z-10 -mb-0.5 shadow-sm'
                  : 'z-0 bg-slate-100/80 hover:bg-slate-100',
              )}
              style={active ? {
                background: 'linear-gradient(135deg, #0094c8 0%, #04c2fb 60%, #00d5f5 100%)',
              } : undefined}
            >
              <Link
                href={item.href}
                className={cn(
                  'flex items-center gap-2 px-5 py-2.5 text-sm font-medium whitespace-nowrap skew-x-6',
                  active ? 'text-white' : 'text-slate-500 hover:text-slate-700',
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.title}
              </Link>
            </div>
          )
        })}
      </nav>

      <div className="pt-6">{children}</div>
    </div>
  )
}
