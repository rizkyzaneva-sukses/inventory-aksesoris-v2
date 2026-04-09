'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { useSession } from 'next-auth/react'
import toast from 'react-hot-toast'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { FileText, CheckCircle, XCircle } from 'lucide-react'

const STATUS_COLOR: Record<string, string> = {
  UNPAID: 'bg-red-50 text-red-700',
  PAID: 'bg-green-50 text-green-700',
  CANCELLED: 'bg-gray-50 text-gray-500',
}

export default function InvoicesPage() {
  const { data: session } = useSession()
  const role = (session?.user as any)?.role
  const qc = useQueryClient()

  const { data: deliveries, isLoading } = useQuery({
    queryKey: ['deliveries'],
    queryFn: () => axios.get('/api/deliveries').then(r => r.data),
  })

  const payMutation = useMutation({
    mutationFn: (id: string) => axios.patch(`/api/deliveries/${id}`, {}),
    onSuccess: () => {
      toast.success('Invoice PAID! Saldo Konveksi berkurang, Saldo Gudang bertambah.')
      qc.invalidateQueries({ queryKey: ['deliveries'] })
      qc.invalidateQueries({ queryKey: ['wallet'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (e: any) => toast.error(e.response?.data?.error ?? 'Gagal PAY'),
  })

  const declineMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string, reason: string }) => axios.patch(`/api/deliveries/${id}`, { action: 'DECLINE', reason }),
    onSuccess: () => {
      toast.success('Berhasil ditolak')
      qc.invalidateQueries({ queryKey: ['deliveries'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (e: any) => toast.error(e.response?.data?.error ?? 'Gagal Decline'),
  })

  function handleDecline(id: string) {
    const reason = prompt('Masukkan alasan decline:')
    if (reason !== null) declineMutation.mutate({ id, reason })
  }

  const unpaidTotal = deliveries?.filter((d: any) => d.status === 'UNPAID').reduce((s: number, d: any) => s + d.totalAmount, 0) ?? 0

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-display font-bold text-slate-800 dark:text-slate-100">Invoice Konveksi</h1>
        <p className="text-slate-500 dark:text-slate-500 text-sm mt-1">
          {role === 'FINANCE' ? 'Klik PAY untuk konfirmasi pembayaran dari Konveksi ke Gudang' : 'Riwayat invoice pengambilan aksesoris'}
        </p>
      </div>

      {/* Summary unpaid */}
      {['FINANCE', 'OWNER'].includes(role) && unpaidTotal > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between">
          <p className="text-sm font-medium text-red-800">Total tagihan belum dibayar</p>
          <p className="text-lg font-display font-bold text-red-700">{formatCurrency(unpaidTotal)}</p>
        </div>
      )}

      <div className="space-y-4">
        {isLoading && <div className="card p-8 text-center text-slate-400 dark:text-slate-500">Memuat...</div>}
        {!isLoading && deliveries?.length === 0 && (
          <div className="card p-12 text-center text-slate-400 dark:text-slate-500">
            <FileText size={32} className="mx-auto mb-2 text-slate-200" /><p>Belum ada invoice</p>
          </div>
        )}
        {deliveries?.map((d: any) => (
          <div key={d.id} className="card p-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-sm font-semibold text-slate-800 dark:text-slate-100">{d.invoiceNo}</span>
                  <span className={cn('badge', STATUS_COLOR[d.status])}>{d.status}</span>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-500">{d.createdBy.name} · {formatDate(d.date)}</p>
                {d.notes && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{d.notes}</p>}
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xs text-slate-400 dark:text-slate-500">Total</p>
                  <p className="text-xl font-display font-bold text-slate-800 dark:text-slate-100">{formatCurrency(d.totalAmount)}</p>
                </div>
                <div className="flex gap-2">
                  {d.status === 'UNPAID' && ['FINANCE', 'OWNER'].includes(role) && (
                    <>
                      <button
                        onClick={() => { if (confirm(`PAY invoice ${d.invoiceNo}?`)) payMutation.mutate(d.id) }}
                        disabled={payMutation.isPending}
                        className="text-emerald-500 hover:text-emerald-600 transition-colors" title="PAY">
                        <CheckCircle size={18} />
                      </button>
                      <button
                        onClick={() => handleDecline(d.id)}
                        disabled={declineMutation.isPending}
                        className="text-red-500 hover:text-red-600 transition-colors" title="Decline">
                        <XCircle size={18} />
                      </button>
                    </>
                  )}
                </div>
                {d.status === 'PAID' && d.paidAt && (
                  <p className="text-xs text-slate-400 dark:text-slate-500">Dibayar {formatDate(d.paidAt)}</p>
                )}
              </div>
            </div>

            {/* Items detail */}
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-500 uppercase tracking-wide mb-2">Detail Item</p>
              <div className="space-y-1.5">
                {d.items.map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-300">{item.product.name}</span>
                    <div className="flex items-center gap-4 text-slate-700 dark:text-slate-200">
                      <span>{item.qty} {item.unit}</span>
                      <span className="text-slate-400 dark:text-slate-500">×</span>
                      <span>{formatCurrency(item.pricePerUnit)}</span>
                      <span className="font-semibold w-28 text-right">{formatCurrency(item.totalPrice)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
