'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { useTheme } from 'next-themes'
import {
  LayoutDashboard, Package, ShoppingCart, Truck, FileText,
  BarChart2, Users, Wallet, LogOut, Package2, Shield, HelpCircle,
  Sun, Moon, Menu, X
} from 'lucide-react'
import { cn, getRoleBadge } from '@/lib/utils'
import { useState } from 'react'

const NAV = [
  { href: '/dashboard',            label: 'Dashboard',        icon: LayoutDashboard, roles: ['GUDANG','FINANCE','KONVEKSI','OWNER'] },
  { href: '/dashboard/products',   label: 'Produk & Stok',    icon: Package,         roles: ['GUDANG','FINANCE','OWNER'] },
  { href: '/dashboard/purchases',  label: 'Purchase Request', icon: ShoppingCart,    roles: ['GUDANG','FINANCE','OWNER'] },
  { href: '/dashboard/deliveries', label: 'Ambil Stok',       icon: Truck,           roles: ['KONVEKSI','GUDANG','OWNER'] },
  { href: '/dashboard/invoices',   label: 'Invoice',          icon: FileText,        roles: ['FINANCE','KONVEKSI','OWNER'] },
  { href: '/dashboard/wallet',     label: 'Saldo & Kas',      icon: Wallet,          roles: ['FINANCE','OWNER'] },
  { href: '/dashboard/reports',    label: 'Laporan',          icon: BarChart2,       roles: ['OWNER','FINANCE'] },
  { href: '/dashboard/users',      label: 'Manajemen User',   icon: Users,           roles: ['OWNER'] },
  { href: '/dashboard/audit',      label: 'Audit Log',        icon: Shield,          roles: ['OWNER'] },
  { href: '/dashboard/guide',      label: 'Panduan',          icon: HelpCircle,      roles: ['GUDANG','FINANCE','KONVEKSI','OWNER'] },
]

function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-brand-500/10"
      style={{ color: 'var(--text-muted)' }}
      title="Toggle dark mode"
    >
      {theme === 'dark'
        ? <Sun size={16} className="text-amber-400" />
        : <Moon size={16} />
      }
    </button>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const role = (session?.user as any)?.role ?? ''
  const badge = getRoleBadge(role)
  const [mobileOpen, setMobileOpen] = useState(false)

  const filtered = NAV.filter(n => n.roles.includes(role))

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Package2 size={16} className="text-white" />
          </div>
          <div>
            <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Inventory</p>
            <p className="text-xs" style={{ color: 'var(--text-faint)' }}>Management System</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <button onClick={() => setMobileOpen(false)} className="md:hidden p-1" style={{ color: 'var(--text-muted)' }}>
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {filtered.map(n => {
          const Icon = n.icon
          const active = pathname === n.href || (n.href !== '/dashboard' && pathname.startsWith(n.href))
          return (
            <Link key={n.href} href={n.href}
              onClick={() => setMobileOpen(false)}
              className={cn('sidebar-link', active && 'active')}>
              <Icon size={17} className="flex-shrink-0" />
              <span className="truncate">{n.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* User */}
      <div className="p-3 space-y-1" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="px-3 py-2 rounded-xl" style={{ background: 'var(--bg-muted)' }}>
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
            {session?.user?.name}
          </p>
          <span className={cn('badge text-xs mt-0.5', badge.color)}>{badge.label}</span>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="sidebar-link w-full text-red-500 hover:text-red-400"
          style={{}}>
          <LogOut size={16} /> Keluar
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="fixed top-0 left-0 h-full z-30 hidden md:flex flex-col dark-transition"
        style={{
          width: 'var(--sidebar-width, 240px)',
          background: 'var(--bg-surface)',
          borderRight: '1px solid var(--border)',
        }}>
        <SidebarContent />
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4 dark-transition"
        style={{
          height: 'var(--topbar-height)',
          background: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border)',
        }}>
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center">
            <Package2 size={14} className="text-white" />
          </div>
          <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Inventory</p>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button onClick={() => setMobileOpen(true)} className="p-2 rounded-lg" style={{ color: 'var(--text-muted)' }}>
            <Menu size={20} />
          </button>
        </div>
      </div>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40" onClick={() => setMobileOpen(false)}
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
      )}

      {/* Mobile drawer */}
      <div className={cn(
        'md:hidden fixed top-0 left-0 h-full z-50 w-72 flex flex-col transition-transform duration-300 ease-out dark-transition',
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      )} style={{ background: 'var(--bg-surface)', borderRight: '1px solid var(--border)' }}>
        <SidebarContent />
      </div>

      {/* Mobile bottom navigation (quick access) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 dark-transition"
        style={{
          background: 'var(--bg-surface)',
          borderTop: '1px solid var(--border)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}>
        <div className="flex items-center justify-around px-2 py-1">
          {filtered.slice(0, 5).map(n => {
            const Icon = n.icon
            const active = pathname === n.href || (n.href !== '/dashboard' && pathname.startsWith(n.href))
            return (
              <Link key={n.href} href={n.href}
                className={cn('mobile-nav-link', active && 'active')}>
                <Icon size={20} />
                <span className="text-[10px] leading-tight text-center">{n.label.split(' ')[0]}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </>
  )
}
