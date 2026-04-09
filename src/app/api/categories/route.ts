import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const cats = await prisma.category.findMany({ orderBy: { name: 'asc' } })
  return NextResponse.json(cats)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { name } = await req.json()
  try {
    const cat = await prisma.category.create({ data: { name } })
    return NextResponse.json(cat, { status: 201 })
  } catch { return NextResponse.json({ error: 'Kategori sudah ada' }, { status: 409 }) }
}
