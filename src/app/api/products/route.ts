import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') ?? ''
  const lowStock = searchParams.get('lowStock') === 'true'

  const products = await prisma.product.findMany({
    where: { isActive: true, ...(search ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { sku: { contains: search, mode: 'insensitive' } }] } : {}) },
    include: { category: true },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json(lowStock ? products.filter(p => p.currentStock <= p.minStock) : products)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = (session.user as any).role
  if (!['GUDANG', 'OWNER'].includes(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { name, sku, description, unit, minStock, categoryId } = body
  if (!name || !sku || !unit) return NextResponse.json({ error: 'name, sku, unit wajib diisi' }, { status: 400 })

  try {
    const product = await prisma.product.create({
      data: { name, sku: sku.toUpperCase(), description, unit, minStock: Number(minStock ?? 10), categoryId: categoryId || null },
      include: { category: true },
    })
    return NextResponse.json(product, { status: 201 })
  } catch (e: any) {
    if (e.code === 'P2002') return NextResponse.json({ error: 'SKU sudah digunakan' }, { status: 409 })
    return NextResponse.json({ error: 'Gagal membuat produk' }, { status: 500 })
  }
}
