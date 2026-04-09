'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { useSession } from 'next-auth/react'
import toast from 'react-hot-toast'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { Wallet, Plus, X, Loader2, TrendingUp, TrendingDown, ArrowLeftRight } from 'lucide-react'

const ENTITY_LABELS: Record<string, { label: string; color: string; bg: string; border: string }> = {
  FINANCE:  { label: 'Kas Finance',    color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200' },
  GUDANG:   { label: 'Saldo Gudang',   color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-200'   },
  KONVEKSI: { label: 'Saldo Konveksi', color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200' },
}

const REF_LABELS: Record<string, string> = {
  PURCHASE: 'Pembelian',
  DELIVERY: 'Delivery',
  TOPUP: 'Top-up',
  TRANSFER: 'Transfer',
}

export default function WalletPage() {
  const { data: session } = useSession()
  const role = (session?.user as any)?.role
  const qc = useQueryClient()

  const [filterEntity, setFilterEntity] = useState('')
  const [topupModal, setTopupModal] = useState(false)
  const [transferModal, setTransferModal] = useState(false)
  const [topupForm, setTopupForm] = useState({ entityType: 'FINANCE', amount: '', description: '' })
  const [transferForm, setTransferForm] = useState({ fromEntity: 'FINANCE', toEntity: 'GUDANG', amount: '', description: '' })

  const { data, isLoading } = useQuery({
    queryKey: ['wallet', filterEntity],
    queryFn: () => axios.get('/api/wallet', { params: filterEntity ? { entity: filterEntity } : {} }).then(r => r.data),
    refetchInterval: 15000,
  })

  const topupMutation = useMutation({
    mutationFn: (d: any) => axios.post('/api/wallet', d),
    onSuccess: () => {
      toast.success('Top-up berhasil!')
      qc.invalidateQueries({ queryKey: ['wallet'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      setTopupModal(false)
      setTopupForm({ entityType: 'FINANCE', amount: '', description: '' })
    },
    onError: (e: any) => toast.error(e.response?.data?.error ?? 'Gagal top-up'),
  })

  const transferMutation = useMutation({
    mutationFn: (d: any) => axios.post('/api/wallet/transfer', d),
    onSuccess: () => {
      toast.success('Transfer saldo berhasil!')
      qc.invalidateQueries({ queryKey: ['wallet'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      setTransferModal(false)
      setTransferForm({ fromEntity: 'FINANCE', toEntity: 'GUDANG', amount: '', description: '' })
    },
    onError: (e: any) => toast.error(e.response?.data?.error ?? 'Gagal transfer'),
  })

  const balances = data?.balances ?? {}
  const ledger: any[] = data?.ledger ?? []

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-800">Saldo & Kas</h1>
          <p className="text-slate-500 text-sm mt-1">Posisi saldo semua entitas & riwayat mutasi</p>
        </div>
        {role === 'OWNER' && (
          <div className="flex gap-2">
            <button onClick={() => setTransferModal(true)} className="btn-secondary">
              <ArrowLeftRight size={15} /> Transfer Saldo
            </button>
            <button onClick={() => setTopupModal(true)} className="btn-primary">
              <Plus size={15} /> Top-up
            </button>
          </div>
        )}
        {role === 'FINANCE' && (
          <button onClick={() => setTransferModal(true)} className="btn-secondary">
            <ArrowLeftRight size={15} /> Transfer Saldo
          </button>
        )}
      </div>

      {/* Balance cards */}
      <div className="grid grid-cols-3 gap-4">
        {Object.entries(ENTITY_LABELS).map(([key, meta]) => (
          <button key={key} onClick={() => setFilterEntity(filterEntity === key ? '' : key)}
            className={cn('card p-5 text-left border-2 transition-colors hover:shadow-md',
              filterEntity === key ? 'border-brand-400 shadow-md' : 'border-slate-200')}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{meta.label}</span>
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', meta.bg)}>
                <Wallet size={15} className={meta.color} />
              </div>
            </div>
            <p className={cn('text-2xl font-display font-bold', meta.color)}>
              {isLoading ? '...' : formatCurrency(balances[key.toLowerCase()] ?? 0)}
            </p>
            <p className="text-xs text-slate-400 mt-1">{filterEntity === key ? '▲ filter aktif' : 'klik untuk filter'}</p>
          </button>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {['', 'FINANCE', 'GUDANG', 'KONVEKSI'].map(key => (
          <button key={key} onClick={() => setFilterEntity(key)}
            className={cn('px-4 py-1.5 rounded-full text-sm font-medium transition-colors border',
              filterEntity === key
                ? 'bg-brand-600 text-white border-brand-600'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50')}>
            {key === '' ? 'Semua' : ENTITY_LABELS[key]?.label}
          </button>
        ))}
      </div>

      {/* Ledger table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-display font-semibold text-slate-800">
            Riwayat Mutasi {filterEntity ? `— ${ENTITY_LABELS[filterEntity]?.label}` : '(Semua)'}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="th">Tanggal</th>
                <th className="th">Entitas</th>
                <th className="th">Keterangan</th>
                <th className="th text-center">Tipe Ref</th>
                <th className="th text-center">Jenis</th>
                <th className="th text-right">Jumlah</th>
                <th className="th text-right">Saldo Setelah</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading && (
                <tr><td colSpan={7} className="td text-center py-8 text-slate-400">Memuat...</td></tr>
              )}
              {!isLoading && ledger.length === 0 && (
                <tr><td colSpan={7} className="td text-center py-10 text-slate-400">
                  <Wallet size={28} className="mx-auto mb-2 text-slate-200" />
                  <p>Belum ada mutasi</p>
                </td></tr>
              )}
              {ledger.map((l: any) => {
                const meta = ENTITY_LABELS[l.entityType]
                const isKredit = l.type === 'KREDIT'
                return (
                  <tr key={l.id} className="hover:bg-slate-50">
                    <td className="td text-slate-500 whitespace-nowrap text-xs">{formatDate(l.createdAt)}</td>
                    <td className="td">
                      <span className={cn('badge', meta?.bg, meta?.color)}>{meta?.label}</span>
                    </td>
                    <td className="td text-slate-700 max-w-xs">
                      <p className="truncate text-sm">{l.description}</p>
                      {l.topupBy && <p className="text-xs text-slate-400">oleh {l.topupBy.name}</p>}
                    </td>
                    <td className="td text-center">
                      <span className="badge bg-slate-100 text-slate-600 text-xs">
                        {REF_LABELS[l.refType] ?? l.refType ?? '-'}
                      </span>
                    </td>
                    <td className="td text-center">
                      <div className={cn('inline-flex items-center gap-1 badge',
                        isKredit ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700')}>
                        {isKredit ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                        {l.type}
                      </div>
                    </td>
                    <td className={cn('td text-right font-semibold', isKredit ? 'text-green-700' : 'text-red-600')}>
                      {isKredit ? '+' : '-'}{formatCurrency(l.amount)}
                    </td>
                    <td className="td text-right font-semibold text-slate-800">
                      {formatCurrency(l.balanceAfter)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top-up Modal */}
      {topupModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="font-display font-semibold text-slate-800">Top-up Saldo</h2>
              <button onClick={() => setTopupModal(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>
            <form onSubmit={e => { e.preventDefault(); topupMutation.mutate({ ...topupForm, amount: Number(topupForm.amount) }) }} className="p-5 space-y-4">
              <div>
                <label className="label">Entitas *</label>
                <select className="input" value={topupForm.entityType}
                  onChange={e => setTopupForm({ ...topupForm, entityType: e.target.value })}>
                  <option value="FINANCE">Kas Finance</option>
                  <option value="GUDANG">Saldo Gudang</option>
                  <option value="KONVEKSI">Saldo Konveksi</option>
                </select>
              </div>
              <div>
                <label className="label">Jumlah (Rp) *</label>
                <input type="number" className="input" min={1} placeholder="0"
                  value={topupForm.amount}
                  onChange={e => setTopupForm({ ...topupForm, amount: e.target.value })} required />
                {topupForm.amount && <p className="text-xs text-slate-400 mt-1">{formatCurrency(Number(topupForm.amount))}</p>}
              </div>
              <div>
                <label className="label">Keterangan</label>
                <input className="input" placeholder="Top-up saldo..."
                  value={topupForm.description}
                  onChange={e => setTopupForm({ ...topupForm, description: e.target.value })} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setTopupModal(false)} className="btn-secondary flex-1 justify-center">Batal</button>
                <button type="submit" disabled={topupMutation.isPending} className="btn-primary flex-1 justify-center">
                  {topupMutation.isPending && <Loader2 size={14} className="animate-spin" />} Top-up
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {transferModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="font-display font-semibold text-slate-800">Transfer Saldo Antar Entitas</h2>
              <button onClick={() => setTransferModal(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>
            <form onSubmit={e => {
              e.preventDefault()
              if (transferForm.fromEntity === transferForm.toEntity) return toast.error('Dari dan ke tidak boleh sama')
              transferMutation.mutate({ ...transferForm, amount: Number(transferForm.amount) })
            }} className="p-5 space-y-4">

              {/* Visual transfer indicator */}
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="label">Dari *</label>
                  <select className="input" value={transferForm.fromEntity}
                    onChange={e => setTransferForm({ ...transferForm, fromEntity: e.target.value })}>
                    <option value="FINANCE">Kas Finance</option>
                    <option value="GUDANG">Saldo Gudang</option>
                    <option value="KONVEKSI">Saldo Konveksi</option>
                  </select>
                  <p className="text-xs text-slate-400 mt-1">
                    Saldo: {formatCurrency(balances[transferForm.fromEntity.toLowerCase()] ?? 0)}
                  </p>
                </div>
                <div className="flex-shrink-0 mt-4">
                  <ArrowLeftRight size={20} className="text-slate-400" />
                </div>
                <div className="flex-1">
                  <label className="label">Ke *</label>
                  <select className="input" value={transferForm.toEntity}
                    onChange={e => setTransferForm({ ...transferForm, toEntity: e.target.value })}>
                    <option value="FINANCE">Kas Finance</option>
                    <option value="GUDANG">Saldo Gudang</option>
                    <option value="KONVEKSI">Saldo Konveksi</option>
                  </select>
                  <p className="text-xs text-slate-400 mt-1">
                    Saldo: {formatCurrency(balances[transferForm.toEntity.toLowerCase()] ?? 0)}
                  </p>
                </div>
              </div>

              <div>
                <label className="label">Jumlah (Rp) *</label>
                <input type="number" className="input" min={1} placeholder="0"
                  value={transferForm.amount}
                  onChange={e => setTransferForm({ ...transferForm, amount: e.target.value })} required />
                {transferForm.amount && <p className="text-xs text-slate-400 mt-1">{formatCurrency(Number(transferForm.amount))}</p>}
              </div>

              <div>
                <label className="label">Keterangan</label>
                <input className="input" placeholder="Alasan transfer..."
                  value={transferForm.description}
                  onChange={e => setTransferForm({ ...transferForm, description: e.target.value })} />
              </div>

              {/* Preview */}
              {transferForm.amount && Number(transferForm.amount) > 0 && (
                <div className="bg-slate-50 rounded-lg p-3 text-xs space-y-1 text-slate-600">
                  <p>📤 {ENTITY_LABELS[transferForm.fromEntity]?.label}: <span className="text-red-600 font-semibold">-{formatCurrency(Number(transferForm.amount))}</span></p>
                  <p>📥 {ENTITY_LABELS[transferForm.toEntity]?.label}: <span className="text-green-600 font-semibold">+{formatCurrency(Number(transferForm.amount))}</span></p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setTransferModal(false)} className="btn-secondary flex-1 justify-center">Batal</button>
                <button type="submit" disabled={transferMutation.isPending} className="btn-primary flex-1 justify-center">
                  {transferMutation.isPending && <Loader2 size={14} className="animate-spin" />} Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
