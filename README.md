# Inventory System v2

Sistem manajemen inventori aksesoris + keuangan internal.  
**Stack:** Next.js 14 · PostgreSQL · Prisma · NextAuth · Tailwind

---

## Alur Bisnis

```
① GUDANG buat Purchase Request ke Supplier
         ↓
② FINANCE klik PAY → Kas Finance berkurang, Stok Gudang bertambah
         ↓
③ KONVEKSI login → Ambil Stok (Delivery Request)
   → Stok Gudang langsung berkurang
   → Invoice UNPAID di-generate otomatis
         ↓
④ FINANCE klik PAY invoice
   → Saldo Konveksi berkurang
   → Saldo Gudang bertambah
```

---

## Role & Akses

| Role     | Akses |
|----------|-------|
| GUDANG   | Buat Purchase Request, lihat & kelola produk/stok |
| FINANCE  | Klik PAY purchase, klik PAY invoice Konveksi, lihat saldo & mutasi |
| KONVEKSI | Buat Delivery Request (ambil stok), lihat invoice sendiri |
| OWNER    | Semua akses + top-up saldo + manajemen user + laporan |

---

## Deploy ke EasyPanel

### 1. Push ke GitHub
```bash
git init
git add .
git commit -m "init inventory system v2"
git remote add origin https://github.com/USERNAME/REPO.git
git push -u origin main
```

### 2. Buat PostgreSQL di EasyPanel
1. **+ New Resource** → pilih **PostgreSQL**
2. Nama: `inventory-db`
3. Catat connection string dari tab **Connection**:
   ```
   postgresql://postgres:PASSWORD@inventory-db:5432/inventory
   ```

### 3. Buat App di EasyPanel
1. **+ New Resource** → pilih **App**
2. Source: **GitHub** → pilih repo
3. Build method: **Dockerfile**
4. Port: **3000**

### 4. Set Environment Variables
Di tab **Environment** app:
```
DATABASE_URL=postgresql://postgres:PASSWORD@inventory-db:5432/inventory
NEXTAUTH_SECRET=isi-random-32-karakter-pakai-perintah-di-bawah
NEXTAUTH_URL=https://your-app-url.easypanel.host
```

> Generate NEXTAUTH_SECRET:
> ```bash
> openssl rand -base64 32
> ```

### 5. Inisialisasi Database (jalankan 1x di Console EasyPanel)
```bash
npx prisma db push
node prisma/seed.js
```

### 6. Login
Buka URL app kamu, login dengan:

| Role     | Email                     | Password    |
|----------|---------------------------|-------------|
| Gudang   | gudang@inventory.com      | password123 |
| Finance  | finance@inventory.com     | password123 |
| Konveksi | konveksi@inventory.com    | password123 |
| Owner    | owner@inventory.com       | password123 |

> ⚠️ Ganti semua password setelah login pertama!

---

## Development Lokal

```bash
# 1. Install dependencies
npm install

# 2. Setup env
cp .env.example .env
# Edit .env → isi DATABASE_URL

# 3. Generate Prisma client
npx prisma generate

# 4. Push schema ke database
npx prisma db push

# 5. Seed data awal
node prisma/seed.js

# 6. Jalankan
npm run dev
```

Buka http://localhost:3000

---

## Struktur Folder

```
src/
├── app/
│   ├── api/
│   │   ├── auth/          NextAuth
│   │   ├── products/      CRUD produk + stok
│   │   ├── categories/    Master kategori
│   │   ├── suppliers/     Master supplier
│   │   ├── purchases/     Purchase Request + PAY
│   │   ├── deliveries/    Delivery Request + PAY
│   │   ├── wallet/        Saldo & top-up
│   │   ├── reports/       Laporan
│   │   ├── users/         Manajemen user
│   │   └── dashboard/     Stats dashboard
│   ├── dashboard/
│   │   ├── page.tsx       Dashboard utama
│   │   ├── products/      Produk & stok
│   │   ├── purchases/     Purchase Request
│   │   ├── deliveries/    Delivery / ambil stok
│   │   ├── invoices/      Invoice Konveksi
│   │   ├── wallet/        Saldo & mutasi
│   │   ├── reports/       Laporan
│   │   └── users/         Manajemen user
│   └── login/
├── components/layout/
│   └── Sidebar.tsx
└── lib/
    ├── prisma.ts
    ├── auth.ts
    ├── utils.ts
    └── audit.ts
```

---

## Logika Saldo

| Event | Finance | Gudang | Konveksi |
|-------|---------|--------|----------|
| Finance PAY purchase | −totalAmount | — | — |
| Finance PAY invoice | — | +totalAmount | −totalAmount |
| Top-up (Owner) | +amount | — | — |

Stok:
- Finance PAY purchase → stok **bertambah**
- Konveksi submit delivery → stok **langsung berkurang**

---

## Troubleshooting

**Error: Kas Finance tidak cukup**  
→ Owner perlu top-up Kas Finance dulu di halaman Saldo & Kas

**Error: Saldo Konveksi tidak cukup**  
→ Owner perlu top-up Saldo Konveksi dulu

**Error: Stok tidak cukup**  
→ Gudang perlu buat Purchase Request baru dan Finance harus PAY dulu

**Prisma error di console EasyPanel**  
→ Jalankan `npx prisma generate` lalu `npx prisma db push`
