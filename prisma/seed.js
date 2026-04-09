// prisma/seed.js
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  const pw = await bcrypt.hash('password123', 10)

  // Users - selalu update password agar login selalu bisa
  await prisma.user.upsert({ where: { email: 'gudang@inventory.com' },   update: { password: pw, isActive: true }, create: { name: 'Gudang',        email: 'gudang@inventory.com',   password: pw, role: 'GUDANG'   } })
  await prisma.user.upsert({ where: { email: 'finance@inventory.com' },  update: { password: pw, isActive: true }, create: { name: 'Finance',       email: 'finance@inventory.com',  password: pw, role: 'FINANCE'  } })
  await prisma.user.upsert({ where: { email: 'konveksi@inventory.com' }, update: { password: pw, isActive: true }, create: { name: 'Konveksi Maju', email: 'konveksi@inventory.com', password: pw, role: 'KONVEKSI' } })
  await prisma.user.upsert({ where: { email: 'owner@inventory.com' },    update: { password: pw, isActive: true }, create: { name: 'Owner',         email: 'owner@inventory.com',    password: pw, role: 'OWNER'   } })

  // Categories
  const cats = await Promise.all([
    prisma.category.upsert({ where: { name: 'Resletting' }, update: {}, create: { name: 'Resletting' } }),
    prisma.category.upsert({ where: { name: 'Benang' }, update: {}, create: { name: 'Benang' } }),
    prisma.category.upsert({ where: { name: 'Kancing' }, update: {}, create: { name: 'Kancing' } }),
    prisma.category.upsert({ where: { name: 'Label' }, update: {}, create: { name: 'Label' } }),
    prisma.category.upsert({ where: { name: 'Lainnya' }, update: {}, create: { name: 'Lainnya' } }),
  ])

  // Suppliers
  await prisma.supplier.upsert({ where: { id: 'sup-001' }, update: {}, create: { id: 'sup-001', name: 'PT Jaya Aksesoris', phone: '081234567890', address: 'Bandung' } })
  await prisma.supplier.upsert({ where: { id: 'sup-002' }, update: {}, create: { id: 'sup-002', name: 'UD Maju Bersama', phone: '082345678901', address: 'Jakarta' } })

  // Products
  await prisma.product.upsert({ where: { sku: 'RSL-001' }, update: {}, create: { sku: 'RSL-001', name: 'Resletting YKK 20cm Hitam', unit: 'pcs', minStock: 50, currentStock: 200, categoryId: cats[0].id } })
  await prisma.product.upsert({ where: { sku: 'RSL-002' }, update: {}, create: { sku: 'RSL-002', name: 'Resletting YKK 30cm Putih', unit: 'pcs', minStock: 30, currentStock: 80, categoryId: cats[0].id } })
  await prisma.product.upsert({ where: { sku: 'BNG-001' }, update: {}, create: { sku: 'BNG-001', name: 'Benang Jahit Hitam 500m', unit: 'gulung', minStock: 20, currentStock: 15, categoryId: cats[1].id } })
  await prisma.product.upsert({ where: { sku: 'KNC-001' }, update: {}, create: { sku: 'KNC-001', name: 'Kancing Baju Ukuran M', unit: 'pcs', minStock: 100, currentStock: 25, categoryId: cats[2].id } })

  // Wallet balances (saldo awal)
  const wallets = [
    { entityType: 'FINANCE', amount: 50000000, desc: 'Saldo awal Kas Finance' },
    { entityType: 'GUDANG', amount: 0, desc: 'Saldo awal Gudang' },
    { entityType: 'KONVEKSI', amount: 10000000, desc: 'Saldo awal Konveksi' },
  ]

  for (const w of wallets) {
    const count = await prisma.walletLedger.count({ where: { entityType: w.entityType, refType: 'TOPUP' } })
    if (count === 0) {
      await prisma.walletLedger.create({
        data: {
          entityType: w.entityType,
          type: 'KREDIT',
          amount: w.amount,
          balanceAfter: w.amount,
          description: w.desc,
          refType: 'TOPUP',
        },
      })
    }
  }

  console.log('✅ Seed selesai!')
  console.log('')
  console.log('👤 Akun:')
  console.log('   Gudang:   gudang@inventory.com   | password123')
  console.log('   Finance:  finance@inventory.com  | password123')
  console.log('   Konveksi: konveksi@inventory.com | password123')
  console.log('   Owner:    owner@inventory.com    | password123')
}

main().catch(console.error).finally(() => prisma.$disconnect())
