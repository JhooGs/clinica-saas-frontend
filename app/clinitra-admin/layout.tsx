import { AdminSidebar } from '@/components/admin/admin-sidebar'
import { AdminMobileHeader } from '@/components/admin/admin-mobile-header'

export default function ClintraAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <AdminSidebar />
      <div className="flex flex-1 flex-col overflow-hidden bg-background">
        <AdminMobileHeader />
        <main className="flex-1 overflow-y-auto p-3 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
