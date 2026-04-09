import { NextResponse } from 'next/server'
import { execSync } from 'child_process'

// TEMPORARY setup+debug endpoint - HAPUS setelah selesai!
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')

  if (secret !== 'debug-2024') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const logs: string[] = []

  // Step 1: Push database schema
  try {
    logs.push('🔄 Step 1: Menjalankan prisma db push...')
    const pushOutput = execSync('npx prisma db push --skip-generate --accept-data-loss 2>&1', {
      env: { ...process.env },
      stdio: 'pipe',
      timeout: 120000,
      cwd: process.cwd(),
    }).toString()
    logs.push('✅ Schema berhasil di-push!')
    logs.push('Output: ' + pushOutput.slice(-500))
  } catch (e: any) {
    const errMsg = e.stdout?.toString() || e.stderr?.toString() || e.message
    logs.push('❌ prisma db push gagal: ' + errMsg.slice(0, 500))
    
    // Coba cari prisma di lokasi lain
    try {
      logs.push('🔄 Mencoba alternatif: ./node_modules/.bin/prisma...')
      const pushOutput2 = execSync('./node_modules/.bin/prisma db push --skip-generate --accept-data-loss 2>&1', {
        env: { ...process.env },
        stdio: 'pipe',
        timeout: 120000,
      }).toString()
      logs.push('✅ Schema berhasil di-push (alternatif)!')
      logs.push('Output: ' + pushOutput2.slice(-500))
    } catch (e2: any) {
      const errMsg2 = e2.stdout?.toString() || e2.stderr?.toString() || e2.message
      logs.push('❌ Alternatif juga gagal: ' + errMsg2.slice(0, 500))
    }
  }

  // Step 2: Run seed
  try {
    logs.push('🌱 Step 2: Menjalankan seed...')
    const seedOutput = execSync('node prisma/seed.js 2>&1', {
      env: { ...process.env },
      stdio: 'pipe',
      timeout: 60000,
      cwd: process.cwd(),
    }).toString()
    logs.push('✅ Seed berhasil!')
    logs.push('Seed output: ' + seedOutput.slice(-500))
  } catch (e: any) {
    const errMsg = e.stdout?.toString() || e.stderr?.toString() || e.message
    logs.push('❌ Seed gagal: ' + errMsg.slice(0, 500))
  }

  // Step 3: Verify - coba query user langsung
  try {
    logs.push('🔍 Step 3: Verifikasi user...')
    // Dynamic import to get fresh connection after schema push
    const { PrismaClient } = require('@prisma/client')
    const prisma = new PrismaClient()
    
    const users = await prisma.user.findMany({
      select: { email: true, role: true, isActive: true }
    })
    logs.push(`✅ Ditemukan ${users.length} user di database`)
    logs.push('Users: ' + JSON.stringify(users))
    
    await prisma.$disconnect()
  } catch (e: any) {
    logs.push('❌ Verifikasi gagal: ' + e.message.slice(0, 300))
  }

  // Step 4: Environment info
  logs.push('📋 Step 4: Environment info')
  logs.push('NEXTAUTH_URL: ' + (process.env.NEXTAUTH_URL || 'NOT SET'))
  logs.push('DATABASE_URL: ' + (process.env.DATABASE_URL ? 'SET (' + process.env.DATABASE_URL.split('@')[1]?.split('/')[0] + ')' : 'NOT SET'))
  logs.push('NODE_ENV: ' + (process.env.NODE_ENV || 'NOT SET'))
  logs.push('CWD: ' + process.cwd())
  logs.push('Request URL: ' + request.url)

  // Cek apakah NEXTAUTH_URL cocok dengan domain request
  const requestHost = new URL(request.url).origin
  const nextauthUrl = process.env.NEXTAUTH_URL || ''
  if (requestHost !== nextauthUrl) {
    logs.push(`⚠️ MISMATCH! Request origin: ${requestHost} vs NEXTAUTH_URL: ${nextauthUrl}`)
    logs.push('🔴 INI BISA MENYEBABKAN LOGIN GAGAL! NEXTAUTH_URL harus sama dengan domain yang diakses.')
  } else {
    logs.push('✅ NEXTAUTH_URL cocok dengan request origin')
  }

  return NextResponse.json({ logs }, { status: 200 })
}
