import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'

export const cn = (...i: ClassValue[]) => twMerge(clsx(i))

export const formatCurrency = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)

export const formatDate = (d: Date | string) => format(new Date(d), 'dd MMM yyyy', { locale: id })
export const formatDateTime = (d: Date | string) => format(new Date(d), 'dd MMM yyyy, HH:mm', { locale: id })

export const genInvoice = (prefix: string) => {
  const n = new Date()
  return `${prefix}-${n.getFullYear()}${String(n.getMonth()+1).padStart(2,'0')}${String(n.getDate()).padStart(2,'0')}-${Math.floor(Math.random()*9000)+1000}`
}

export const getRoleBadge = (role: string) => ({
  GUDANG:   { label: 'Gudang',   color: 'bg-blue-100 text-blue-800' },
  FINANCE:  { label: 'Finance',  color: 'bg-purple-100 text-purple-800' },
  KONVEKSI: { label: 'Konveksi', color: 'bg-orange-100 text-orange-800' },
  OWNER:    { label: 'Owner',    color: 'bg-green-100 text-green-800' },
}[role] ?? { label: role, color: 'bg-gray-100 text-gray-800' })

export const getStockStatus = (cur: number, min: number) => {
  if (cur <= 0) return { label: 'Habis', color: 'text-red-600 bg-red-50' }
  if (cur <= min) return { label: 'Menipis', color: 'text-yellow-600 bg-yellow-50' }
  return { label: 'Aman', color: 'text-green-600 bg-green-50' }
}

// Get current wallet balance for an entity
export async function getWalletBalance(prisma: any, entityType: string): Promise<number> {
  const last = await prisma.walletLedger.findFirst({
    where: { entityType },
    orderBy: { createdAt: 'desc' },
  })
  return last?.balanceAfter ?? 0
}
