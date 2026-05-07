import { AdminNav } from '@/components/admin/admin-nav'

export default function ClintraAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <AdminNav />
      {/* Offset da sidebar fixa no desktop (56px colapsada) */}
      <div className="flex flex-1 flex-col overflow-hidden bg-background pt-14 md:pt-0 md:pl-14">
        <main className="flex-1 overflow-y-auto p-3 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
