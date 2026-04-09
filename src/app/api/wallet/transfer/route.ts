import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { audit } from '@/lib/audit'
import { WalletEntityType } from '@prisma/client'

async function getBalance(entityType: WalletEntityType) {
  const last = await prisma.walletLedger.findFirst({
    where: { entityType },
    orderBy: { createdAt: 'desc' },
  })
  return last?.balanceAfter ?? 0
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = (session.user as any).role
  const userId = (session.user as any).id

  if (!['FINANCE', 'OWNER'].includes(role)) {
    return NextResponse.json({ error: 'Hanya Finance/Owner yang bisa transfer saldo' }, { status: 403 })
  }

  const { fromEntity, toEntity, amount, description } = await req.json()

  if (!fromEntity || !toEntity || !amount || amount <= 0) {
    return NextResponse.json({ error: 'Data tidak valid' }, { status: 400 })
  }

  if (fromEntity === toEntity) {
    return NextResponse.json({ error: 'Entitas asal dan tujuan tidak boleh sama' }, { status: 400 })
  }

  const validEntities = ['FINANCE', 'GUDANG', 'KONVEKSI']
  if (!validEntities.includes(fromEntity) || !validEntities.includes(toEntity)) {
    return NextResponse.json({ error: 'Entitas tidak valid' }, { status: 400 })
  }

  const fromBalance = await getBalance(fromEntity)
  const toBalance = await getBalance(toEntity)
  const transferAmount = Number(amount)

  if (fromBalance < transferAmount) {
    return NextResponse.json({
      error: `Saldo ${fromEntity} tidak cukup. Saldo saat ini: ${fromBalance.toLocaleString('id-ID')}`
    }, { status: 400 })
  }

  const LABELS: Record<string, string> = {
    FINANCE: 'Kas Finance',
    GUDANG: 'Saldo Gudang',
    KONVEKSI: 'Saldo Konveksi',
  }

  await prisma.$transaction(async (tx) => {
    // Debit from source
    await tx.walletLedger.create({
      data: {
        entityType: fromEntity,
        type: 'DEBIT',
        amount: transferAmount,
        balanceAfter: fromBalance - transferAmount,
        description: description || `Transfer ke ${LABELS[toEntity]}`,
        refType: 'TRANSFER',
        topupById: userId,
      },
    })

    // Kredit to destination
    await tx.walletLedger.create({
      data: {
        entityType: toEntity,
        type: 'KREDIT',
        amount: transferAmount,
        balanceAfter: toBalance + transferAmount,
        description: description || `Transfer dari ${LABELS[fromEntity]}`,
        refType: 'TRANSFER',
        topupById: userId,
      },
    })
  })

  await audit(userId, 'TRANSFER_SALDO', 'WalletLedger', undefined, {
    from: fromEntity, to: toEntity, amount: transferAmount,
  })

  return NextResponse.json({ success: true })
}
