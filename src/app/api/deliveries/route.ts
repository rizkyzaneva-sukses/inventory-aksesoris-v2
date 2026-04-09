import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { genInvoice } from '@/lib/utils'
import { audit } from '@/lib/audit'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = (session.user as any).role
  const userId = (session.user as any).id

  const deliveries = await prisma.deliveryRequest.findMany({
    where: role === 'KONVEKSI' ? { createdById: userId } : {},
    orderBy: { createdAt: 'desc' },
    include: { createdBy: { select: { id: true, name: true } }, items: { include: { product: true } } },
  })
  return NextResponse.json(deliveries)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = (session.user as any).role
  const userId = (session.user as any).id
  if (!['KONVEKSI', 'GUDANG', 'OWNER'].includes(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { items, notes, date } = await req.json()
  if (!items?.length) return NextResponse.json({ error: 'Items wajib diisi' }, { status: 400 })

  // Get latest PAID purchase price per product
  const enrichedItems = await Promise.all(items.map(async (item: any) => {
    const paidPurchases = await prisma.purchaseRequest.findMany({
      where: { status: 'PAID' },
      orderBy: { date: 'desc' },
      include: {
        items: { where: { productId: item.productId } },
      },
    })

    let price = 0
    for (const purchase of paidPurchases) {
      if (purchase.items.length > 0) {
        price = purchase.items[0].pricePerUnit
        break
      }
    }

    return { ...item, pricePerUnit: price, totalPrice: Number(item.qty) * price }
  }))

  const totalAmount = enrichedItems.reduce((s, i) => s + i.totalPrice, 0)

  // Check stock availability
  for (const item of enrichedItems) {
    const product = await prisma.product.findUnique({ where: { id: item.productId } })
    if (!product || product.currentStock < item.qty) {
      return NextResponse.json({
        error: `Stok ${product?.name ?? item.productId} tidak cukup (tersedia: ${product?.currentStock ?? 0})`
      }, { status: 400 })
    }
  }

  const delivery = await prisma.$transaction(async (tx) => {
    const dr = await tx.deliveryRequest.create({
      data: {
        invoiceNo: genInvoice('DO'),
        date: date ? new Date(date) : new Date(),
        createdById: userId, notes, totalAmount, status: 'UNPAID',
        items: {
          create: enrichedItems.map(i => ({
            productId: i.productId, qty: Number(i.qty), unit: i.unit,
            pricePerUnit: i.pricePerUnit, totalPrice: i.totalPrice,
          })),
        },
      },
      include: { items: { include: { product: true } } },
    })

    for (const item of enrichedItems) {
      const product = await tx.product.update({
        where: { id: item.productId },
        data: { currentStock: { decrement: Number(item.qty) } },
      })
      await tx.stockHistory.create({
        data: {
          productId: item.productId, type: 'OUT', qty: -Number(item.qty),
          stockAfter: product.currentStock,
          refType: 'Delivery', refId: dr.id,
          notes: `Delivery ${dr.invoiceNo}`,
        },
      })
    }
    return dr
  })

  await audit(userId, 'CREATE_DELIVERY', 'DeliveryRequest', delivery.id, { invoiceNo: delivery.invoiceNo, totalAmount })
  return NextResponse.json(delivery, { status: 201 })
}
