import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json(await prisma.supplier.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }))
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['GUDANG', 'OWNER'].includes((session.user as any).role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { name, phone, address, notes } = await req.json()
  if (!name) return NextResponse.json({ error: 'Nama wajib diisi' }, { status: 400 })
  const s = await prisma.supplier.create({ data: { name, phone, address, notes } })
  return NextResponse.json(s, { status: 201 })
}
