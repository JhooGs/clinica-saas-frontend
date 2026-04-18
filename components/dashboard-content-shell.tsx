'use client'

import { AppNav } from '@/components/app-nav'
import { PageTransition } from '@/components/page-transition'
import { ScrollContainer } from '@/components/scroll-container'

export function DashboardContentShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-background md:pl-14">
      <AppNav />
      <ScrollContainer>
        <PageTransition>{children}</PageTransition>
      </ScrollContainer>
    </div>
  )
}
