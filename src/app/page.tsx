'use client'
import { useSession } from 'next-auth/react'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { formatCurrency, formatDate, getStockStatus, cn } from '@/lib/utils'
import { Package, ShoppingCart, Truck, AlertTriangle, Wallet, Clock, CheckCircle } from 'lucide-react'

export default function DashboardPage() {
  const { data: session } = useSession()
  const role = (session?.user as any)?.role

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => axios.get('/api/dashboard').then(r => r.data),
    refetchInterval: 30000,
  })

  if (isLoading) return (
    <div className="p-6 space-y-4">
      {[...Array(4)].map((_, i) => <div key={i} className="card h-24 animate-pulse bg-slate-100" />)}
    </div>
  )

  const statusColor: Record<string, string> = {
    PENDING: 'bg-yellow-50 text-yellow-700', PAID: 'bg-green-50 text-green-700',
    UNPAID: 'bg-red-50 text-red-700', CANCELLED: 'bg-gray-50 text-gray-500',
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-slate-800">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Selamat datang, <span className="font-medium text-slate-700">{session?.user?.name}</span></p>
      </div>

      {/* Alerts */}
      <div className="space-y-3">
        {data?.lowStock > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
            <AlertTriangle size={18} className="text-amber-500 flex-shrink-0" />
            <p className="text-sm font-medium text-amber-800">{data.lowStock} produk stok menipis atau habis</p>
          </div>
        )}
        {data?.pendingPurchases > 0 && ['FINANCE', 'OWNER'].includes(role) && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
            <Clock size={18} className="text-blue-500 flex-shrink-0" />
            <p className="text-sm font-medium text-blue-800">{data.pendingPurchases} Purchase Request menunggu pembayaran</p>
          </div>
        )}
        {data?.unpaidInvoices > 0 && ['FINANCE', 'OWNER'].includes(role) && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
            <Truck size={18} className="text-red-500 flex-shrink-0" />
            <p className="text-sm font-medium text-red-800">{data.unpaidInvoices} Invoice Konveksi belum dibayar</p>
          </div>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {['GUDANG', 'OWNER'].includes(role) && (
          <div className="stat-card">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Produk</span>
              <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center"><Package size={15} className="text-blue-600" /></div>
            </div>
            <p className="text-2xl font-display font-bold text-slate-800">{data?.totalProducts ?? 0}</p>
            <p className="text-xs text-slate-400">{data?.lowStock ?? 0} menipis</p>
          </div>
        )}
        {['FINANCE', 'OWNER'].includes(role) && (
          <>
            <div className="stat-card">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Kas Finance</span>
                <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center"><Wallet size={15} className="text-purple-600" /></div>
              </div>
              <p className="text-xl font-display font-bold text-slate-800">{formatCurrency(data?.balances?.finance ?? 0)}</p>
              <p className="text-xs text-slate-400">saldo tersedia</p>
            </div>
            <div className="stat-card">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Saldo Gudang</span>
                <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center"><Wallet size={15} className="text-green-600" /></div>
              </div>
              <p className="text-xl font-display font-bold text-slate-800">{formatCurrency(data?.balances?.gudang ?? 0)}</p>
              <p className="text-xs text-slate-400">dari konveksi</p>
            </div>
            <div className="stat-card">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Saldo Konveksi</span>
                <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center"><Wallet size={15} className="text-orange-600" /></div>
              </div>
              <p className="text-xl font-display font-bold text-slate-800">{formatCurrency(data?.balances?.konveksi ?? 0)}</p>
              <p className="text-xs text-slate-400">tersisa</p>
            </div>
          </>
        )}
        {role === 'KONVEKSI' && (
          <div className="stat-card col-span-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Saldo Saya</span>
              <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center"><Wallet size={15} className="text-orange-600" /></div>
            </div>
            <p className="text-2xl font-display font-bold text-slate-800">{formatCurrency(data?.balances?.konveksi ?? 0)}</p>
            <p className="text-xs text-slate-400">saldo tersisa</p>
          </div>
        )}
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Purchase Pending</span>
            <div className="w-8 h-8 bg-yellow-50 rounded-lg flex items-center justify-center"><ShoppingCart size={15} className="text-yellow-600" /></div>
          </div>
          <p className="text-2xl font-display font-bold text-slate-800">{data?.pendingPurchases ?? 0}</p>
          <p className="text-xs text-slate-400">menunggu bayar</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Invoice Unpaid</span>
            <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center"><Truck size={15} className="text-red-500" /></div>
          </div>
          <p className="text-2xl font-display font-bold text-slate-800">{data?.unpaidInvoices ?? 0}</p>
          <p className="text-xs text-slate-400">belum dibayar</p>
        </div>
      </div>

      {/* Recent activity */}
      <div className="grid lg:grid-cols-2 gap-6">
        {['GUDANG', 'FINANCE', 'OWNER'].includes(role) && (
          <div className="card">
            <div className="p-5 border-b border-slate-100"><h2 className="font-display font-semibold text-slate-800">Purchase Request Terbaru</h2></div>
            <div className="divide-y divide-slate-50">
              {data?.recentPurchases?.length === 0 && <p className="p-5 text-sm text-slate-400 text-center">Belum ada data</p>}
              {data?.recentPurchases?.map((p: any) => (
                <div key={p.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-700">{p.invoiceNo}</p>
                    <p className="text-xs text-slate-400">{p.supplier.name} · {formatDate(p.date)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{formatCurrency(p.totalAmount)}</p>
                    <span className={cn('badge text-xs', statusColor[p.status])}>{p.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="card">
          <div className="p-5 border-b border-slate-100"><h2 className="font-display font-semibold text-slate-800">Delivery Terbaru</h2></div>
          <div className="divide-y divide-slate-50">
            {data?.recentDeliveries?.length === 0 && <p className="p-5 text-sm text-slate-400 text-center">Belum ada data</p>}
            {data?.recentDeliveries?.map((d: any) => (
              <div key={d.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-700">{d.invoiceNo}</p>
                  <p className="text-xs text-slate-400">{d.createdBy.name} · {formatDate(d.date)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{formatCurrency(d.totalAmount)}</p>
                  <span className={cn('badge text-xs', statusColor[d.status])}>{d.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
