/**
 * Script untuk membuat user di database
 * Jalankan di VPS dengan perintah:
 *   DATABASE_URL="postgres://inventaksesoris1:inventaksesoris123@localhost:5432/fix-invent-db?sslmode=disable" node create-users.js
 *
 * Atau jika sudah ada .env / .env.local yang benar, cukup:
 *   node create-users.js
 */

const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

// Gunakan DATABASE_URL dari env jika ada, atau fallback ke localhost (untuk dijalankan di VPS host)
const DATABASE_URL = process.env.DATABASE_URL || 
  'postgres://inventaksesoris1:inventaksesoris123@localhost:5432/fix-invent-db?sslmode=disable'

const prisma = new PrismaClient({
  datasources: { db: { url: DATABASE_URL } }
})

async function main() {
  console.log('🔌 Connecting to database...')
  console.log('   URL:', DATABASE_URL.replace(/:[^:@]+@/, ':***@')) // sembunyikan password di log

  const pw = await bcrypt.hash('password123', 10)

  const users = [
    { name: 'Gudang',       email: 'gudang@inventory.com',   role: 'GUDANG'   },
    { name: 'Finance',      email: 'finance@inventory.com',  role: 'FINANCE'  },
    { name: 'Konveksi Maju',email: 'konveksi@inventory.com', role: 'KONVEKSI' },
    { name: 'Owner',        email: 'owner@inventory.com',    role: 'OWNER'    },
  ]

  console.log('\n👤 Membuat user...')

  for (const u of users) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } })

    if (existing) {
      // Update password jika user sudah ada
      await prisma.user.update({
        where: { email: u.email },
        data: { password: pw, isActive: true }
      })
      console.log(`   ✅ Updated: ${u.email}`)
    } else {
      await prisma.user.create({
        data: { name: u.name, email: u.email, password: pw, role: u.role, isActive: true }
      })
      console.log(`   ✅ Created: ${u.email}`)
    }
  }

  console.log('\n🎉 Selesai! Akun yang bisa digunakan:')
  console.log('   ─────────────────────────────────────────')
  console.log('   Email                    | Password')
  console.log('   ─────────────────────────────────────────')
  console.log('   gudang@inventory.com     | password123')
  console.log('   finance@inventory.com    | password123')
  console.log('   konveksi@inventory.com   | password123')
  console.log('   owner@inventory.com      | password123')
  console.log('   ─────────────────────────────────────────')
}

main()
  .catch(e => {
    console.error('\n❌ Error:', e.message)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
