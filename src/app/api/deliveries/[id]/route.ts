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
  if (!['FINANCE', 'OWNER'].includes(role)) return NextResponse.json({ error: 'Hanya Finance/Owner yang bisa PAY' }, { status: 403 })

  const delivery = await prisma.deliveryRequest.findUnique({ where: { id: params.id }, include: { items: true } })
  if (!delivery) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 })
  if (delivery.status !== 'UNPAID') return NextResponse.json({ error: 'Invoice sudah diproses' }, { status: 400 })

  const body = await req.json().catch(() => ({}));

  if (body.action === 'DECLINE') {
    await prisma.$transaction(async (tx) => {
      // mark as CANCELLED
      await tx.deliveryRequest.update({
        where: { id: params.id },
        data: { status: 'CANCELLED', notes: body.reason ? `Alasan decline: ${body.reason}` : undefined }
      })
      // Rollback stock! Since Delivery POST subtracts stock
      for (const item of delivery.items) {
        const product = await tx.product.update({
          where: { id: item.productId },
          data: { currentStock: { increment: item.qty } },
        })
        await tx.stockHistory.create({
          data: {
            productId: item.productId, type: 'IN', qty: item.qty,
            stockAfter: product.currentStock,
            refType: 'Delivery_Cancel', refId: delivery.id,
            notes: `Pembatalan Delivery ${delivery.invoiceNo}`,
          },
        })
      }
    })
    await audit(userId, 'DECLINE_DELIVERY', 'DeliveryRequest', params.id)
    return NextResponse.json({ success: true })
  }

  // Get current balances
  const lastKonveksi = await prisma.walletLedger.findFirst({ where: { entityType: 'KONVEKSI' }, orderBy: { createdAt: 'desc' } })
  const lastGudang = await prisma.walletLedger.findFirst({ where: { entityType: 'GUDANG' }, orderBy: { createdAt: 'desc' } })
  const konveksiBalance = lastKonveksi?.balanceAfter ?? 0
  const gudangBalance = lastGudang?.balanceAfter ?? 0

  if (konveksiBalance < delivery.totalAmount) {
    return NextResponse.json({ error: `Saldo Konveksi tidak cukup. Saldo: ${konveksiBalance.toLocaleString('id-ID')}` }, { status: 400 })
  }

  await prisma.$transaction(async (tx) => {
    // Mark delivery as PAID
    await tx.deliveryRequest.update({
      where: { id: params.id },
      data: { status: 'PAID', paidAt: new Date() },
    })

    // Deduct Konveksi balance
    await tx.walletLedger.create({
      data: {
        entityType: 'KONVEKSI', type: 'DEBIT',
        amount: delivery.totalAmount,
        balanceAfter: konveksiBalance - delivery.totalAmount,
        description: `Pembayaran invoice ${delivery.invoiceNo} ke Gudang`,
        refType: 'DELIVERY', refId: delivery.id,
        topupById: userId,
      },
    })

    // Increase Gudang balance
    await tx.walletLedger.create({
      data: {
        entityType: 'GUDANG', type: 'KREDIT',
        amount: delivery.totalAmount,
        balanceAfter: gudangBalance + delivery.totalAmount,
        description: `Penerimaan dari Konveksi - ${delivery.invoiceNo}`,
        refType: 'DELIVERY', refId: delivery.id,
        topupById: userId,
      },
    })
  })

  await audit(userId, 'PAY_DELIVERY', 'DeliveryRequest', delivery.id)
  return NextResponse.json({ success: true })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = (session.user as any).role
  const userId = (session.user as any).id

  const delivery = await prisma.deliveryRequest.findUnique({ where: { id: params.id }, include: { items: true } })
  if (!delivery) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 })
  if (delivery.status !== 'UNPAID') return NextResponse.json({ error: 'Hanya bisa diedit saat UNPAID' }, { status: 400 })

  const { items, notes } = await req.json()

  // Get prices
  const enrichedItems = await Promise.all(items.map(async (item: any) => {
    const paidPurchases = await prisma.purchaseRequest.findMany({
      where: { status: 'PAID' }, orderBy: { date: 'desc' }, include: { items: { where: { productId: item.productId } } }
    })
    let price = 0
    for (const purchase of paidPurchases) { if (purchase.items.length > 0) { price = purchase.items[0].pricePerUnit; break } }
    return { ...item, pricePerUnit: price, totalPrice: Number(item.qty) * price }
  }))
  const totalAmount = enrichedItems.reduce((s, i) => s + i.totalPrice, 0)

  // Validate stock (temporarily adding back old stock for validation)
  for (const item of enrichedItems) {
    const product = await prisma.product.findUnique({ where: { id: item.productId } })
    const oldQty = delivery.items.find(old => old.productId === item.productId)?.qty ?? 0
    const available = (product?.currentStock ?? 0) + oldQty
    if (!product || available < item.qty) {
      return NextResponse.json({ error: `Stok ${product?.name ?? item.productId} tidak cukup (tersedia: ${available})` }, { status: 400 })
    }
  }

  await prisma.$transaction(async (tx) => {
    // Revert old items stock
    for (const item of delivery.items) {
      await tx.product.update({ where: { id: item.productId }, data: { currentStock: { increment: item.qty } } })
    }
    await tx.deliveryItem.deleteMany({ where: { deliveryId: params.id } })

    // Apply new items and stock
    for (const item of enrichedItems) {
      await tx.product.update({ where: { id: item.productId }, data: { currentStock: { decrement: Number(item.qty) } } })
    }

    await tx.deliveryRequest.update({
      where: { id: params.id },
      data: {
        notes, totalAmount,
        items: {
          create: enrichedItems.map(i => ({
            productId: i.productId, qty: Number(i.qty), unit: i.unit,
            pricePerUnit: i.pricePerUnit, totalPrice: i.totalPrice,
          })),
        },
      }
    })
  })

  await audit(userId, 'EDIT_DELIVERY', 'DeliveryRequest', params.id)
  return NextResponse.json({ success: true })
}
