'use client'

import { usePathname } from 'next/navigation'
import { MobileHeader } from '@/components/mobile-header'
import { PageTransition } from '@/components/page-transition'
import { NotificationsBell } from '@/components/notifications-bell'
import { ScrollContainer } from '@/components/scroll-container'

export function DashboardContentShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const onboardingRoute = pathname.startsWith('/dashboard/onboarding')

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-background">
      {!onboardingRoute && <MobileHeader />}
      {!onboardingRoute && (
        <div className="hidden md:flex items-center justify-end px-6 py-2.5 border-b bg-background shrink-0">
          <NotificationsBell />
        </div>
      )}
      <ScrollContainer>
        <PageTransition>{children}</PageTransition>
      </ScrollContainer>
    </div>
  )
}
