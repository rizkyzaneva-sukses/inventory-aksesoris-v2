'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { useSession } from 'next-auth/react'
import toast from 'react-hot-toast'
import { Plus, Search, AlertTriangle, X, Loader2, Package } from 'lucide-react'
import { getStockStatus, cn } from '@/lib/utils'

export default function ProductsPage() {
  const { data: session } = useSession()
  const role = (session?.user as any)?.role
  const canEdit = ['GUDANG', 'OWNER'].includes(role)
  const qc = useQueryClient()

  const [search, setSearch] = useState('')
  const [filterLow, setFilterLow] = useState(false)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState({ name: '', sku: '', description: '', unit: 'pcs', minStock: '10', categoryId: '' })

  const { data: products, isLoading } = useQuery({
    queryKey: ['products', search, filterLow],
    queryFn: () => axios.get('/api/products', { params: { search, lowStock: filterLow ? 'true' : undefined } }).then(r => r.data),
  })
  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: () => axios.get('/api/categories').then(r => r.data) })

  const mutation = useMutation({
    mutationFn: (data: any) => editing ? axios.patch(`/api/products/${editing.id}`, data) : axios.post('/api/products', data),
    onSuccess: () => { toast.success(editing ? 'Produk diperbarui' : 'Produk ditambahkan'); qc.invalidateQueries({ queryKey: ['products'] }); closeModal() },
    onError: (e: any) => toast.error(e.response?.data?.error ?? 'Gagal'),
  })

  function openAdd() { setEditing(null); setForm({ name: '', sku: '', description: '', unit: 'pcs', minStock: '10', categoryId: '' }); setModal(true) }
  function openEdit(p: any) { setEditing(p); setForm({ name: p.name, sku: p.sku, description: p.description ?? '', unit: p.unit, minStock: String(p.minStock), categoryId: p.category?.id ?? '' }); setModal(true) }
  function closeModal() { setModal(false); setEditing(null) }

  const lowCount = products?.filter((p: any) => p.currentStock <= p.minStock).length ?? 0

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-800">Produk & Stok</h1>
          <p className="text-slate-500 text-sm mt-1">{products?.length ?? 0} produk aktif</p>
        </div>
        {canEdit && <button onClick={openAdd} className="btn-primary"><Plus size={16} /> Tambah Produk</button>}
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-52">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="Cari nama atau SKU..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button onClick={() => setFilterLow(!filterLow)}
          className={cn('btn', filterLow ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'btn-secondary')}>
          <AlertTriangle size={14} /> Stok Menipis {lowCount > 0 && `(${lowCount})`}
        </button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="th">SKU</th><th className="th">Nama Produk</th><th className="th">Kategori</th>
              <th className="th text-right">Stok</th><th className="th text-right">Min</th>
              <th className="th text-center">Status</th>
              {canEdit && <th className="th text-center">Aksi</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {isLoading && <tr><td colSpan={7} className="td text-center py-8 text-slate-400">Memuat...</td></tr>}
            {!isLoading && products?.length === 0 && (
              <tr><td colSpan={7} className="td text-center py-12 text-slate-400">
                <Package size={32} className="mx-auto mb-2 text-slate-200" /><p>Tidak ada produk</p>
              </td></tr>
            )}
            {products?.map((p: any) => {
              const s = getStockStatus(p.currentStock, p.minStock)
              return (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="td font-mono text-xs text-slate-500">{p.sku}</td>
                  <td className="td"><p className="font-medium text-slate-800">{p.name}</p>{p.description && <p className="text-xs text-slate-400 truncate max-w-48">{p.description}</p>}</td>
                  <td className="td">{p.category ? <span className="badge bg-slate-100 text-slate-600">{p.category.name}</span> : <span className="text-slate-300">-</span>}</td>
                  <td className="td text-right font-semibold">{p.currentStock.toLocaleString('id-ID')} <span className="font-normal text-xs text-slate-400">{p.unit}</span></td>
                  <td className="td text-right text-slate-500">{p.minStock}</td>
                  <td className="td text-center"><span className={cn('badge', s.color)}>{s.label}</span></td>
                  {canEdit && <td className="td text-center"><button onClick={() => openEdit(p)} className="text-xs text-brand-600 hover:text-brand-800 font-medium">Edit</button></td>}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="font-display font-semibold text-slate-800">{editing ? 'Edit Produk' : 'Tambah Produk'}</h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>
            <form onSubmit={e => { e.preventDefault(); mutation.mutate({ ...form, minStock: Number(form.minStock) }) }} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Nama *</label><input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
                <div><label className="label">SKU *</label><input className="input uppercase" value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} disabled={!!editing} required /></div>
              </div>
              <div><label className="label">Deskripsi</label><textarea className="input resize-none" rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Satuan *</label>
                  <select className="input" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}>
                    {['pcs','meter','kg','lusin','kodi','gross','rol','lembar','gulung'].map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
                <div><label className="label">Stok Minimum</label><input type="number" className="input" min={0} value={form.minStock} onChange={e => setForm({ ...form, minStock: e.target.value })} /></div>
              </div>
              <div><label className="label">Kategori</label>
                <select className="input" value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })}>
                  <option value="">-- Pilih Kategori --</option>
                  {categories?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeModal} className="btn-secondary flex-1 justify-center">Batal</button>
                <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1 justify-center">
                  {mutation.isPending && <Loader2 size={14} className="animate-spin" />}{editing ? 'Simpan' : 'Tambah'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
