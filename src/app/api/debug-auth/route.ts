import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

// TEMPORARY debug endpoint - HAPUS setelah selesai!
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
        return {
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          passwordHashPrefix: user.password.substring(0, 20) + '...',
          passwordLength: user.password.length,
          passwordMatchesPassword123: match,
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
      env: {
        NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'NOT SET',
        DATABASE_URL: process.env.DATABASE_URL ? '***set***' : '***NOT SET***',
        NEXTAUTH_SECRET_LENGTH: process.env.NEXTAUTH_SECRET?.length || 0,
        NODE_ENV: process.env.NODE_ENV,
      }
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 })
  }
}

// POST endpoint: Reset password langsung
export async function POST(request: Request) {
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')

  if (secret !== 'debug-2024') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const pw = await bcrypt.hash('password123', 10)
    
    // Langsung update semua password
    const emails = ['gudang@inventory.com', 'finance@inventory.com', 'konveksi@inventory.com', 'owner@inventory.com']
    const results = []
    
    for (const email of emails) {
      try {
        const user = await prisma.user.upsert({
          where: { email },
          update: { password: pw, isActive: true },
          create: { 
            name: email.split('@')[0], 
            email, 
            password: pw, 
            role: email.split('@')[0].toUpperCase() === 'KONVEKSI' ? 'KONVEKSI' : email.split('@')[0].toUpperCase() as any,
            isActive: true 
          }
        })
        
        // Verify immediately
        const verify = await bcrypt.compare('password123', user.password)
        results.push({ email, status: 'updated', passwordVerified: verify, hash: user.password.substring(0, 20) })
      } catch (e: any) {
        results.push({ email, status: 'error', error: e.message })
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Password reset selesai. Silakan coba login lagi.',
      results,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
