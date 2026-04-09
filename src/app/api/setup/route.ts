import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { execSync } from 'child_process'

// Endpoint sementara untuk setup database + user pertama kali
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')

  if (secret !== 'setup-zaneva-2024') {
    return NextResponse.json({ error: 'Unauthorized. Sertakan ?secret=setup-zaneva-2024' }, { status: 401 })
  }

  const logs: string[] = []

  // Step 1: Push database schema (buat tabel jika belum ada)
  try {
    logs.push('🔄 Menjalankan prisma db push...')
    const output = execSync('npx prisma db push --skip-generate --accept-data-loss', {
      env: { ...process.env },
      stdio: 'pipe',
      timeout: 60000,
    }).toString()
    logs.push('✅ Schema database berhasil dibuat!')
    logs.push(output.slice(-200)) // log bagian akhir output
  } catch (e: any) {
    const errMsg = e.stderr?.toString() || e.message
    logs.push('⚠️ prisma db push error: ' + errMsg.slice(0, 300))
    // Lanjutkan meski gagal, mungkin tabel sudah ada
  }

  // Step 2: Buat / update semua user
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
        await prisma.user.update({ where: { email: u.email }, data: { password: pw, isActive: true } })
        results.push({ email: u.email, status: 'updated' })
      } else {
        await prisma.user.create({ data: { name: u.name, email: u.email, password: pw, role: u.role, isActive: true } })
        results.push({ email: u.email, status: 'created' })
      }
    }

    logs.push('✅ User berhasil dibuat/diupdate!')

    return NextResponse.json({
      success: true,
      message: 'Setup selesai! Silakan login.',
      logs,
      users: results,
      credentials: { password: 'password123' }
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, logs, error: error.message }, { status: 500 })
  }
}
