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

  // Step 1: Push database schema - coba beberapa cara
  let schemaPushed = false
  const prismaCmds = [
    'node ./node_modules/prisma/build/index.js db push --accept-data-loss',
    'npx prisma db push --accept-data-loss',
  ]

  for (const cmd of prismaCmds) {
    if (schemaPushed) break
    try {
      logs.push(`🔄 Step 1: Mencoba: ${cmd}...`)
      const pushOutput = execSync(`${cmd} 2>&1`, {
        env: { ...process.env },
        stdio: 'pipe',
        timeout: 120000,
        cwd: process.cwd(),
      }).toString()
      logs.push('✅ Schema berhasil di-push!')
      logs.push('Output: ' + pushOutput.slice(-500))
      schemaPushed = true
    } catch (e: any) {
      const errMsg = e.stdout?.toString() || e.stderr?.toString() || e.message
      logs.push('❌ ' + cmd + ' gagal: ' + errMsg.slice(0, 300))
    }
  }

  // Fallback: buat tabel manual via SQL
  if (!schemaPushed) {
    logs.push('🔄 Fallback: membuat tabel via raw SQL...')
    try {
      const { PrismaClient } = require('@prisma/client')
      const rawPrisma = new PrismaClient()

      // Buat enum types
      const enums = [
        `DO $$ BEGIN CREATE TYPE "Role" AS ENUM ('GUDANG', 'FINANCE', 'KONVEKSI', 'OWNER'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
        `DO $$ BEGIN CREATE TYPE "PurchaseStatus" AS ENUM ('PENDING', 'PAID', 'CANCELLED'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
        `DO $$ BEGIN CREATE TYPE "DeliveryStatus" AS ENUM ('UNPAID', 'PAID', 'CANCELLED'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
        `DO $$ BEGIN CREATE TYPE "WalletEntityType" AS ENUM ('FINANCE', 'GUDANG', 'KONVEKSI'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
        `DO $$ BEGIN CREATE TYPE "WalletType" AS ENUM ('KREDIT', 'DEBIT'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
      ]
      for (const sql of enums) {
        await rawPrisma.$executeRawUnsafe(sql)
      }
      logs.push('✅ Enum types dibuat')

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
      await rawPrisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");`)

      // Buat tabel categories
      await rawPrisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "categories" (
          "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
          "name" TEXT NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
        );
      `)
      await rawPrisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "categories_name_key" ON "categories"("name");`)

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
      await rawPrisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "products_sku_key" ON "products"("sku");`)

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
      await rawPrisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "purchase_requests_invoiceNo_key" ON "purchase_requests"("invoiceNo");`)

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
      await rawPrisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "delivery_requests_invoiceNo_key" ON "delivery_requests"("invoiceNo");`)

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
      logs.push('✅ Semua tabel berhasil dibuat via SQL!')
      schemaPushed = true
    } catch (sqlErr: any) {
      logs.push('❌ SQL fallback gagal: ' + sqlErr.message.slice(0, 300))
    }
  }

  // Step 2: Seed users via raw SQL
  if (schemaPushed) {
    try {
      logs.push('🌱 Step 2: Membuat users...')
      const { PrismaClient } = require('@prisma/client')
      const prisma = new PrismaClient()
      const bcrypt = require('bcryptjs')

      const pw = await bcrypt.hash('password123', 10)
      logs.push('🔑 Password hash: ' + pw.slice(0, 20) + '...')

      const users = [
        { name: 'Gudang', email: 'gudang@inventory.com', role: 'GUDANG' },
        { name: 'Finance', email: 'finance@inventory.com', role: 'FINANCE' },
        { name: 'Konveksi Maju', email: 'konveksi@inventory.com', role: 'KONVEKSI' },
        { name: 'Owner', email: 'owner@inventory.com', role: 'OWNER' },
      ]

      for (const u of users) {
        try {
          await prisma.$executeRawUnsafe(`
            INSERT INTO "users" ("id", "name", "email", "password", "role", "isActive", "createdAt", "updatedAt")
            VALUES (gen_random_uuid()::text, $1, $2, $3, $4::"Role", true, NOW(), NOW())
            ON CONFLICT ("email") DO UPDATE SET "password" = $3, "isActive" = true, "updatedAt" = NOW()
          `, u.name, u.email, pw, u.role)
          logs.push(`✅ ${u.email} created/updated`)
        } catch (userErr: any) {
          logs.push(`❌ ${u.email} gagal: ${userErr.message.slice(0, 100)}`)
        }
      }

      // Verify
      const userCount = await prisma.$queryRawUnsafe(`SELECT email, role, "isActive" FROM "users"`)
      logs.push('📊 Users: ' + JSON.stringify(userCount))
      await prisma.$disconnect()
    } catch (e: any) {
      logs.push('❌ Seed gagal: ' + e.message.slice(0, 300))
    }
  }

  // Step 3: Environment info
  logs.push('📋 Step 3: Environment info')
  logs.push('NEXTAUTH_URL: ' + (process.env.NEXTAUTH_URL || 'NOT SET'))
  logs.push('DATABASE_URL: ' + (process.env.DATABASE_URL ? 'SET (' + process.env.DATABASE_URL.split('@')[1]?.split('/')[0] + ')' : 'NOT SET'))
  logs.push('NODE_ENV: ' + (process.env.NODE_ENV || 'NOT SET'))
  logs.push('CWD: ' + process.cwd())
  logs.push('Request URL: ' + request.url)

  // Cek NEXTAUTH_URL
  const requestUrl = new URL(request.url)
  const nextauthUrl = (process.env.NEXTAUTH_URL || '').replace(/\/$/, '')
  logs.push(`ℹ️ Internal request origin: ${requestUrl.origin}`)
  logs.push(`ℹ️ NEXTAUTH_URL: ${nextauthUrl}`)
  if (nextauthUrl) {
    logs.push('✅ NEXTAUTH_URL is set (internal origin mismatch is normal in Docker)')
  } else {
    logs.push('🔴 NEXTAUTH_URL belum di-set!')
  }

  return NextResponse.json({ logs }, { status: 200 })
}
