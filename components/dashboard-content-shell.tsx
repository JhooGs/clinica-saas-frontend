'use client'

import { AppNav } from '@/components/app-nav'
import { PageTransition } from '@/components/page-transition'
import { ScrollContainer } from '@/components/scroll-container'
import { TrialBanner } from '@/components/trial-banner'
import { SidebarProvider, useSidebarPin } from '@/contexts/sidebar-context'
import { cn } from '@/lib/utils'

function ContentShellInner({ children }: { children: React.ReactNode }) {
  const { pinned } = useSidebarPin()

  return (
    <div
      className={cn(
        'flex flex-1 flex-col overflow-hidden bg-background',
        'transition-[padding-left] duration-300 ease-in-out',
        pinned ? 'md:pl-[248px]' : 'md:pl-14',
      )}
    >
      <AppNav />
      <TrialBanner />
      <ScrollContainer>
        <PageTransition>{children}</PageTransition>
      </ScrollContainer>
    </div>
  )
}

export function DashboardContentShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <ContentShellInner>{children}</ContentShellInner>
    </SidebarProvider>
  )
}
