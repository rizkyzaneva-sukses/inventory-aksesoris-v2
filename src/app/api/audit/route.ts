import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if ((session.user as any).role !== 'OWNER') {
    return NextResponse.json({ error: 'Forbidden - Owner only' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') ?? ''
  const userId = searchParams.get('userId') ?? ''
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = 50

  const logs = await prisma.auditLog.findMany({
    where: {
      ...(search ? {
        OR: [
          { action: { contains: search, mode: 'insensitive' } },
          { entity: { contains: search, mode: 'insensitive' } },
        ],
      } : {}),
      ...(userId ? { userId } : {}),
    },
    include: {
      user: { select: { id: true, name: true, role: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: (page - 1) * limit,
  })

  const total = await prisma.auditLog.count({
    where: {
      ...(search ? {
        OR: [
          { action: { contains: search, mode: 'insensitive' } },
          { entity: { contains: search, mode: 'insensitive' } },
        ],
      } : {}),
      ...(userId ? { userId } : {}),
    },
  })

  const users = await prisma.user.findMany({
    select: { id: true, name: true, role: true },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json({ logs, total, users, page, limit })
}
