'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { formatDateTime, getRoleBadge, cn } from '@/lib/utils'
import { Shield, Search } from 'lucide-react'

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  CREATE_PURCHASE:        { label: 'Buat Purchase',    color: 'bg-blue-50 text-blue-700' },
  PAY_PURCHASE:           { label: 'Bayar Purchase',   color: 'bg-green-50 text-green-700' },
  CREATE_DELIVERY:        { label: 'Buat Delivery',    color: 'bg-orange-50 text-orange-700' },
  PAY_DELIVERY:           { label: 'Bayar Invoice',    color: 'bg-green-50 text-green-700' },
  TRANSFER_SALDO:         { label: 'Transfer Saldo',   color: 'bg-purple-50 text-purple-700' },
  CREATE_PRODUCT:         { label: 'Tambah Produk',    color: 'bg-slate-100 text-slate-600' },
  UPDATE_PRODUCT:         { label: 'Edit Produk',      color: 'bg-slate-100 text-slate-600' },
}

export default function AuditPage() {
  const [search, setSearch] = useState('')
  const [userId, setUserId] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['audit', search, userId, page],
    queryFn: () => axios.get('/api/audit', { params: { search, userId, page } }).then(r => r.data),
  })

  const logs = data?.logs ?? []
  const users = data?.users ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / 50)

  function parseDetail(detail: string | null) {
    if (!detail) return null
    try {
      const obj = JSON.parse(detail)
      return Object.entries(obj).map(([k, v]) => `${k}: ${v}`).join(' · ')
    } catch { return detail }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center">
          <Shield size={18} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-800">Audit Log</h1>
          <p className="text-slate-500 text-sm mt-0.5">Semua aktivitas sistem — Owner only · {total} entri</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-52">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="Cari aksi atau entitas..."
            value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <select className="input w-48" value={userId} onChange={e => { setUserId(e.target.value); setPage(1) }}>
          <option value="">Semua User</option>
          {users.map((u: any) => (
            <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="th">Waktu</th>
                <th className="th">User</th>
                <th className="th">Role</th>
                <th className="th">Aksi</th>
                <th className="th">Entitas</th>
                <th className="th">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading && (
                <tr><td colSpan={6} className="td text-center py-8 text-slate-400">Memuat...</td></tr>
              )}
              {!isLoading && logs.length === 0 && (
                <tr>
                  <td colSpan={6} className="td text-center py-12 text-slate-400">
                    <Shield size={32} className="mx-auto mb-2 text-slate-200" />
                    <p>Belum ada log aktivitas</p>
                  </td>
                </tr>
              )}
              {logs.map((log: any) => {
                const actionMeta = ACTION_LABELS[log.action]
                const badge = getRoleBadge(log.user?.role)
                const detail = parseDetail(log.detail)
                return (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="td text-xs text-slate-500 whitespace-nowrap">
                      {formatDateTime(log.createdAt)}
                    </td>
                    <td className="td font-medium text-slate-800">{log.user?.name ?? '-'}</td>
                    <td className="td">
                      <span className={cn('badge text-xs', badge.color)}>{badge.label}</span>
                    </td>
                    <td className="td">
                      <span className={cn('badge text-xs', actionMeta?.color ?? 'bg-gray-100 text-gray-600')}>
                        {actionMeta?.label ?? log.action}
                      </span>
                    </td>
                    <td className="td text-slate-600 text-xs">
                      <p>{log.entity}</p>
                      {log.entityId && <p className="text-slate-400 font-mono truncate max-w-24">{log.entityId.slice(0, 8)}...</p>}
                    </td>
                    <td className="td text-xs text-slate-500 max-w-xs">
                      <p className="truncate">{detail ?? '-'}</p>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
            <p className="text-xs text-slate-500">Halaman {page} dari {totalPages} · {total} total</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="btn-secondary text-xs py-1 px-3">← Prev</button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="btn-secondary text-xs py-1 px-3">Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
