import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { audit } from '@/lib/audit'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = (session.user as any).role
  const userId = (session.user as any).id
  if (!['FINANCE', 'OWNER'].includes(role)) return NextResponse.json({ error: 'Hanya Finance/Owner yang bisa PAY' }, { status: 403 })

  const delivery = await prisma.deliveryRequest.findUnique({ where: { id: params.id } })
  if (!delivery) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 })
  if (delivery.status !== 'UNPAID') return NextResponse.json({ error: 'Invoice sudah diproses' }, { status: 400 })

  // Get current balances
  const lastKonveksi = await prisma.walletLedger.findFirst({ where: { entityType: 'KONVEKSI' }, orderBy: { createdAt: 'desc' } })
  const lastGudang = await prisma.walletLedger.findFirst({ where: { entityType: 'GUDANG' }, orderBy: { createdAt: 'desc' } })
  const konveksiBalance = lastKonveksi?.balanceAfter ?? 0
  const gudangBalance = lastGudang?.balanceAfter ?? 0

  if (konveksiBalance < delivery.totalAmount) {
    return NextResponse.json({ error: `Saldo Konveksi tidak cukup. Saldo: ${konveksiBalance.toLocaleString('id-ID')}` }, { status: 400 })
  }

  await prisma.$transaction(async (tx) => {
    // Mark delivery as PAID
    await tx.deliveryRequest.update({
      where: { id: params.id },
      data: { status: 'PAID', paidAt: new Date() },
    })

    // Deduct Konveksi balance
    await tx.walletLedger.create({
      data: {
        entityType: 'KONVEKSI', type: 'DEBIT',
        amount: delivery.totalAmount,
        balanceAfter: konveksiBalance - delivery.totalAmount,
        description: `Pembayaran invoice ${delivery.invoiceNo} ke Gudang`,
        refType: 'DELIVERY', refId: delivery.id,
        topupById: userId,
      },
    })

    // Increase Gudang balance
    await tx.walletLedger.create({
      data: {
        entityType: 'GUDANG', type: 'KREDIT',
        amount: delivery.totalAmount,
        balanceAfter: gudangBalance + delivery.totalAmount,
        description: `Penerimaan dari Konveksi - ${delivery.invoiceNo}`,
        refType: 'DELIVERY', refId: delivery.id,
        topupById: userId,
      },
    })
  })

  await audit(userId, 'PAY_DELIVERY', 'DeliveryRequest', delivery.id)
  return NextResponse.json({ success: true })
}
