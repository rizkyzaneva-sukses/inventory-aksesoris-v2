import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  return (
    <div className="flex min-h-screen dark-transition" style={{ background: 'var(--bg-base)' }}>
      <Sidebar />
      {/* Desktop: margin-left for sidebar */}
      <main className="flex-1 w-full md:ml-[240px] dark-transition"
        style={{ background: 'var(--bg-base)' }}>
        {/* Desktop top padding only */}
        <div className="pt-0 md:pt-0">
          {/* Mobile: top bar + bottom nav padding */}
          <div className="md:hidden" style={{ height: 'var(--topbar-height, 56px)' }} />
          {children}
          {/* Mobile bottom nav spacing */}
          <div className="md:hidden h-20" />
        </div>
      </main>
    </div>
  )
}
