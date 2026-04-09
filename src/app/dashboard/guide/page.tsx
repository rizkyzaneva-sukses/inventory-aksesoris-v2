'use client'
import { useSession } from 'next-auth/react'
import { BookOpen, Users, Workflow, Info, CheckCircle2, AlertCircle } from 'lucide-react'

export default function GuidePage() {
  const { data: session } = useSession()
  const role = (session?.user as any)?.role || 'Pengguna'

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <BookOpen className="text-brand-500" size={28} />
          Panduan Penggunaan Sistem
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Pelajari alur kerja dan fitur aplikasi untuk memudahkan tim Anda bekerja.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Kolom Kiri: Peran & Akses */}
        <div className="md:col-span-1 space-y-6">
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Users size={18} className="text-blue-500" />
              <h2 className="font-semibold text-slate-800 dark:text-slate-100">Peran & Akses (Roles)</h2>
            </div>
            <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                <p className="font-semibold text-brand-600 dark:text-brand-400 mb-1">Gudang</p>
                <p className="text-xs">Mengelola fisik barang, mengajukan permohonan belanja (PR), dan mendrop stok ke Konveksi.</p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                <p className="font-semibold text-purple-600 dark:text-purple-400 mb-1">Finance</p>
                <p className="text-xs">Memegang kendali uang, membayar tagihan PR dari Gudang, dan membagikan dana kas operasional.</p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                <p className="font-semibold text-amber-600 dark:text-amber-400 mb-1">Konveksi</p>
                <p className="text-xs">Menerima suplai stok barang dari Gudang Utama dan memantau ketersediaan barang produksi.</p>
              </div>
            </div>
          </div>

          <div className="card p-5 bg-brand-50 dark:bg-brand-900/20 border-brand-100 dark:border-brand-800/30">
            <div className="flex gap-3">
              <AlertCircle size={20} className="text-brand-600 dark:text-brand-400 shrink-0" />
              <div>
                <h3 className="text-sm font-semibold text-brand-800 dark:text-brand-300">Tips Operasional</h3>
                <p className="text-xs text-brand-700 dark:text-brand-400 mt-1 leading-relaxed">
                  Gunakan menu audit untuk mengecek siapa yang melakukan penghapusan produk atau pembatalan data. Hindari membagikan password antar divisi.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Kolom Kanan: Workflow */}
        <div className="md:col-span-2 space-y-6">
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-5">
              <Workflow size={18} className="text-emerald-500" />
              <h2 className="font-semibold text-slate-800 dark:text-slate-100">Workflow Harian Standard</h2>
            </div>
            
            <div className="relative border-l border-slate-200 dark:border-slate-700 ml-3 space-y-8 pb-4">
              
              <div className="relative pl-6">
                <div className="absolute -left-1.5 top-1 w-3 h-3 rounded-full bg-blue-500 ring-4 ring-white dark:ring-[#161b22]"></div>
                <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">1. Minta Stok Baru (Gudang)</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Saat stok menipis, pergi ke menu <span className="font-medium">Purchase Request</span> (PR). Buat pesanan baru ke Supplier.</p>
              </div>

              <div className="relative pl-6">
                <div className="absolute -left-1.5 top-1 w-3 h-3 rounded-full bg-purple-500 ring-4 ring-white dark:ring-[#161b22]"></div>
                <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">2. Membayar Tagihan (Finance)</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Finance membuka PR yang berstatus PENDING, lalu mengecek ketersediaan saldo. Jika OK, klik tombol <span className="font-medium text-emerald-600">PAY</span>. Otomatis stok akan bertambah ke sistem.</p>
              </div>

              <div className="relative pl-6">
                <div className="absolute -left-1.5 top-1 w-3 h-3 rounded-full bg-amber-500 ring-4 ring-white dark:ring-[#161b22]"></div>
                <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">3. Distribusi Stok (Gudang & Konveksi)</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Gudang mendistribusikan barang fisik ke Konveksi. Jangan lupa untuk mengisi form di menu <span className="font-medium">Deliveries / Drop Stok</span> agar jumlah barang di gudang utama berkurang.</p>
              </div>

              <div className="relative pl-6">
                <div className="absolute -left-1.5 top-1 w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-white dark:ring-[#161b22]"></div>
                <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">4. Pendistribusian Kas (Finance)</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Gunakan tab <span className="font-medium">Saldo & Kas</span> untuk mentransfer uang operasional harian/mingguan dari Finance ke Gudang atau Konveksi.</p>
              </div>

            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Info size={18} className="text-cyan-500" />
              <h2 className="font-semibold text-slate-800 dark:text-slate-100">Penjelasan Fitur Modul</h2>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <p className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-brand-500"/> Produk
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 pl-5">Database/master barang aksesoris beserta harganya.</p>
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-brand-500"/> PR (Purchase Request)
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 pl-5">Permohonan belanja kepada Supplier. Butuh di-PAY Finance.</p>
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-brand-500"/> Saldo & Kas
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 pl-5">Cek history transfer dana, Top-Up, dan pantau saldo Entitas.</p>
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-brand-500"/> Deliveries
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 pl-5">Penyerahan/Drop barang dari Gudang utama ke cabang lain.</p>
              </div>
               <div className="space-y-1">
                <p className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-brand-500"/> Laporan
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 pl-5">Tarik rekapan data masuk/keluar dari stok dan kas bulanan.</p>
              </div>
               <div className="space-y-1">
                <p className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-brand-500"/> Audit Trail
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 pl-5">Rekam jejak setiap aksi krusial pengguna sistem secara *real time*.</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
