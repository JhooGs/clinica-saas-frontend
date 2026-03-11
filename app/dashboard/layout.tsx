import { ThemeToggle } from '@/components/theme-toggle'
import { AppSidebar } from '@/components/app-sidebar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar />
      <div className="flex flex-1 flex-col overflow-hidden bg-background">
        <header className="flex h-14 shrink-0 items-center justify-end border-b px-6 gap-3 bg-card">
          <ThemeToggle />
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}