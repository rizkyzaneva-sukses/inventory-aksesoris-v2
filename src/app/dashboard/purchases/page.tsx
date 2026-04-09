'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { useSession } from 'next-auth/react'
import toast from 'react-hot-toast'
import { Plus, X, Loader2, Trash2, ShoppingCart, CheckCircle } from 'lucide-react'
import { formatCurrency, formatDate, cn } from '@/lib/utils'

const STATUS_COLOR: Record<string, string> = {
  PENDING: 'bg-yellow-50 text-yellow-700',
  PAID: 'bg-green-50 text-green-700',
  CANCELLED: 'bg-gray-50 text-gray-500',
}

export default function PurchasesPage() {
  const { data: session } = useSession()
  const role = (session?.user as any)?.role
  const qc = useQueryClient()
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ supplierId: '', notes: '', date: new Date().toISOString().split('T')[0] })
  const [items, setItems] = useState<any[]>([])

  const { data: purchases, isLoading } = useQuery({ queryKey: ['purchases'], queryFn: () => axios.get('/api/purchases').then(r => r.data) })
  const { data: suppliers } = useQuery({ queryKey: ['suppliers'], queryFn: () => axios.get('/api/suppliers').then(r => r.data) })
  const { data: products } = useQuery({ queryKey: ['products'], queryFn: () => axios.get('/api/products').then(r => r.data) })

  const createMutation = useMutation({
    mutationFn: (d: any) => axios.post('/api/purchases', d),
    onSuccess: () => { toast.success('Purchase Request dibuat'); qc.invalidateQueries({ queryKey: ['purchases'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); setModal(false); setItems([]) },
    onError: (e: any) => toast.error(e.response?.data?.error ?? 'Gagal'),
  })

  const payMutation = useMutation({
    mutationFn: (id: string) => axios.patch(`/api/purchases/${id}`, {}),
    onSuccess: () => { toast.success('Pembayaran berhasil! Stok bertambah.'); qc.invalidateQueries({ queryKey: ['purchases'] }); qc.invalidateQueries({ queryKey: ['products'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); qc.invalidateQueries({ queryKey: ['wallet'] }) },
    onError: (e: any) => toast.error(e.response?.data?.error ?? 'Gagal PAY'),
  })

  function addItem() { setItems([...items, { productId: '', qty: '1', unit: 'pcs', pricePerUnit: '0' }]) }
  function removeItem(i: number) { setItems(items.filter((_, idx) => idx !== i)) }
  function updateItem(i: number, field: string, val: string) {
    const updated = [...items]; updated[i] = { ...updated[i], [field]: val }
    if (field === 'productId') { const p = products?.find((p: any) => p.id === val); if (p) updated[i].unit = p.unit }
    setItems(updated)
  }

  const total = items.reduce((s, i) => s + Number(i.qty) * Number(i.pricePerUnit), 0)

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-800">Purchase Request</h1>
          <p className="text-slate-500 text-sm mt-1">Permintaan pembelian aksesoris ke supplier</p>
        </div>
        {['GUDANG', 'OWNER'].includes(role) && <button onClick={() => setModal(true)} className="btn-primary"><Plus size={16} /> Buat PR</button>}
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="th">Invoice</th><th className="th">Tanggal</th><th className="th">Supplier</th>
              <th className="th">Dibuat Oleh</th><th className="th text-right">Total</th>
              <th className="th text-center">Status</th><th className="th text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {isLoading && <tr><td colSpan={7} className="td text-center py-8 text-slate-400">Memuat...</td></tr>}
            {!isLoading && purchases?.length === 0 && (
              <tr><td colSpan={7} className="td text-center py-12 text-slate-400">
                <ShoppingCart size={32} className="mx-auto mb-2 text-slate-200" /><p>Belum ada Purchase Request</p>
              </td></tr>
            )}
            {purchases?.map((p: any) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="td font-mono text-xs font-medium">{p.invoiceNo}</td>
                <td className="td text-slate-500">{formatDate(p.date)}</td>
                <td className="td font-medium text-slate-700">{p.supplier.name}</td>
                <td className="td text-slate-500">{p.createdBy.name}</td>
                <td className="td text-right font-semibold">{formatCurrency(p.totalAmount)}</td>
                <td className="td text-center"><span className={cn('badge', STATUS_COLOR[p.status])}>{p.status}</span></td>
                <td className="td text-center">
                  {p.status === 'PENDING' && ['FINANCE', 'OWNER'].includes(role) && (
                    <button onClick={() => { if (confirm(`PAY ${p.invoiceNo} sebesar ${formatCurrency(p.totalAmount)}?`)) payMutation.mutate(p.id) }}
                      disabled={payMutation.isPending}
                      className="btn-pay text-xs py-1 px-3">
                      <CheckCircle size={13} /> PAY
                    </button>
                  )}
                  {p.status === 'PAID' && <span className="text-xs text-slate-400">Lunas</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal buat PR */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="font-display font-semibold text-slate-800">Buat Purchase Request</h2>
              <button onClick={() => setModal(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>
            <form onSubmit={e => { e.preventDefault(); if (!items.length) return toast.error('Tambahkan minimal 1 item'); createMutation.mutate({ ...form, items }) }} className="p-5 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Supplier *</label>
                  <select className="input" value={form.supplierId} onChange={e => setForm({ ...form, supplierId: e.target.value })} required>
                    <option value="">-- Pilih Supplier --</option>
                    {suppliers?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div><label className="label">Tanggal</label><input type="date" className="input" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
              </div>
              <div><label className="label">Catatan</label><textarea className="input resize-none" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="label mb-0">Item Pembelian *</label>
                  <button type="button" onClick={addItem} className="btn-secondary text-xs py-1 px-3"><Plus size={12} /> Tambah Item</button>
                </div>
                {items.length === 0 && <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center text-slate-400 text-sm">Klik "Tambah Item"</div>}
                <div className="space-y-2">
                  {items.map((item, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-end p-3 bg-slate-50 rounded-lg">
                      <div className="col-span-5">
                        {i === 0 && <label className="label text-xs">Produk</label>}
                        <select className="input" value={item.productId} onChange={e => updateItem(i, 'productId', e.target.value)} required>
                          <option value="">-- Pilih --</option>
                          {products?.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </div>
                      <div className="col-span-2">
                        {i === 0 && <label className="label text-xs">Qty</label>}
                        <input type="number" className="input" min={1} value={item.qty} onChange={e => updateItem(i, 'qty', e.target.value)} required />
                      </div>
                      <div className="col-span-2">
                        {i === 0 && <label className="label text-xs">Satuan</label>}
                        <input className="input" value={item.unit} onChange={e => updateItem(i, 'unit', e.target.value)} />
                      </div>
                      <div className="col-span-2">
                        {i === 0 && <label className="label text-xs">Harga/Satuan</label>}
                        <input type="number" className="input" min={0} value={item.pricePerUnit} onChange={e => updateItem(i, 'pricePerUnit', e.target.value)} required />
                      </div>
                      <div className="col-span-1 flex justify-end">
                        <button type="button" onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {items.length > 0 && (
                <div className="bg-brand-50 rounded-lg p-4 flex justify-between items-center">
                  <span className="text-sm font-medium text-brand-700">Total</span>
                  <span className="text-xl font-display font-bold text-brand-800">{formatCurrency(total)}</span>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModal(false)} className="btn-secondary flex-1 justify-center">Batal</button>
                <button type="submit" disabled={createMutation.isPending} className="btn-primary flex-1 justify-center">
                  {createMutation.isPending && <Loader2 size={14} className="animate-spin" />} Buat PR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
