import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { execSync } from 'child_process'

// Endpoint sementara untuk setup database + user pertama kali
// HAPUS endpoint ini setelah setup selesai!
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')

  if (secret !== 'setup-zaneva-2024') {
    return NextResponse.json({ error: 'Unauthorized. Sertakan ?secret=setup-zaneva-2024' }, { status: 401 })
  }

  const logs: string[] = []

  // Step 1: Push database schema - coba beberapa cara
  let schemaPushed = false
  const prismaPaths = [
    'npx prisma',
    './node_modules/.bin/prisma',
    './node_modules/prisma/build/index.js',
    'node ./node_modules/prisma/build/index.js',
    'node_modules/.bin/prisma',
  ]

  for (const prismaCmd of prismaPaths) {
    if (schemaPushed) break
    try {
      logs.push(`🔄 Mencoba: ${prismaCmd} db push...`)
      const output = execSync(`${prismaCmd} db push --skip-generate --accept-data-loss 2>&1`, {
        env: { ...process.env },
        stdio: 'pipe',
        timeout: 120000,
        cwd: process.cwd(),
      }).toString()
      logs.push('✅ Schema database berhasil di-push!')
      logs.push('Output: ' + output.slice(-300))
      schemaPushed = true
    } catch (e: any) {
      const errMsg = e.stdout?.toString() || e.stderr?.toString() || e.message
      logs.push(`❌ ${prismaCmd} gagal: ` + errMsg.slice(0, 200))
    }
  }

  if (!schemaPushed) {
    // Jika semua cara gagal, coba buat tabel secara manual via raw SQL
    logs.push('🔄 Mencoba membuat tabel secara manual via SQL...')
    try {
      const { PrismaClient } = require('@prisma/client')
      const rawPrisma = new PrismaClient()
      
      // Buat enum types
      await rawPrisma.$executeRawUnsafe(`
        DO $$ BEGIN
          CREATE TYPE "Role" AS ENUM ('GUDANG', 'FINANCE', 'KONVEKSI', 'OWNER');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;
      `)
      await rawPrisma.$executeRawUnsafe(`
        DO $$ BEGIN
          CREATE TYPE "PurchaseStatus" AS ENUM ('PENDING', 'PAID', 'CANCELLED');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;
      `)
      await rawPrisma.$executeRawUnsafe(`
        DO $$ BEGIN
          CREATE TYPE "DeliveryStatus" AS ENUM ('UNPAID', 'PAID', 'CANCELLED');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;
      `)
      await rawPrisma.$executeRawUnsafe(`
        DO $$ BEGIN
          CREATE TYPE "WalletEntityType" AS ENUM ('FINANCE', 'GUDANG', 'KONVEKSI');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;
      `)
      await rawPrisma.$executeRawUnsafe(`
        DO $$ BEGIN
          CREATE TYPE "WalletType" AS ENUM ('KREDIT', 'DEBIT');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;
      `)
      
      // Buat tabel users
      await rawPrisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "users" (
          "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
          "name" TEXT NOT NULL,
          "email" TEXT NOT NULL,
          "password" TEXT NOT NULL,
          "role" "Role" NOT NULL,
          "isActive" BOOLEAN NOT NULL DEFAULT true,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "users_pkey" PRIMARY KEY ("id")
        );
      `)
      await rawPrisma.$executeRawUnsafe(`
        CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");
      `)
      
      // Buat tabel categories
      await rawPrisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "categories" (
          "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
          "name" TEXT NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
        );
      `)
      await rawPrisma.$executeRawUnsafe(`
        CREATE UNIQUE INDEX IF NOT EXISTS "categories_name_key" ON "categories"("name");
      `)
      
      // Buat tabel suppliers
      await rawPrisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "suppliers" (
          "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
          "name" TEXT NOT NULL,
          "phone" TEXT,
          "address" TEXT,
          "notes" TEXT,
          "isActive" BOOLEAN NOT NULL DEFAULT true,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
        );
      `)
      
      // Buat tabel products
      await rawPrisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "products" (
          "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
          "sku" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "description" TEXT,
          "unit" TEXT NOT NULL DEFAULT 'pcs',
          "minStock" INTEGER NOT NULL DEFAULT 10,
          "currentStock" INTEGER NOT NULL DEFAULT 0,
          "isActive" BOOLEAN NOT NULL DEFAULT true,
          "categoryId" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "products_pkey" PRIMARY KEY ("id"),
          CONSTRAINT "products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE
        );
      `)
      await rawPrisma.$executeRawUnsafe(`
        CREATE UNIQUE INDEX IF NOT EXISTS "products_sku_key" ON "products"("sku");
      `)
      
      // Buat tabel purchase_requests
      await rawPrisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "purchase_requests" (
          "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
          "invoiceNo" TEXT NOT NULL,
          "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "supplierId" TEXT NOT NULL,
          "createdById" TEXT NOT NULL,
          "status" "PurchaseStatus" NOT NULL DEFAULT 'PENDING',
          "notes" TEXT,
          "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
          "paidAt" TIMESTAMP(3),
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "purchase_requests_pkey" PRIMARY KEY ("id"),
          CONSTRAINT "purchase_requests_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
          CONSTRAINT "purchase_requests_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
        );
      `)
      await rawPrisma.$executeRawUnsafe(`
        CREATE UNIQUE INDEX IF NOT EXISTS "purchase_requests_invoiceNo_key" ON "purchase_requests"("invoiceNo");
      `)
      
      // Buat tabel purchase_items
      await rawPrisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "purchase_items" (
          "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
          "purchaseId" TEXT NOT NULL,
          "productId" TEXT NOT NULL,
          "qty" INTEGER NOT NULL,
          "unit" TEXT NOT NULL,
          "pricePerUnit" DOUBLE PRECISION NOT NULL,
          "totalPrice" DOUBLE PRECISION NOT NULL,
          CONSTRAINT "purchase_items_pkey" PRIMARY KEY ("id"),
          CONSTRAINT "purchase_items_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "purchase_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT "purchase_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE
        );
      `)
      
      // Buat tabel delivery_requests
      await rawPrisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "delivery_requests" (
          "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
          "invoiceNo" TEXT NOT NULL,
          "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "createdById" TEXT NOT NULL,
          "status" "DeliveryStatus" NOT NULL DEFAULT 'UNPAID',
          "notes" TEXT,
          "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
          "paidAt" TIMESTAMP(3),
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "delivery_requests_pkey" PRIMARY KEY ("id"),
          CONSTRAINT "delivery_requests_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
        );
      `)
      await rawPrisma.$executeRawUnsafe(`
        CREATE UNIQUE INDEX IF NOT EXISTS "delivery_requests_invoiceNo_key" ON "delivery_requests"("invoiceNo");
      `)
      
      // Buat tabel delivery_items
      await rawPrisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "delivery_items" (
          "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
          "deliveryId" TEXT NOT NULL,
          "productId" TEXT NOT NULL,
          "qty" INTEGER NOT NULL,
          "unit" TEXT NOT NULL,
          "pricePerUnit" DOUBLE PRECISION NOT NULL,
          "totalPrice" DOUBLE PRECISION NOT NULL,
          CONSTRAINT "delivery_items_pkey" PRIMARY KEY ("id"),
          CONSTRAINT "delivery_items_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "delivery_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT "delivery_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE
        );
      `)
      
      // Buat tabel wallet_ledger
      await rawPrisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "wallet_ledger" (
          "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
          "entityType" "WalletEntityType" NOT NULL,
          "type" "WalletType" NOT NULL,
          "amount" DOUBLE PRECISION NOT NULL,
          "balanceAfter" DOUBLE PRECISION NOT NULL,
          "description" TEXT NOT NULL,
          "refType" TEXT,
          "refId" TEXT,
          "topupById" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "wallet_ledger_pkey" PRIMARY KEY ("id"),
          CONSTRAINT "wallet_ledger_topupById_fkey" FOREIGN KEY ("topupById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
        );
      `)
      
      // Buat tabel stock_history
      await rawPrisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "stock_history" (
          "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
          "productId" TEXT NOT NULL,
          "type" TEXT NOT NULL,
          "qty" INTEGER NOT NULL,
          "stockAfter" INTEGER NOT NULL,
          "refType" TEXT,
          "refId" TEXT,
          "notes" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "stock_history_pkey" PRIMARY KEY ("id"),
          CONSTRAINT "stock_history_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE
        );
      `)
      
      // Buat tabel audit_logs
      await rawPrisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "audit_logs" (
          "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
          "userId" TEXT NOT NULL,
          "action" TEXT NOT NULL,
          "entity" TEXT NOT NULL,
          "entityId" TEXT,
          "detail" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id"),
          CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
        );
      `)
      
      await rawPrisma.$disconnect()
      logs.push('✅ Tabel berhasil dibuat secara manual via SQL!')
      schemaPushed = true
    } catch (sqlErr: any) {
      logs.push('❌ Manual SQL juga gagal: ' + sqlErr.message.slice(0, 300))
    }
  }

  // Step 2: Buat / update semua user
  try {
    const { PrismaClient } = require('@prisma/client')
    const freshPrisma = new PrismaClient()
    
    const pw = await bcrypt.hash('password123', 10)
    logs.push('🔑 Password hash generated: ' + pw.slice(0, 20) + '...')

    const users = [
      { name: 'Gudang',        email: 'gudang@inventory.com',   role: 'GUDANG'   },
      { name: 'Finance',       email: 'finance@inventory.com',  role: 'FINANCE'  },
      { name: 'Konveksi Maju', email: 'konveksi@inventory.com', role: 'KONVEKSI' },
      { name: 'Owner',         email: 'owner@inventory.com',    role: 'OWNER'    },
    ]

    const results = []
    for (const u of users) {
      try {
        // Coba insert langsung via raw SQL untuk menghindari masalah enum
        await freshPrisma.$executeRawUnsafe(`
          INSERT INTO "users" ("id", "name", "email", "password", "role", "isActive", "createdAt", "updatedAt")
          VALUES (gen_random_uuid()::text, $1, $2, $3, $4::"Role", true, NOW(), NOW())
          ON CONFLICT ("email") DO UPDATE SET "password" = $3, "isActive" = true, "updatedAt" = NOW()
        `, u.name, u.email, pw, u.role)
        results.push({ email: u.email, status: 'created/updated' })
      } catch (userErr: any) {
        logs.push(`⚠️ Error untuk ${u.email}: ${userErr.message.slice(0, 100)}`)
        results.push({ email: u.email, status: 'error', error: userErr.message.slice(0, 100) })
      }
    }

    // Verifikasi user ada
    try {
      const userCount = await freshPrisma.$queryRawUnsafe(`SELECT email, role, "isActive" FROM "users"`)
      logs.push('📊 Users di database: ' + JSON.stringify(userCount))
    } catch (e: any) {
      logs.push('⚠️ Gagal query users: ' + e.message.slice(0, 100))
    }

    await freshPrisma.$disconnect()
    
    logs.push('✅ User berhasil dibuat/diupdate!')

    // Environment info
    logs.push('📋 Environment info:')
    logs.push('NEXTAUTH_URL: ' + (process.env.NEXTAUTH_URL || 'NOT SET'))
    logs.push('DATABASE_URL: SET (' + (process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] || 'unknown') + ')')
    logs.push('NODE_ENV: ' + (process.env.NODE_ENV || 'NOT SET'))
    
    const requestHost = new URL(request.url).origin
    const nextauthUrl = (process.env.NEXTAUTH_URL || '').replace(/\/$/, '')
    if (requestHost !== nextauthUrl) {
      logs.push(`⚠️ MISMATCH! Request origin: ${requestHost} vs NEXTAUTH_URL: ${nextauthUrl}`)
      logs.push('🔴 PERBAIKI NEXTAUTH_URL di EasyPanel agar sama dengan domain yang diakses!')
    }

    return NextResponse.json({
      success: true,
      message: 'Setup selesai! Silakan login dengan password123',
      logs,
      users: results,
      credentials: {
        password: 'password123',
        accounts: [
          'gudang@inventory.com',
          'finance@inventory.com',
          'konveksi@inventory.com',
          'owner@inventory.com',
        ]
      }
    })
  } catch (error: any) {
    logs.push('🔥 Error: ' + error.message)
    return NextResponse.json({ success: false, logs, error: error.message }, { status: 500 })
  }
}
