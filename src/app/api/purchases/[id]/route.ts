import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { audit } from '@/lib/audit'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = (session.user as any).role
  const userId = (session.user as any).id
  if (!['FINANCE', 'OWNER'].includes(role)) return NextResponse.json({ error: 'Hanya Finance yang bisa PAY' }, { status: 403 })

  const purchase = await prisma.purchaseRequest.findUnique({
    where: { id: params.id }, include: { items: true },
  })
  if (!purchase) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 })
  if (purchase.status !== 'PENDING') return NextResponse.json({ error: 'Sudah diproses' }, { status: 400 })

  const body = await req.json().catch(() => ({}));

  if (body.action === 'DECLINE') {
    await prisma.purchaseRequest.update({
      where: { id: params.id },
      data: { status: 'CANCELLED', notes: body.reason ? `Alasan decline: ${body.reason}` : undefined }
    })
    await audit(userId, 'DECLINE_PURCHASE', 'PurchaseRequest', params.id)
    return NextResponse.json({ success: true })
  }

  // Get current Finance balance
  const lastFinance = await prisma.walletLedger.findFirst({ where: { entityType: 'FINANCE' }, orderBy: { createdAt: 'desc' } })
  const financeBalance = lastFinance?.balanceAfter ?? 0
  if (financeBalance < purchase.totalAmount) {
    return NextResponse.json({ error: `Kas Finance tidak cukup. Saldo: ${financeBalance.toLocaleString('id-ID')}` }, { status: 400 })
  }

  await prisma.$transaction(async (tx) => {
    // Mark purchase as PAID
    await tx.purchaseRequest.update({
      where: { id: params.id },
      data: { status: 'PAID', paidAt: new Date() },
    })

    // Deduct Finance balance
    await tx.walletLedger.create({
      data: {
        entityType: 'FINANCE', type: 'DEBIT',
        amount: purchase.totalAmount,
        balanceAfter: financeBalance - purchase.totalAmount,
        description: `Pembayaran ke supplier - ${purchase.invoiceNo}`,
        refType: 'PURCHASE', refId: purchase.id,
        topupById: userId,
      },
    })

    // Increase stock for each item
    for (const item of purchase.items) {
      const product = await tx.product.update({
        where: { id: item.productId },
        data: { currentStock: { increment: item.qty } },
      })
      await tx.stockHistory.create({
        data: {
          productId: item.productId, type: 'IN', qty: item.qty,
          stockAfter: product.currentStock,
          refType: 'Purchase', refId: purchase.id,
          notes: `Pembelian ${purchase.invoiceNo}`,
        },
      })
    }
  })

  await audit(userId, 'PAY_PURCHASE', 'PurchaseRequest', purchase.id)
  return NextResponse.json({ success: true })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = (session.user as any).role
  const userId = (session.user as any).id
  if (!['GUDANG', 'OWNER'].includes(role)) return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })

  const purchase = await prisma.purchaseRequest.findUnique({ where: { id: params.id } })
  if (!purchase) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 })
  if (purchase.status !== 'PENDING') return NextResponse.json({ error: 'Hanya bisa diedit saat PENDING' }, { status: 400 })

  const body = await req.json()
  const { supplierId, notes, date, items } = body

  // Calculate new total
  let totalAmount = 0
  for (const item of items) {
    totalAmount += Number(item.qty) * Number(item.pricePerUnit)
  }

  await prisma.$transaction(async (tx) => {
    // Delete old items
    await tx.purchaseItem.deleteMany({ where: { purchaseId: params.id } })
    
    // Update purchase data
    await tx.purchaseRequest.update({
      where: { id: params.id },
      data: {
        supplierId, notes, date: new Date(date), totalAmount,
        items: {
          create: items.map((i: any) => ({
            productId: i.productId,
            qty: Number(i.qty),
            unit: i.unit,
            pricePerUnit: Number(i.pricePerUnit),
            totalPrice: Number(i.qty) * Number(i.pricePerUnit)
          }))
        }
      }
    })
  })

  await audit(userId, 'EDIT_PURCHASE', 'PurchaseRequest', params.id)
  return NextResponse.json({ success: true })
}
