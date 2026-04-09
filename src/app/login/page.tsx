'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Package2, Eye, EyeOff, Loader2 } from 'lucide-react'

const DEMO = [
  { role: 'Gudang',   email: 'gudang@inventory.com',   color: 'text-blue-400   border-blue-500/30   bg-blue-500/10' },
  { role: 'Finance',  email: 'finance@inventory.com',  color: 'text-purple-400 border-purple-500/30 bg-purple-500/10' },
  { role: 'Konveksi', email: 'konveksi@inventory.com', color: 'text-orange-400 border-orange-500/30 bg-orange-500/10' },
  { role: 'Owner',    email: 'owner@inventory.com',    color: 'text-brand-400  border-brand-500/30  bg-brand-500/10' },
]

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [form, setForm] = useState({ email: '', password: '' })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await signIn('credentials', { ...form, redirect: false })
    if (res?.ok) { toast.success('Login berhasil!'); router.push('/dashboard') }
    else toast.error('Email atau password salah')
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'var(--bg-base)' }}>

      {/* Subtle background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-brand-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/3 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-sm relative z-10">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-brand-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-brand-600/30">
            <Package2 size={26} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Inventory System</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Manajemen Stok & Keuangan Internal</p>
        </div>

        {/* Card */}
        <div className="card p-6 space-y-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" placeholder="email@perusahaan.com"
                value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} className="input pr-10"
                  placeholder="••••••••" value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })} required />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: 'var(--text-faint)' }}>
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
              {loading && <Loader2 size={15} className="animate-spin" />}
              {loading ? 'Memproses...' : 'Masuk'}
            </button>
          </form>

          {/* Demo accounts */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
            <p className="text-xs text-center mb-3 font-medium" style={{ color: 'var(--text-faint)' }}>
              Akun Demo — klik untuk isi otomatis
            </p>
            <div className="grid grid-cols-2 gap-2">
              {DEMO.map(a => (
                <button key={a.email}
                  onClick={() => setForm({ email: a.email, password: 'password123' })}
                  className={`text-left px-3 py-2 rounded-xl text-xs border transition-all hover:scale-[1.02] active:scale-95 ${a.color}`}>
                  <p className="font-semibold">{a.role}</p>
                  <p className="opacity-60 truncate mt-0.5 text-[10px]">{a.email}</p>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-center mt-2" style={{ color: 'var(--text-faint)' }}>
              Password: <span className="font-mono">password123</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
