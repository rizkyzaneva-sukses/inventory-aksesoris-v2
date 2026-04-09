import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['OWNER', 'FINANCE'].includes((session.user as any).role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') ?? 'summary'
  const from = new Date(searchParams.get('from') ?? new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const to = new Date(searchParams.get('to') ?? new Date())
  to.setHours(23, 59, 59)

  if (type === 'purchases') {
    return NextResponse.json(await prisma.purchaseRequest.findMany({
      where: { date: { gte: from, lte: to } },
      include: { supplier: true, createdBy: { select: { name: true } }, items: { include: { product: true } } },
      orderBy: { date: 'desc' },
    }))
  }

  if (type === 'deliveries') {
    return NextResponse.json(await prisma.deliveryRequest.findMany({
      where: { date: { gte: from, lte: to } },
      include: { createdBy: { select: { name: true } }, items: { include: { product: true } } },
      orderBy: { date: 'desc' },
    }))
  }

  if (type === 'stock') {
    return NextResponse.json(await prisma.product.findMany({
      where: { isActive: true }, include: { category: true }, orderBy: { name: 'asc' },
    }))
  }

  // Summary
  const [purchaseSummary, deliverySummary] = await Promise.all([
    prisma.purchaseRequest.aggregate({ where: { date: { gte: from, lte: to }, status: 'PAID' }, _sum: { totalAmount: true }, _count: true }),
    prisma.deliveryRequest.aggregate({ where: { date: { gte: from, lte: to }, status: 'PAID' }, _sum: { totalAmount: true }, _count: true }),
  ])

  return NextResponse.json({
    purchaseTotal: Number(purchaseSummary._sum.totalAmount ?? 0),
    purchaseCount: purchaseSummary._count,
    deliveryTotal: Number(deliverySummary._sum.totalAmount ?? 0),
    deliveryCount: deliverySummary._count,
  })
}
