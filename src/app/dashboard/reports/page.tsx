'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { formatCurrency, formatDate, getStockStatus, cn } from '@/lib/utils'
import { BarChart2, ShoppingCart, Truck, Package } from 'lucide-react'

type TabType = 'summary' | 'purchases' | 'deliveries' | 'stock'

const defaultFrom = () => {
  const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]
}

export default function ReportsPage() {
  const [tab, setTab] = useState<TabType>('summary')
  const [from, setFrom] = useState(defaultFrom)
  const [to, setTo] = useState(new Date().toISOString().split('T')[0])

  const { data, isLoading } = useQuery({
    queryKey: ['reports', tab, from, to],
    queryFn: () => axios.get('/api/reports', { params: { type: tab, from, to } }).then(r => r.data),
  })

  const TABS = [
    { id: 'summary' as TabType,   label: 'Ringkasan',  icon: <BarChart2 size={15} /> },
    { id: 'purchases' as TabType, label: 'Pembelian',  icon: <ShoppingCart size={15} /> },
    { id: 'deliveries' as TabType,label: 'Delivery',   icon: <Truck size={15} /> },
    { id: 'stock' as TabType,     label: 'Stok',       icon: <Package size={15} /> },
  ]

  const STATUS_P: Record<string, string> = {
    PENDING: 'bg-yellow-50 text-yellow-700', PAID: 'bg-green-50 text-green-700', CANCELLED: 'bg-gray-50 text-gray-500',
  }
  const STATUS_D: Record<string, string> = {
    UNPAID: 'bg-red-50 text-red-700', PAID: 'bg-green-50 text-green-700', CANCELLED: 'bg-gray-50 text-gray-500',
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-display font-bold text-slate-800">Laporan</h1>
        <p className="text-slate-500 text-sm mt-1">Analisa pembelian, delivery, dan posisi stok</p>
      </div>

      {/* Tabs + Date filter */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-2 flex-wrap">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={cn('inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors border',
                tab === t.id ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50')}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>
        {tab !== 'stock' && (
          <div className="flex items-center gap-2 text-sm">
            <input type="date" className="input py-1.5 w-36" value={from} onChange={e => setFrom(e.target.value)} />
            <span className="text-slate-400">s/d</span>
            <input type="date" className="input py-1.5 w-36" value={to} onChange={e => setTo(e.target.value)} />
          </div>
        )}
      </div>

      {isLoading && <div className="card p-8 text-center text-slate-400">Memuat laporan...</div>}

      {/* Summary */}
      {tab === 'summary' && data && !isLoading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="stat-card">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Pembelian</span>
            <p className="text-2xl font-display font-bold text-slate-800">{formatCurrency(data.purchaseTotal)}</p>
            <p className="text-xs text-slate-400">{data.purchaseCount} transaksi PAID</p>
          </div>
          <div className="stat-card">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Delivery</span>
            <p className="text-2xl font-display font-bold text-slate-800">{formatCurrency(data.deliveryTotal)}</p>
            <p className="text-xs text-slate-400">{data.deliveryCount} invoice PAID</p>
          </div>
          <div className="stat-card">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Avg Pembelian</span>
            <p className="text-2xl font-display font-bold text-slate-800">
              {data.purchaseCount > 0 ? formatCurrency(data.purchaseTotal / data.purchaseCount) : 'Rp 0'}
            </p>
            <p className="text-xs text-slate-400">per transaksi</p>
          </div>
          <div className="stat-card">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Avg Delivery</span>
            <p className="text-2xl font-display font-bold text-slate-800">
              {data.deliveryCount > 0 ? formatCurrency(data.deliveryTotal / data.deliveryCount) : 'Rp 0'}
            </p>
            <p className="text-xs text-slate-400">per invoice</p>
          </div>
        </div>
      )}

      {/* Purchases */}
      {tab === 'purchases' && Array.isArray(data) && !isLoading && (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="th">Invoice</th><th className="th">Tanggal</th>
                <th className="th">Supplier</th><th className="th">Dibuat Oleh</th>
                <th className="th text-right">Total</th><th className="th text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.length === 0 && <tr><td colSpan={6} className="td text-center py-8 text-slate-400">Tidak ada data</td></tr>}
              {data.map((p: any) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="td font-mono text-xs">{p.invoiceNo}</td>
                  <td className="td text-slate-500">{formatDate(p.date)}</td>
                  <td className="td font-medium text-slate-700">{p.supplier.name}</td>
                  <td className="td text-slate-500">{p.createdBy.name}</td>
                  <td className="td text-right font-semibold">{formatCurrency(p.totalAmount)}</td>
                  <td className="td text-center"><span className={cn('badge', STATUS_P[p.status])}>{p.status}</span></td>
                </tr>
              ))}
            </tbody>
            {data.length > 0 && (
              <tfoot className="bg-slate-50 border-t border-slate-200">
                <tr>
                  <td colSpan={4} className="td font-semibold text-slate-700">Total</td>
                  <td className="td text-right font-bold text-brand-700">{formatCurrency(data.reduce((s: number, p: any) => s + p.totalAmount, 0))}</td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      {/* Deliveries */}
      {tab === 'deliveries' && Array.isArray(data) && !isLoading && (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="th">Invoice</th><th className="th">Tanggal</th>
                <th className="th">Konveksi</th><th className="th text-right">Item</th>
                <th className="th text-right">Total</th><th className="th text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.length === 0 && <tr><td colSpan={6} className="td text-center py-8 text-slate-400">Tidak ada data</td></tr>}
              {data.map((d: any) => (
                <tr key={d.id} className="hover:bg-slate-50">
                  <td className="td font-mono text-xs">{d.invoiceNo}</td>
                  <td className="td text-slate-500">{formatDate(d.date)}</td>
                  <td className="td font-medium text-slate-700">{d.createdBy.name}</td>
                  <td className="td text-right text-slate-600">{d.items.length}</td>
                  <td className="td text-right font-semibold">{formatCurrency(d.totalAmount)}</td>
                  <td className="td text-center"><span className={cn('badge', STATUS_D[d.status])}>{d.status}</span></td>
                </tr>
              ))}
            </tbody>
            {data.length > 0 && (
              <tfoot className="bg-slate-50 border-t border-slate-200">
                <tr>
                  <td colSpan={4} className="td font-semibold text-slate-700">Total</td>
                  <td className="td text-right font-bold text-brand-700">{formatCurrency(data.reduce((s: number, d: any) => s + d.totalAmount, 0))}</td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      {/* Stock */}
      {tab === 'stock' && Array.isArray(data) && !isLoading && (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="th">SKU</th><th className="th">Nama</th><th className="th">Kategori</th>
                <th className="th text-right">Stok</th><th className="th text-right">Min</th>
                <th className="th text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.length === 0 && <tr><td colSpan={6} className="td text-center py-8 text-slate-400">Tidak ada produk</td></tr>}
              {data.map((p: any) => {
                const s = getStockStatus(p.currentStock, p.minStock)
                return (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="td font-mono text-xs text-slate-500">{p.sku}</td>
                    <td className="td font-medium text-slate-800">{p.name}</td>
                    <td className="td text-slate-500">{p.category?.name ?? '-'}</td>
                    <td className="td text-right font-semibold">{p.currentStock.toLocaleString('id-ID')} <span className="font-normal text-xs text-slate-400">{p.unit}</span></td>
                    <td className="td text-right text-slate-400">{p.minStock}</td>
                    <td className="td text-center"><span className={cn('badge', s.color)}>{s.label}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
