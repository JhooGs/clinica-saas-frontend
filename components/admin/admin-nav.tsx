'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Menu, X, LayoutDashboard, Building2, Settings2, LogOut, ClipboardList, DollarSign,
} from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { createClient } from '@/lib/supabase'
import { useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'

const COLLAPSED_W = 56
const EXPANDED_W  = 240

// ── Variantes de animação ─────────────────────────────────────────────────────

const drawerVariants = {
  hidden:  { x: '-100%' },
  visible: { x: 0, transition: { type: 'spring', stiffness: 180, damping: 18, mass: 1 } },
  exit:    { x: '-100%', transition: { type: 'spring', stiffness: 260, damping: 32 } },
} as const

const overlayVariants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit:    { opacity: 0, transition: { duration: 0.18 } },
} as const

const staggerContainer = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.035, delayChildren: 0.1 } },
} as const

const staggerItem = {
  hidden:  { x: -10, opacity: 0 },
  visible: { x: 0, opacity: 1, transition: { type: 'spring', stiffness: 300, damping: 26 } },
} as const

// ── Itens de navegação ────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { title: 'Visão Geral', href: '/clinitra-admin',            icon: LayoutDashboard },
  { title: 'Clínicas',    href: '/clinitra-admin/clinicas',   icon: Building2 },
  { title: 'Planos',      href: '/clinitra-admin/planos',     icon: Settings2 },
  { title: 'Financeiro',  href: '/clinitra-admin/financeiro', icon: DollarSign },
  { title: 'Auditoria',   href: '/clinitra-admin/auditoria',  icon: ClipboardList },
]

// ── Itens de navegação — mobile ───────────────────────────────────────────────

function MobileNavItem({
  item,
  active,
  onClick,
}: {
  item: { title: string; href: string; icon: React.ElementType }
  active: boolean
  onClick?: () => void
}) {
  return (
    <motion.div variants={staggerItem}>
      <Link
        href={item.href}
        onClick={onClick}
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150',
          active ? 'bg-[#e0f7fe] text-[#0094c8]' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900',
        )}
      >
        <item.icon className={cn('h-4 w-4 shrink-0', active ? 'text-[#0094c8]' : 'text-gray-400')} />
        <span>{item.title}</span>
      </Link>
    </motion.div>
  )
}

// ── Itens de navegação — desktop ──────────────────────────────────────────────

