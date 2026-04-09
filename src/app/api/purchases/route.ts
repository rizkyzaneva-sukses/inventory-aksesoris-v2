import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { genInvoice } from '@/lib/utils'
import { audit } from '@/lib/audit'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role === 'KONVEKSI') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const purchases = await prisma.purchaseRequest.findMany({
    orderBy: { createdAt: 'desc' },
    include: { supplier: true, createdBy: { select: { id: true, name: true } }, items: { include: { product: true } } },
  })
  return NextResponse.json(purchases)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = (session.user as any).role
  const userId = (session.user as any).id
  if (!['GUDANG', 'OWNER'].includes(role)) return NextResponse.json({ error: 'Hanya Gudang yang bisa buat Purchase Request' }, { status: 403 })

  const { supplierId, notes, items, date } = await req.json()
  if (!supplierId || !items?.length) return NextResponse.json({ error: 'Supplier dan items wajib diisi' }, { status: 400 })

  const totalAmount = items.reduce((s: number, i: any) => s + Number(i.qty) * Number(i.pricePerUnit), 0)

  const purchase = await prisma.purchaseRequest.create({
    data: {
      invoiceNo: genInvoice('PR'),
      date: date ? new Date(date) : new Date(),
      supplierId, createdById: userId, notes, totalAmount, status: 'PENDING',
      items: {
        create: items.map((i: any) => ({
          productId: i.productId, qty: Number(i.qty), unit: i.unit,
          pricePerUnit: Number(i.pricePerUnit), totalPrice: Number(i.qty) * Number(i.pricePerUnit),
        })),
      },
    },
    include: { supplier: true, items: { include: { product: true } } },
  })

  await audit(userId, 'CREATE_PURCHASE', 'PurchaseRequest', purchase.id, { invoiceNo: purchase.invoiceNo, totalAmount })
  return NextResponse.json(purchase, { status: 201 })
}
