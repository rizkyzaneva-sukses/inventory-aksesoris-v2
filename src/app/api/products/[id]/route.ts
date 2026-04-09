import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = (session.user as any).role
  if (!['GUDANG', 'OWNER'].includes(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const product = await prisma.product.update({
    where: { id: params.id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.unit !== undefined && { unit: body.unit }),
      ...(body.minStock !== undefined && { minStock: Number(body.minStock) }),
      ...(body.categoryId !== undefined && { categoryId: body.categoryId || null }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
    },
    include: { category: true },
  })
  return NextResponse.json(product)
}
