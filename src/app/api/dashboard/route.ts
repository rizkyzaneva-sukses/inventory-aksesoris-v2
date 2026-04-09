import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { WalletEntityType } from '@prisma/client'

async function getBalance(entityType: WalletEntityType) {
  const last = await prisma.walletLedger.findFirst({ where: { entityType }, orderBy: { createdAt: 'desc' } })
  return last?.balanceAfter ?? 0
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = (session.user as any).role

  const allProducts = await prisma.product.findMany({ where: { isActive: true }, select: { currentStock: true, minStock: true } })
  const lowStock = allProducts.filter(p => p.currentStock <= p.minStock).length
  const totalProducts = allProducts.length

  const pendingPurchases = await prisma.purchaseRequest.count({ where: { status: 'PENDING' } })
  const unpaidInvoices = await prisma.deliveryRequest.count({ where: { status: 'UNPAID' } })

  const recentPurchases = await prisma.purchaseRequest.findMany({
    orderBy: { createdAt: 'desc' }, take: 5,
    include: { supplier: true, createdBy: { select: { name: true } } }
  })
  const recentDeliveries = await prisma.deliveryRequest.findMany({
    orderBy: { createdAt: 'desc' }, take: 5,
    include: { createdBy: { select: { name: true } }, items: true }
  })

  let balances: any = {}
  if (['FINANCE', 'OWNER'].includes(role)) {
    balances.finance = await getBalance('FINANCE')
    balances.gudang = await getBalance('GUDANG')
    balances.konveksi = await getBalance('KONVEKSI')
  }
  if (role === 'KONVEKSI') {
    balances.konveksi = await getBalance('KONVEKSI')
  }

  return NextResponse.json({ totalProducts, lowStock, pendingPurchases, unpaidInvoices, recentPurchases, recentDeliveries, balances, role })
}
