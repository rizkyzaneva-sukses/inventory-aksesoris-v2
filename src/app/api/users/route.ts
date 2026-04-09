import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'OWNER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  return NextResponse.json(await prisma.user.findMany({ select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true }, orderBy: { name: 'asc' } }))
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'OWNER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { name, email, password, role } = await req.json()
  if (!name || !email || !password || !role) return NextResponse.json({ error: 'Semua field wajib diisi' }, { status: 400 })

  try {
    const user = await prisma.user.create({
      data: { name, email, password: await bcrypt.hash(password, 10), role },
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    })
    return NextResponse.json(user, { status: 201 })
  } catch { return NextResponse.json({ error: 'Email sudah digunakan' }, { status: 409 }) }
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'OWNER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id, isActive } = await req.json()
  const user = await prisma.user.update({ where: { id }, data: { isActive }, select: { id: true, name: true, isActive: true } })
  return NextResponse.json(user)
}
