import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

// TEMPORARY debug endpoint - hapus setelah selesai!
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')

  if (secret !== 'debug-2024') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // 1. Cek semua user di database
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, isActive: true, password: true }
    })

    // 2. Test password comparison untuk setiap user
    const results = await Promise.all(
      users.map(async (user) => {
        const match = await bcrypt.compare('password123', user.password)
        // Buat hash baru untuk perbandingan
        const newHash = await bcrypt.hash('password123', 10)
        return {
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          passwordHashPrefix: user.password.substring(0, 20) + '...',
          passwordLength: user.password.length,
          passwordMatchesPassword123: match,
          newHashSample: newHash.substring(0, 20) + '...',
        }
      })
    )

    // 3. Test bcrypt secara langsung
    const testHash = await bcrypt.hash('password123', 10)
    const testCompare = await bcrypt.compare('password123', testHash)

    return NextResponse.json({
      totalUsers: users.length,
      users: results,
      bcryptSelfTest: {
        hash: testHash,
        compareResult: testCompare,
      },
      nodeVersion: process.version,
      env: {
        NEXTAUTH_URL: process.env.NEXTAUTH_URL,
        DATABASE_URL: process.env.DATABASE_URL ? '***set***' : '***NOT SET***',
        NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? '***set(' + process.env.NEXTAUTH_SECRET.length + ' chars)***' : '***NOT SET***',
      }
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 })
  }
}
