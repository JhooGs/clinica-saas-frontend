import Script from 'next/script'
import { VersionBadge } from '@/components/version-badge'
import { DashboardContentShell } from '@/components/dashboard-content-shell'
import { GlobalUpgradeModal } from '@/components/upgrade-modal'
import { SessionGuard } from '@/components/session-guard'
import { SWUpdateListener } from '@/components/sw-update-listener'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex overflow-hidden" style={{ height: '100dvh' }}>
      {/* Google Identity Services - carregado apenas quando necessario */}
      <Script src="https://accounts.google.com/gsi/client" strategy="lazyOnload" />
      <SessionGuard />
      <SWUpdateListener />
      <DashboardContentShell>{children}</DashboardContentShell>
      <VersionBadge />
      <GlobalUpgradeModal />
    </div>
  )
}
