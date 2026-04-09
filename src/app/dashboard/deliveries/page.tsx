'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { useSession } from 'next-auth/react'
import toast from 'react-hot-toast'
import { Plus, X, Loader2, Trash2, Truck, Pencil, XCircle } from 'lucide-react'
import { formatCurrency, formatDate, cn } from '@/lib/utils'

const STATUS_COLOR: Record<string, string> = {
  UNPAID: 'bg-red-50 text-red-700',
  PAID: 'bg-green-50 text-green-700',
  CANCELLED: 'bg-gray-50 text-gray-500',
}

export default function DeliveriesPage() {
  const { data: session } = useSession()
  const role = (session?.user as any)?.role
  const qc = useQueryClient()
  const [modal, setModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<any[]>([])

  const { data: deliveries, isLoading } = useQuery({ queryKey: ['deliveries'], queryFn: () => axios.get('/api/deliveries').then(r => r.data) })
  const { data: products } = useQuery({ queryKey: ['products'], queryFn: () => axios.get('/api/products').then(r => r.data) })

  const createMutation = useMutation({
    mutationFn: (d: any) => axios.post('/api/deliveries', d),
    onSuccess: () => {
      toast.success('Delivery berhasil! Stok gudang berkurang.')
      qc.invalidateQueries({ queryKey: ['deliveries'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      setModal(false); setItems([]); setNotes('')
    },
    onError: (e: any) => toast.error(e.response?.data?.error ?? 'Gagal Create'),
  })

  const updateMutation = useMutation({
    mutationFn: (d: any) => axios.put(`/api/deliveries/${editId}`, d),
    onSuccess: () => {
      toast.success('Delivery berhasil diupdate!')
      qc.invalidateQueries({ queryKey: ['deliveries'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      setModal(false); setEditId(null); setItems([]); setNotes('')
    },
    onError: (e: any) => toast.error(e.response?.data?.error ?? 'Gagal Update'),
  })

  const declineMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string, reason: string }) => axios.patch(`/api/deliveries/${id}`, { action: 'DECLINE', reason }),
    onSuccess: () => {
      toast.success('Berhasil ditolak (Cancel)')
      qc.invalidateQueries({ queryKey: ['deliveries'] })
      qc.invalidateQueries({ queryKey: ['products'] })
    },
    onError: (e: any) => toast.error(e.response?.data?.error ?? 'Gagal Decline'),
  })

  function openEdit(d: any) {
    setEditId(d.id)
    setNotes(d.notes ?? '')
    setItems(d.items.map((i: any) => ({ ...i, qty: String(i.qty) })))
    setModal(true)
  }

  function handleDecline(id: string) {
    const reason = prompt('Masukkan alasan decline/cancel:')
    if (reason !== null) declineMutation.mutate({ id, reason })
  }

  function addItem() { setItems([...items, { productId: '', qty: '1', unit: 'pcs' }]) }
  function removeItem(i: number) { setItems(items.filter((_, idx) => idx !== i)) }
  function updateItem(i: number, field: string, val: string) {
    const updated = [...items]; updated[i] = { ...updated[i], [field]: val }
    if (field === 'productId') { const p = products?.find((p: any) => p.id === val); if (p) updated[i].unit = p.unit }
    setItems(updated)
  }

  const canCreate = ['KONVEKSI', 'GUDANG', 'OWNER'].includes(role)

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-800 dark:text-slate-100">Delivery / Ambil Stok</h1>
          <p className="text-slate-500 dark:text-slate-500 text-sm mt-1">
            {role === 'KONVEKSI' ? 'Ambil aksesoris dari Gudang — stok langsung berkurang' : 'Riwayat pengambilan stok oleh Konveksi'}
          </p>
        </div>
        {canCreate && <button onClick={() => { setEditId(null); setNotes(''); setItems([]); setModal(true) }} className="btn-primary"><Plus size={16} /> Ambil Stok</button>}
      </div>

      {/* Info box for konveksi */}
      {role === 'KONVEKSI' && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
          <strong>Info:</strong> Saat kamu submit, stok Gudang langsung berkurang. Invoice akan dibayar oleh Finance. Harga mengikuti harga beli supplier (tanpa margin).
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
            <tr>
              <th className="th">Invoice</th><th className="th">Tanggal</th><th className="th">Diambil Oleh</th>
              <th className="th text-right">Item</th><th className="th text-right">Total</th>
              <th className="th text-center">Status</th><th className="th text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {isLoading && <tr><td colSpan={6} className="td text-center py-8 text-slate-400 dark:text-slate-500">Memuat...</td></tr>}
            {!isLoading && deliveries?.length === 0 && (
              <tr><td colSpan={7} className="td text-center py-12 text-slate-400 dark:text-slate-500">
                <Truck size={32} className="mx-auto mb-2 text-slate-200" /><p>Belum ada delivery</p>
              </td></tr>
            )}
            {deliveries?.map((d: any) => (
              <tr key={d.id} className="hover:bg-slate-50 dark:bg-slate-800/50">
                <td className="td font-mono text-xs font-medium">{d.invoiceNo}</td>
                <td className="td text-slate-500 dark:text-slate-500">{formatDate(d.date)}</td>
                <td className="td font-medium text-slate-700 dark:text-slate-200">{d.createdBy.name}</td>
                <td className="td text-right text-slate-600 dark:text-slate-300">{d.items.length} item</td>
                <td className="td text-right font-semibold">{formatCurrency(d.totalAmount)}</td>
                <td className="td text-center"><span className={cn('badge', STATUS_COLOR[d.status])}>{d.status}</span></td>
                <td className="td text-center">
                  <div className="flex items-center justify-center gap-2">
                    {d.status === 'UNPAID' && ['KONVEKSI', 'GUDANG', 'OWNER'].includes(role) && (
                      <button onClick={() => openEdit(d)} className="text-blue-500 hover:text-blue-600 transition-colors" title="Edit">
                        <Pencil size={18} />
                      </button>
                    )}
                    {d.status === 'UNPAID' && ['KONVEKSI', 'GUDANG', 'OWNER'].includes(role) && (
                      <button onClick={() => handleDecline(d.id)} disabled={declineMutation.isPending} className="text-red-500 hover:text-red-600 transition-colors" title="Decline">
                        <XCircle size={18} />
                      </button>
                    )}
                  </div>
                  {d.status === 'PAID' && <span className="text-xs text-slate-400 dark:text-slate-500">Selesai</span>}
                  {d.status === 'CANCELLED' && <span className="text-xs text-slate-400 dark:text-slate-500">Ditolak</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-surface)] rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-[var(--bg-surface)] flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
              <h2 className="font-display font-semibold text-slate-800 dark:text-slate-100">{editId ? 'Edit Delivery' : 'Ambil Stok dari Gudang'}</h2>
              <button onClick={() => setModal(false)} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-300"><X size={18} /></button>
            </div>
            <form onSubmit={e => { e.preventDefault(); if (!items.length) return toast.error('Tambahkan minimal 1 item'); editId ? updateMutation.mutate({ items, notes }) : createMutation.mutate({ items, notes }) }} className="p-5 space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                ⚠️ Stok Gudang akan <strong>langsung berkurang</strong> saat kamu submit. Harga = harga beli terakhir dari supplier.
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="label mb-0">Item yang Diambil *</label>
                  <button type="button" onClick={addItem} className="btn-secondary text-xs py-1 px-3"><Plus size={12} /> Tambah</button>
                </div>
                {items.length === 0 && <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg p-5 text-center text-slate-400 dark:text-slate-500 text-sm">Klik "Tambah"</div>}
                <div className="space-y-2">
                  {items.map((item, i) => {
                    const prod = products?.find((p: any) => p.id === item.productId)
                    return (
                      <div key={i} className="grid grid-cols-10 gap-2 items-end p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                        <div className="col-span-6">
                          {i === 0 && <label className="label text-xs">Produk (stok tersedia)</label>}
                          <select className="input" value={item.productId} onChange={e => updateItem(i, 'productId', e.target.value)} required>
                            <option value="">-- Pilih --</option>
                            {products?.map((p: any) => (
                              <option key={p.id} value={p.id} disabled={p.currentStock <= 0}>
                                {p.name} (stok: {p.currentStock} {p.unit})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="col-span-3">
                          {i === 0 && <label className="label text-xs">Qty</label>}
                          <div className="flex items-center gap-1">
                            <input type="number" className="input" min={1} max={prod?.currentStock}
                              value={item.qty} onChange={e => updateItem(i, 'qty', e.target.value)} required />
                            <span className="text-xs text-slate-400 dark:text-slate-500 flex-shrink-0">{item.unit}</span>
                          </div>
                        </div>
                        <div className="col-span-1 flex justify-end">
                          <button type="button" onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={14} /></button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div><label className="label">Catatan</label><textarea className="input resize-none" rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Keperluan pengambilan..." /></div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModal(false)} className="btn-secondary flex-1 justify-center">Batal</button>
                <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="btn-primary flex-1 justify-center">
                  {(createMutation.isPending || updateMutation.isPending) && <Loader2 size={14} className="animate-spin" />} {editId ? 'Update Delivery' : 'Submit & Ambil Stok'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
