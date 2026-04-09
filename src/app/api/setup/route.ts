import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

// Endpoint sementara untuk setup user pertama kali
// Setelah digunakan, hapus file ini atau blokir akses
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')

  // Kunci keamanan sederhana agar tidak sembarang orang bisa akses
  if (secret !== 'setup-zaneva-2024') {
    return NextResponse.json({ error: 'Unauthorized. Sertakan ?secret=setup-zaneva-2024' }, { status: 401 })
  }

  try {
    const pw = await bcrypt.hash('password123', 10)

    const users = [
      { name: 'Gudang',        email: 'gudang@inventory.com',   role: 'GUDANG'   as const },
      { name: 'Finance',       email: 'finance@inventory.com',  role: 'FINANCE'  as const },
      { name: 'Konveksi Maju', email: 'konveksi@inventory.com', role: 'KONVEKSI' as const },
      { name: 'Owner',         email: 'owner@inventory.com',    role: 'OWNER'    as const },
    ]

    const results = []

    for (const u of users) {
      const existing = await prisma.user.findUnique({ where: { email: u.email } })

      if (existing) {
        await prisma.user.update({
          where: { email: u.email },
          data: { password: pw, isActive: true }
        })
        results.push({ email: u.email, status: 'updated' })
      } else {
        await prisma.user.create({
          data: { name: u.name, email: u.email, password: pw, role: u.role, isActive: true }
        })
        results.push({ email: u.email, status: 'created' })
      }
    }

    return NextResponse.json({
      success: true,
      message: 'User berhasil dibuat! Silakan login.',
      users: results,
      credentials: {
        password: 'password123',
        accounts: [
          'owner@inventory.com',
          'gudang@inventory.com',
          'finance@inventory.com',
          'konveksi@inventory.com',
        ]
      }
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
