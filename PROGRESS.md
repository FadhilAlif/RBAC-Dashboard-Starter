# Migration Progress Tracker: RBAC Starter Template

Proyek ini sedang dalam proses perombakan tech stack dari template starter awal menjadi arsitektur modern berbasis:
- **Backend**: NestJS
- **ORM & Database**: Drizzle ORM + PostgreSQL / NeonDB
- **Auth**: Dual JWT httpOnly cookies, Token Rotation, Stateless RBAC (dipertahankan)
- **Email**: Resend SDK (https://resend.com) + Local Simulation Mode
- **Frontend & UI**: Next.js 16 + React 19 + Shadcn UI

---

## Ringkasan Progres

| Fase | Deskripsi | Status | Tanggal Selesai |
| :--- | :--- | :---: | :---: |
| **Fase 1** | Skema Database & Drizzle ORM (PostgreSQL / NeonDB) | ✅ Selesai | 2026-10-12 |
| **Fase 2** | Transformasi Backend ke NestJS (Modular Architecture) | ✅ Selesai | 2026-10-12 |
| **Fase 3** | Refactor Frontend UI ke Shadcn UI (Tailwind v4) | ✅ Selesai | 2026-10-12 |
| **Fase 4** | Penyesuaian Monorepo, CLI Scaffolder & Dokumentasi | ✅ Selesai | 2026-10-12 |
| **Fase 5** | Pengujian Mutu (Testing & End-to-End Verification) | ✅ Selesai | 2026-10-12 |

---

## Rincian Checklist Implementasi

### ✅ Fase 1: Skema Database & Drizzle ORM (PostgreSQL / NeonDB)
- [x] Inisialisasi dependensi Drizzle ORM (`drizzle-orm`, `drizzle-kit`, `postgres`, `@neondatabase/serverless`) di `backend/`
- [x] Konfigurasi `drizzle.config.ts` untuk migrasi PostgreSQL & NeonDB
- [x] Pembuatan skema tabel type-safe di `backend/src/database/schema/`:
  - [x] `users.ts`
  - [x] `roles.ts`
  - [x] `permissions.ts`
  - [x] `user-roles.ts` (junction table)
  - [x] `role-permissions.ts` (junction table)
  - [x] `refresh-tokens.ts` (token hash & rotation)
  - [x] `email-verification-tokens.ts` & `password-reset-tokens.ts`
  - [x] `audit-logs.ts` (JSONB details)
  - [x] `notifications.ts`, `notification-roles.ts`, `notification-reads.ts`
  - [x] `relations.ts` (Drizzle relational mappings)
  - [x] Barrel export `index.ts`
- [x] Konfigurasi database connection provider (`src/database/connection.ts` mendukung URL NeonDB & parameter Postgres lokal)
- [x] Generate skema migrasi awal menggunakan `drizzle-kit generate` (`0000_broad_blackheart.sql`)
- [x] Pembuatan script migrator `src/database/migrate.ts`
- [x] Pembuatan script seeder Drizzle (`seed.ts`: 14 permissions + 2 roles default idempotent upsert)
- [x] Pembuatan script admin creator Drizzle (`create-admin.ts` transaksi atomik Drizzle)
- [x] Verifikasi skema, relasi, dan loading type-safety via ESM

### ✅ Fase 2: Transformasi Backend ke NestJS
- [x] Setup dependensi core NestJS & tsconfig (`experimentalDecorators`, `emitDecoratorMetadata`)
- [x] Implementasi `DatabaseModule` dengan dynamic Drizzle provider (`DRIZZLE_DB`) dan graceful shutdown
- [x] Setup `ConfigModule` dengan Zod environment schema validation
- [x] Implementasi Global Response Interceptor (`TransformInterceptor` standard `ApiResponse<T>`)
- [x] Implementasi Centralized Exception Filter (`AllExceptionsFilter` mapped error codes)
- [x] Implementasi `AuthModule` (JWT Strategy, Guards, Cookie Handler, Token Rotation, MailService)
- [x] Implementasi RBAC Decorators & Guards (`@RequirePermissions()`, `PermissionsGuard`, `@CurrentUser()`, `@Public()`)
- [x] Implementasi Domain Modules:
  - [x] `UsersModule` (CRUD, soft delete, assign roles, export Excel)
  - [x] `RolesModule` (CRUD, permissions sync, export Excel)
  - [x] `PermissionsModule` (CRUD permissions, export Excel)
  - [x] `AuditLogsModule` & `AuditLogsService`
  - [x] `DashboardModule` (Stats, role distribution, export Excel)
  - [x] `NotificationsModule` (Broadcast & SSE stream `/api/notifications/stream`)
- [x] Setup Swagger OpenAPI documentation di `/api/docs` via `SwaggerModule`
- [x] Unit & integration tests dengan Vitest (19 passing tests)

### ✅ Fase 3: Refactor Frontend UI ke Shadcn UI
- [x] Inisialisasi konfigurasi Shadcn UI (`components.json`) untuk Next.js 16 + Tailwind v4
- [x] Setup helper `cn` di `src/shared/lib/utils.ts`
- [x] Integrasi komponen Shadcn UI di `src/shared/components/ui/`:
  - [x] Button (`cva`, Radix Slot `asChild`, `isLoading`, `fullWidth`)
  - [x] Input (`cva`, error state, icon left/right, height presets)
  - [x] Label (`@radix-ui/react-label`)
  - [x] Checkbox (`@radix-ui/react-checkbox` dengan status checked, onChange, onCheckedChange)
  - [x] Select (`@radix-ui/react-select` primitives + searchable select support)
  - [x] DropdownMenu (`@radix-ui/react-dropdown-menu` primitives)
  - [x] Dialog (`@radix-ui/react-dialog` overlay, content, header, title, close)
  - [x] Modal (adapter modern berbasis Radix Dialog dengan backwards compatibility)
  - [x] Table (primitives `Table`, `TableHeader`, `TableHead`, `TableBody`, `TableRow`, `TableCell` + `TableShell`, `TableLoadingRow`, `TableEmptyRow`)
  - [x] Badge (`cva` variants + status dot support)
  - [x] Alert (`cva` variants + `AlertTitle`, `AlertDescription`, message support)
  - [x] Card (`Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`)
  - [x] Avatar (`@radix-ui/react-avatar` + initials and dynamic hue fallback)
  - [x] Separator (`@radix-ui/react-separator`)
  - [x] Tabs (`@radix-ui/react-tabs`)
  - [x] Tooltip (`@radix-ui/react-tooltip`)
  - [x] AlertDialog (`@radix-ui/react-alert-dialog`)
  - [x] Form (`react-hook-form` + Radix Label integration: `Form`, `FormItem`, `FormLabel`, `FormControl`, `FormMessage`)
- [x] Verifikasi typecheck (`tsc --noEmit` 0 errors)
- [x] Verifikasi linter Biome (`biome lint` 0 errors across 338 files)
- [x] Verifikasi unit & component tests Vitest (26 test suites, 121 passing tests)
- [x] Verifikasi Next.js 16 Turbopack build (17 routes compiled successfully)

### ✅ Fase 4: Monorepo, CLI Scaffolder & Dokumentasi
- [x] Perbarui root `package.json` scripts untuk NestJS & Drizzle (`db:generate`, `db:push`, `db:studio`, `migrate`, `seed`)
- [x] Perbarui `packages/cli/scripts/copy-templates.js` dan bundler template
- [x] Perbarui `packages/cli/src/post-install.ts` dengan instruksi PostgreSQL / NeonDB & NestJS
- [x] Perbarui `packages/cli/package.json` (metadata, dependencies, build/test scripts)
- [x] Verifikasi build & test CLI (`npm run build:cli`, 6 passing tests)
- [x] Perbarui dokumentasi: `README.md`, `docs/ARCHITECTURE.md`, `docs/SETUP.md`, `docs/API.md`, `docs/INTEGRATION.md`

### ✅ Fase 5: Pengujian & Validasi Mutu
- [x] Eksekusi automated test suite (`npm test`) — 34 test suites, 146 tests passing:
  - Backend: 6 test suites, 19 tests
  - Frontend: 26 test suites, 121 tests
  - Packages/cli: 2 test suites, 6 tests
- [x] Verifikasi typecheck di seluruh workspace (`npm run typecheck` — 0 errors)
- [x] Verifikasi linter Biome (`npm run lint` — 0 errors)
- [x] Verifikasi build bundle produksi (`npm run build:all` — backend, frontend, CLI sukses)
- [x] Verifikasi arsitektur keamanan RBAC (Stateless JWT httpOnly cookies, Drizzle token rotation, guard @RequirePermissions)
- [x] **Contract Alignment & Full Endpoint Audit**:
  - [x] Fix login response: Frontend `useLoginForm` & `useAuth` memvalidasi `response.data.data` via `authenticatedUserSchema` (membutuhkan `id`, `name`, `email`, `roles`, `permissions` di root payload). Backend diupdate menyediakan format root kompatibel + nested `user` object.
  - [x] Fix pagination meta: `TransformInterceptor` diupdate agar selalu melestarikan `meta: { total, page, limit }` pada seluruh endpoint berpaginasi (`PaginatedResponse<T>`).
  - [x] Fix roles users mapping: `roles.service.ts` diupdate mengembalikan `users: { id, name }[]` (bukan integer count) untuk mendukung `AvatarStack` di `RoleTable.tsx`.
  - [x] Fix permissions roles mapping: `permissions.service.ts` diupdate mengembalikan `roles: string[]` dan `createdAt: string` serta filter `usage` (`used`/`unused`).
- [x] Fix users fields: `users.service.ts` menyediakan format ganda (`name` & `fullName`, `is_active` & `isActive`, `email_verified` & `emailVerified`, `created_at` & `createdAt`).
  - [x] Fix audit logs params: `audit-logs.controller.ts` mendukung query param camelCase (`resourceType`, `userId`, `dateFrom`, `dateTo`) dan snake_case.
- [x] **Email Provider Migration (Mailtrap SMTP → Resend SDK)**:
  - [x] Install package resmi `resend` dan hapus dependensi `nodemailer` & `@types/nodemailer`.
  - [x] Perbarui schema konfigurasi environment (`backend/src/config/env.ts`, `.env.example`, `.env`) dengan `RESEND_API_KEY` dan `RESEND_FROM`.
  - [x] Implementasi `MailService` modern (`backend/src/modules/auth/mail.service.ts`) menggunakan Resend SDK dengan graceful simulation mode untuk local dev dan unit tests.
  - [x] HTML & text templates responsive modern untuk email verifikasi, reset password, undangan pengguna, dan notifikasi perubahan password.
  - [x] Unit test komprehensif `backend/src/modules/auth/__tests__/mail.service.test.ts` (8 passing test cases: formatting, simulation mode, API error handling, exception fallback).
- [x] **Backend Production Enhancements**:
  - [x] **Rate Limiting (@nestjs/throttler)**: Konfigurasi rate limiting global (`60 req/min`) dan limit ketat (`@Throttle({ default: { limit: 5, ttl: 60000 } })`) pada endpoint sensitif (`/api/auth/login`, `/api/auth/register`, `/api/auth/forgot-password`, `/api/auth/reset-password`, dan `3 req/min` pada `/api/auth/resend-verification`) untuk mencegah serangan brute force dan credential stuffing.
  - [x] **Permissions Caching (Redis / In-Memory Cache)**: Implementasi `PermissionsCacheService` dengan dual-engine (Redis via `ioredis` dan high-speed In-Memory fallback ber-TTL 10 menit) untuk meng-cache daftar izin user. Terintegrasi langsung dengan `PermissionsGuard` untuk meminimalkan beban query ke NeonDB, serta invalidasi otomatis saat admin mengubah role/izin user di `UsersService`, `RolesService`, dan `PermissionsService`.
  - [x] **Declarative Audit Log Decorator & Interceptor**: Pembuatan decorator deklaratif `@Audit(...)` dan global interceptor `AuditLogInterceptor` (`APP_INTERCEPTOR`). Menangkap metadata aksi, tipe resource, ID resource dari request/response, IP address, user ID, serta otomatis mensanitasi password/token sensitif (`[REDACTED]`) tanpa perlu logging manual di service layer.
  - [x] Total automated tests meningkat menjadi **162 passing tests** across workspaces (Backend: 35, Frontend: 121, CLI: 6).

