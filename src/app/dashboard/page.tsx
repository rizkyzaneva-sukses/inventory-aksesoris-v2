'use client'
import { useSession } from 'next-auth/react'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { Package, ShoppingCart, Truck, AlertTriangle, Wallet, Clock } from 'lucide-react'

const STATUS_COLOR: Record<string, string> = {
  PENDING:   'bg-yellow-500/15 text-yellow-400',
  PAID:      'bg-brand-500/15 text-brand-400',
  UNPAID:    'bg-red-500/15 text-red-400',
  CANCELLED: 'bg-slate-500/15 text-slate-400',
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const role = (session?.user as any)?.role

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => axios.get('/api/dashboard').then(r => r.data),
    refetchInterval: 30000,
  })

  if (isLoading) return (
    <div className="p-4 md:p-6 space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="card h-24 animate-pulse" style={{ opacity: 0.4 }} />
      ))}
    </div>
  )

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-4">
      {/* Header */}
      <div className="mb-2">
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Dashboard</h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Selamat datang, <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{session?.user?.name}</span>
        </p>
      </div>

      {/* Alerts */}
      <div className="space-y-2">
        {data?.lowStock > 0 && (
          <div className="flex items-center gap-3 p-3.5 rounded-xl"
            style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.25)' }}>
            <AlertTriangle size={15} className="text-yellow-400 flex-shrink-0" />
            <p className="text-sm font-medium text-yellow-400">{data.lowStock} produk stok menipis atau habis</p>
          </div>
        )}
        {data?.pendingPurchases > 0 && ['FINANCE','OWNER'].includes(role) && (
          <div className="flex items-center gap-3 p-3.5 rounded-xl"
            style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)' }}>
            <Clock size={15} className="text-blue-400 flex-shrink-0" />
            <p className="text-sm font-medium text-blue-400">{data.pendingPurchases} Purchase Request menunggu pembayaran</p>
          </div>
        )}
        {data?.unpaidInvoices > 0 && ['FINANCE','OWNER'].includes(role) && (
          <div className="flex items-center gap-3 p-3.5 rounded-xl"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}>
            <Truck size={15} className="text-red-400 flex-shrink-0" />
            <p className="text-sm font-medium text-red-400">{data.unpaidInvoices} Invoice belum dibayar</p>
          </div>
        )}
      </div>

      {/* Saldo 3 kolom - Finance/Owner */}
      {['FINANCE','OWNER'].includes(role) && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Kas Finance',    key: 'finance',  icon: '💜', color: 'text-purple-400', glow: 'rgba(168,85,247,0.08)' },
            { label: 'Saldo Gudang',   key: 'gudang',   icon: '💙', color: 'text-blue-400',   glow: 'rgba(59,130,246,0.08)' },
            { label: 'Saldo Konveksi', key: 'konveksi', icon: '🧡', color: 'text-orange-400', glow: 'rgba(249,115,22,0.08)' },
          ].map(s => (
            <div key={s.key} className="card p-4" style={{ background: s.glow }}>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                {s.label}
              </p>
              <p className={`text-base md:text-xl font-bold leading-tight ${s.color}`}>
                {formatCurrency(data?.balances?.[s.key] ?? 0)}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Konveksi saldo */}
      {role === 'KONVEKSI' && (
        <div className="card p-5" style={{ background: 'rgba(249,115,22,0.08)' }}>
          <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Saldo Saya</p>
          <p className="text-2xl font-bold text-orange-400">{formatCurrency(data?.balances?.konveksi ?? 0)}</p>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {['GUDANG','OWNER'].includes(role) && (
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Produk</span>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.12)' }}>
                <Package size={14} className="text-blue-400" />
              </div>
            </div>
            <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{data?.totalProducts ?? 0}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-faint)' }}>{data?.lowStock ?? 0} menipis</p>
          </div>
        )}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>PR Pending</span>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(234,179,8,0.12)' }}>
              <ShoppingCart size={14} className="text-yellow-400" />
            </div>
          </div>
          <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{data?.pendingPurchases ?? 0}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-faint)' }}>menunggu bayar</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Invoice</span>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.12)' }}>
              <Truck size={14} className="text-red-400" />
            </div>
          </div>
          <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{data?.unpaidInvoices ?? 0}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-faint)' }}>belum dibayar</p>
        </div>
      </div>

      {/* Recent activity */}
      <div className="grid md:grid-cols-2 gap-4">
        {['GUDANG','FINANCE','OWNER'].includes(role) && (
          <div className="card overflow-hidden">
            <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
              <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Purchase Terbaru</h2>
            </div>
            {!data?.recentPurchases?.length
              ? <p className="p-5 text-sm text-center" style={{ color: 'var(--text-faint)' }}>Belum ada data</p>
              : data.recentPurchases.map((p: any) => (
                <div key={p.id} className="px-4 py-3 flex items-center justify-between hover:opacity-80 transition-opacity"
                  style={{ borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <p className="text-sm font-medium font-mono" style={{ color: 'var(--text-primary)' }}>{p.invoiceNo}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{p.supplier.name} · {formatDate(p.date)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(p.totalAmount)}</p>
                    <span className={cn('badge text-xs mt-0.5', STATUS_COLOR[p.status])}>{p.status}</span>
                  </div>
                </div>
              ))
            }
          </div>
        )}
        <div className="card overflow-hidden">
          <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Delivery Terbaru</h2>
          </div>
          {!data?.recentDeliveries?.length
            ? <p className="p-5 text-sm text-center" style={{ color: 'var(--text-faint)' }}>Belum ada data</p>
            : data.recentDeliveries.map((d: any) => (
              <div key={d.id} className="px-4 py-3 flex items-center justify-between hover:opacity-80 transition-opacity"
                style={{ borderBottom: '1px solid var(--border)' }}>
                <div>
                  <p className="text-sm font-medium font-mono" style={{ color: 'var(--text-primary)' }}>{d.invoiceNo}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{d.createdBy.name} · {formatDate(d.date)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(d.totalAmount)}</p>
                  <span className={cn('badge text-xs mt-0.5', STATUS_COLOR[d.status])}>{d.status}</span>
                </div>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  )
}
