'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import toast from 'react-hot-toast'
import { Plus, X, Loader2, Users } from 'lucide-react'
import { formatDate, getRoleBadge, cn } from '@/lib/utils'

export default function UsersPage() {
  const qc = useQueryClient()
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'GUDANG' })

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => axios.get('/api/users').then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (d: any) => axios.post('/api/users', d),
    onSuccess: () => {
      toast.success('User berhasil ditambahkan')
      qc.invalidateQueries({ queryKey: ['users'] })
      setModal(false)
      setForm({ name: '', email: '', password: '', role: 'GUDANG' })
    },
    onError: (e: any) => toast.error(e.response?.data?.error ?? 'Gagal'),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      axios.patch('/api/users', { id, isActive }),
    onSuccess: () => { toast.success('Status user diperbarui'); qc.invalidateQueries({ queryKey: ['users'] }) },
    onError: () => toast.error('Gagal update status'),
  })

  const ROLES = ['GUDANG', 'FINANCE', 'KONVEKSI', 'OWNER']

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-800 dark:text-slate-100">Manajemen User</h1>
          <p className="text-slate-500 dark:text-slate-500 text-sm mt-1">Kelola akun karyawan & akses sistem</p>
        </div>
        <button onClick={() => setModal(true)} className="btn-primary">
          <Plus size={16} /> Tambah User
        </button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
            <tr>
              <th className="th">Nama</th>
              <th className="th">Email</th>
              <th className="th">Role</th>
              <th className="th text-center">Status</th>
              <th className="th">Bergabung</th>
              <th className="th text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {isLoading && <tr><td colSpan={6} className="td text-center py-8 text-slate-400 dark:text-slate-500">Memuat...</td></tr>}
            {!isLoading && users?.length === 0 && (
              <tr><td colSpan={6} className="td text-center py-12 text-slate-400 dark:text-slate-500">
                <Users size={32} className="mx-auto mb-2 text-slate-200" /><p>Belum ada user</p>
              </td></tr>
            )}
            {users?.map((u: any) => {
              const badge = getRoleBadge(u.role)
              return (
                <tr key={u.id} className="hover:bg-slate-50 dark:bg-slate-800/50">
                  <td className="td font-medium text-slate-800 dark:text-slate-100">{u.name}</td>
                  <td className="td text-slate-500 dark:text-slate-500">{u.email}</td>
                  <td className="td"><span className={cn('badge', badge.color)}>{badge.label}</span></td>
                  <td className="td text-center">
                    <span className={cn('badge', u.isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600')}>
                      {u.isActive ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="td text-slate-400 dark:text-slate-500 text-sm">{formatDate(u.createdAt)}</td>
                  <td className="td text-center">
                    <button
                      onClick={() => {
                        if (confirm(`${u.isActive ? 'Nonaktifkan' : 'Aktifkan'} user ${u.name}?`))
                          toggleMutation.mutate({ id: u.id, isActive: !u.isActive })
                      }}
                      className={cn('text-xs font-medium', u.isActive ? 'text-red-500 hover:text-red-700' : 'text-green-600 hover:text-green-800')}>
                      {u.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-surface)] rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
              <h2 className="font-display font-semibold text-slate-800 dark:text-slate-100">Tambah User</h2>
              <button onClick={() => setModal(false)} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-300"><X size={18} /></button>
            </div>
            <form onSubmit={e => { e.preventDefault(); createMutation.mutate(form) }} className="p-5 space-y-4">
              <div>
                <label className="label">Nama Lengkap *</label>
                <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div>
                <label className="label">Email *</label>
                <input type="email" className="input" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
              </div>
              <div>
                <label className="label">Password *</label>
                <input type="password" className="input" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required minLength={6} />
              </div>
              <div>
                <label className="label">Role *</label>
                <select className="input" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModal(false)} className="btn-secondary flex-1 justify-center">Batal</button>
                <button type="submit" disabled={createMutation.isPending} className="btn-primary flex-1 justify-center">
                  {createMutation.isPending && <Loader2 size={14} className="animate-spin" />} Tambah
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
