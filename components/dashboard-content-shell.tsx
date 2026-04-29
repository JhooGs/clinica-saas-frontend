'use client'

import { AppNav } from '@/components/app-nav'
import { PageTransition } from '@/components/page-transition'
import { ScrollContainer } from '@/components/scroll-container'
import { TrialBanner } from '@/components/trial-banner'

export function DashboardContentShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-background md:pl-14">
      <AppNav />
      <TrialBanner />
      <ScrollContainer>
        <PageTransition>{children}</PageTransition>
      </ScrollContainer>
    </div>
  )
}
