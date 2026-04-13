import Script from 'next/script'
import { AppSidebar } from '@/components/app-sidebar'
import { MobileHeader } from '@/components/mobile-header'
import { PageTransition } from '@/components/page-transition'
import { NotificationsBell } from '@/components/notifications-bell'
import { VersionBadge } from '@/components/version-badge'
import { ScrollContainer } from '@/components/scroll-container'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Google Identity Services — carregado apenas quando necessário */}
      <Script src="https://accounts.google.com/gsi/client" strategy="lazyOnload" />
      <AppSidebar />
      <div className="flex flex-1 flex-col overflow-hidden bg-background">
        <MobileHeader />
        {/* Barra de topo desktop — sino de notificacoes */}
        <div className="hidden md:flex items-center justify-end px-6 py-2.5 border-b bg-background shrink-0">
          <NotificationsBell />
        </div>
        <ScrollContainer>
          <PageTransition>{children}</PageTransition>
        </ScrollContainer>
      </div>
      <VersionBadge />
    </div>
  )
}