import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { WalletEntityType } from '@prisma/client'

async function getBalance(entityType: WalletEntityType) {
  const last = await prisma.walletLedger.findFirst({ where: { entityType }, orderBy: { createdAt: 'desc' } })
  return last?.balanceAfter ?? 0
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['FINANCE', 'OWNER'].includes((session.user as any).role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const entityType = searchParams.get('entity') as WalletEntityType | null

  const [financeBalance, gudangBalance, konveksiBalance] = await Promise.all([
    getBalance('FINANCE'), getBalance('GUDANG'), getBalance('KONVEKSI'),
  ])

  const ledger = await prisma.walletLedger.findMany({
    where: entityType ? { entityType } : {},
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: { topupBy: { select: { name: true } } },
  })

  return NextResponse.json({ balances: { finance: financeBalance, gudang: gudangBalance, konveksi: konveksiBalance }, ledger })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['FINANCE', 'OWNER'].includes((session.user as any).role)) return NextResponse.json({ error: 'Hanya Owner/Finance yang bisa top-up' }, { status: 403 })

  const { entityType, amount, description } = await req.json()
  if (!entityType || !amount || amount <= 0) return NextResponse.json({ error: 'Data tidak valid' }, { status: 400 })

  const currentBalance = await getBalance(entityType)
  const entry = await prisma.walletLedger.create({
    data: {
      entityType, type: 'KREDIT',
      amount: Number(amount),
      balanceAfter: currentBalance + Number(amount),
      description: description || `Top-up saldo ${entityType}`,
      refType: 'TOPUP',
      topupById: (session.user as any).id,
    },
  })
  return NextResponse.json(entry, { status: 201 })
}
