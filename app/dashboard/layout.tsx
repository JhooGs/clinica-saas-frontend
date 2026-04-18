import Script from 'next/script'
import { VersionBadge } from '@/components/version-badge'
import { DashboardContentShell } from '@/components/dashboard-content-shell'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Google Identity Services - carregado apenas quando necessario */}
      <Script src="https://accounts.google.com/gsi/client" strategy="lazyOnload" />
      <DashboardContentShell>{children}</DashboardContentShell>
      <VersionBadge />
    </div>
  )
}