function DesktopNavItem({
  item,
  active,
  expanded,
  onClick,
  danger,
}: {
  item: { title: string; href: string; icon: React.ElementType }
  active: boolean
  expanded: boolean
  onClick?: () => void
  danger?: boolean
}) {
  const Tag = onClick ? 'button' : Link
  const extraProps = onClick ? { onClick } : { href: item.href }

  return (
    // @ts-expect-error union de Link/button
    <Tag
      {...extraProps}
      className={cn(
        'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] font-medium transition-colors duration-150',
        danger
          ? 'text-rose-500 hover:bg-rose-50 hover:text-rose-600'
          : active ? 'bg-[#e0f7fe] text-[#0094c8]' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900',
      )}
    >
      <item.icon className={cn('h-5 w-5 shrink-0', danger ? 'text-rose-500' : active ? 'text-[#0094c8]' : 'text-gray-400')} />
      <motion.span
        animate={{ opacity: expanded ? 1 : 0 }}
        transition={{ duration: expanded ? 0.12 : 0.05, delay: expanded ? 0.08 : 0 }}
        className="whitespace-nowrap overflow-hidden"
      >
        {item.title}
      </motion.span>
    </Tag>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

export function AdminNav() {
  const [mobileOpen,      setMobileOpen]      = useState(false)
  const [desktopExpanded, setDesktopExpanded] = useState(false)
  const [email, setEmail] = useState('')

  const pathname    = usePathname()
  const queryClient = useQueryClient()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? '')
    })
  }, [])

  const initials = email.slice(0, 2).toUpperCase() || 'CA'

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setMobileOpen(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    queryClient.clear()
    window.location.href = '/auth/login'
  }

  function isActive(href: string) {
    if (href === '/clinitra-admin') return pathname === '/clinitra-admin'
    return pathname.startsWith(href)
  }

  return (
    <>
      {/* ═══════════════════ MOBILE topbar ═══════════════════ */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-20 flex items-center justify-between px-4 h-14 border-b bg-background">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menu"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100 active:bg-gray-200 transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-lg overflow-hidden shrink-0"
              style={{ background: 'linear-gradient(135deg, #0094c8, #04c2fb)' }}
            >
              <Image src="/logo.png" alt="Clinitra" width={18} height={18} className="object-contain brightness-0 invert" />
            </div>
            <div>
              <span className="text-sm font-bold tracking-widest uppercase text-[#04c2fb]">Clinitra</span>
              <span className="ml-2 text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Admin</span>
            </div>
          </div>
        </div>

        <Avatar className="h-8 w-8">
          <AvatarFallback className="text-[11px] font-bold text-white" style={{ background: 'linear-gradient(135deg, #0094c8, #04c2fb)' }}>
            {initials}
          </AvatarFallback>
        </Avatar>
      </header>

      {/* ═══════════════════ MOBILE drawer ═══════════════════ */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              key="admin-overlay"
              variants={overlayVariants}
              initial="hidden" animate="visible" exit="exit"
              className="fixed inset-0 z-40 bg-[rgba(10,25,41,0.4)] backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
              aria-hidden="true"
            />

            <motion.aside
              key="admin-drawer"
              variants={drawerVariants}
              initial="hidden" animate="visible" exit="exit"
              className="fixed top-0 left-0 bottom-0 z-50 flex w-72 flex-col bg-white border-r"
              style={{ boxShadow: '0 20px 60px -12px rgba(10,25,41,0.25)' }}
              role="dialog" aria-modal="true" aria-label="Menu admin"
            >
              {/* Cabeçalho gradiente */}
              <div
                className="flex items-center justify-between px-5 py-4 shrink-0"
                style={{ background: 'linear-gradient(135deg, #0094c8 0%, #04c2fb 60%, #00d5f5 100%)' }}
              >
                <div className="flex items-center gap-2.5">
                  <Image src="/logo.png" alt="Clinitra" width={26} height={26} className="object-contain brightness-0 invert" />
                  <div>
                    <p className="text-[15px] font-bold text-white tracking-widest uppercase leading-tight">Clinitra</p>
                    <p className="text-[10px] text-white/75 uppercase tracking-wider leading-tight">Painel Admin</p>
                  </div>
                </div>
                <button
                  onClick={() => setMobileOpen(false)}
                  aria-label="Fechar menu"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-white bg-white/15 hover:bg-white/25 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Perfil */}
              <div className="flex items-center gap-3 px-5 py-3.5 border-b shrink-0">
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarFallback className="text-xs font-bold text-white" style={{ background: 'linear-gradient(135deg, #0094c8, #04c2fb)' }}>
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate leading-tight">{email || 'Admin'}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Clinitra Admin</p>
                </div>
              </div>

              {/* Nav com stagger */}
              <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
                <p className="px-3 text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1.5">Plataforma</p>
                <motion.div variants={staggerContainer} initial="hidden" animate="visible">
                  {NAV_ITEMS.map(item => (
                    <MobileNavItem key={item.href} item={item} active={isActive(item.href)} onClick={() => setMobileOpen(false)} />
                  ))}
                </motion.div>
              </nav>

              {/* Rodapé */}
              <div className="shrink-0 border-t px-3 py-3">
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-rose-500 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                >
                  <LogOut className="h-4 w-4 shrink-0 text-rose-500" />
                  <span>Sair</span>
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ═══════════════════ DESKTOP sidebar ═══════════════════ */}
      <motion.aside
        className="hidden md:flex fixed top-0 left-0 bottom-0 z-30 flex-col bg-white border-r overflow-hidden"
        animate={{ width: desktopExpanded ? EXPANDED_W : COLLAPSED_W }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        onMouseEnter={() => setDesktopExpanded(true)}
        onMouseLeave={() => setDesktopExpanded(false)}
        style={{
          boxShadow: desktopExpanded ? '4px 0 24px -4px rgba(10,25,41,0.12)' : 'none',
          transition: 'box-shadow 0.3s ease',
        }}
      >
        {/* Cabeçalho gradiente */}
        <div
          className="flex items-center px-[14px] h-14 shrink-0 gap-3"
          style={{ background: 'linear-gradient(135deg, #0094c8 0%, #04c2fb 60%, #00d5f5 100%)' }}
        >
          <Image
            src="/logo.png"
            alt="Clinitra"
            width={22}
            height={22}
            className="object-contain brightness-0 invert shrink-0"
          />
          <motion.div
            animate={{ opacity: desktopExpanded ? 1 : 0 }}
            transition={{ duration: desktopExpanded ? 0.15 : 0.05, delay: desktopExpanded ? 0.07 : 0 }}
            className="overflow-hidden"
          >
            <p className="text-[15px] font-bold text-white tracking-widest uppercase whitespace-nowrap leading-tight">Clinitra</p>
            <p className="text-[10px] text-white/75 uppercase tracking-wider whitespace-nowrap leading-tight">Painel Admin</p>
          </motion.div>
        </div>

        {/* Perfil */}
        <div className="flex items-center px-3 py-3.5 border-b shrink-0 gap-3 overflow-hidden">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="text-[11px] font-bold text-white" style={{ background: 'linear-gradient(135deg, #0094c8, #04c2fb)' }}>
              {initials}
            </AvatarFallback>
          </Avatar>
          <motion.div
            animate={{ opacity: desktopExpanded ? 1 : 0 }}
            transition={{ duration: desktopExpanded ? 0.15 : 0.05, delay: desktopExpanded ? 0.08 : 0 }}
            className="min-w-0 overflow-hidden"
          >
            <p className="text-sm font-semibold text-gray-900 truncate leading-tight whitespace-nowrap">{email || 'Admin'}</p>
            <p className="text-[11px] text-muted-foreground whitespace-nowrap mt-0.5">Clinitra Admin</p>
          </motion.div>
        </div>

        {/* Navegação */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
          <motion.p
            animate={{ height: desktopExpanded ? 20 : 0, opacity: desktopExpanded ? 1 : 0, marginBottom: desktopExpanded ? 6 : 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden px-3 text-[10px] font-semibold uppercase tracking-widest text-gray-400 whitespace-nowrap"
          >
            Plataforma
          </motion.p>
          {NAV_ITEMS.map(item => (
            <DesktopNavItem key={item.href} item={item} active={isActive(item.href)} expanded={desktopExpanded} />
          ))}
        </nav>

        {/* Rodapé */}
        <div className="shrink-0 border-t px-2 py-3">
          <DesktopNavItem
            item={{ title: 'Sair', href: '#logout', icon: LogOut }}
            active={false}
            expanded={desktopExpanded}
            onClick={handleLogout}
            danger
          />
        </div>
      </motion.aside>
    </>
  )
}
