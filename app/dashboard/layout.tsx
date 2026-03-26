import Script from 'next/script'
import { AppSidebar } from '@/components/app-sidebar'
import { MobileHeader } from '@/components/mobile-header'
import { PageTransition } from '@/components/page-transition'

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
        <main className="flex-1 overflow-y-auto p-3 sm:p-6">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  )
}