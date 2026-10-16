# CLAUDE.md

This file provides guidance to AI coding assistants (Claude Code, Antigravity, Cursor) when working with code in this repository.

## Project Overview

Production-ready **Role-Based Access Control (RBAC)** starter template built as an npm workspaces monorepo (`backend`, `frontend`, `packages/cli`).

| Layer | Technology |
|---|---|
| **Backend** | NestJS 12, TypeScript (ESM via `tsx`), Express platform |
| **Database & ORM** | PostgreSQL / NeonDB Serverless + Drizzle ORM (`drizzle-orm`, `drizzle-kit`) |
| **Authentication** | Stateless JWT (`access_token` 15m, `refresh_token` 7d) in `httpOnly` cookies with DB token rotation |
| **Authorization** | `@RequirePermissions("resource:action")` + `PermissionsGuard` backed by `PermissionsCacheService` (Redis via `ioredis` + 10m TTL In-Memory fallback) |
| **Rate Limiting** | `@nestjs/throttler` via custom `AppThrottlerGuard` (60 req/min global; 5 req/min on auth endpoints) |
| **Audit Logging** | Declarative `@Audit()` decorator + global `AuditLogInterceptor` with automatic sensitive field redaction |
| **Email Service** | Resend SDK (`resend`) with automatic local console simulation fallback |
| **Security Headers** | `helmet` on Backend + custom security `headers()` in `frontend/next.config.ts` |
| **Frontend** | Next.js 16 (App Router, Turbopack), React 19, Tailwind CSS v4, Shadcn UI (Radix Primitives + CVA) |
| **State & Data** | Zustand (persisted auth store) + TanStack React Query v5 + Axios (auto-refresh interceptor) |
| **Linter & Formatter** | Biome (`@biomejs/biome`) at root |
| **Testing** | Vitest across `backend`, `frontend`, and `packages/cli` |

---

## Commands

Run from the **root** directory unless noted:

```bash
# Development
npm run dev:backend          # NestJS watch mode on http://localhost:3001 (Swagger at /api/docs)
npm run dev:frontend         # Next.js 16 (Turbopack) on http://localhost:3000

# Database (Drizzle ORM + PostgreSQL / NeonDB)
npm run db:generate          # Generate SQL migrations from Drizzle schema
npm run migrate              # Apply Drizzle migrations to PostgreSQL / NeonDB
npm run db:push              # Push Drizzle schema directly (dev only)
npm run db:studio            # Open Drizzle Studio GUI
npm run seed                 # Seed 14 default permissions + admin/user roles (idempotent upsert)
npm run create-admin         # Interactive CLI to create an admin user in an atomic transaction

# Testing
npm test                     # Run all Vitest suites across backend + frontend
npm run test:backend         # Backend Vitest tests
npm run test:frontend        # Frontend Vitest tests

# Code Quality (Biome runs at root level across backend/ and frontend/)
npm run lint                 # Biome lint check
npm run lint:fix             # Auto-fix lint issues
npm run format               # Biome format check
npm run format:fix           # Auto-format code
npm run typecheck            # TypeScript check (tsc --noEmit) across backend + frontend
npm run check                # Combined format + lint + typecheck

# Production Builds
npm run build:backend        # Compile backend TypeScript to backend/dist
npm run build:frontend       # Build Next.js production app
npm run build:cli            # Build scaffolding CLI package (packages/cli)
npm run build:all            # Build backend, frontend, and CLI
```

---

## Architecture & Key Patterns

### Backend (`backend/src/`)

- **Entry & Bootstrap (`main.ts`, `app.module.ts`)**:
  - Global prefix `/api` (except `/health`).
  - `helmet` configured with CSP relaxation on `/api/docs` for Swagger UI.
  - Global guards registered via `APP_GUARD` in order:
    1. `AppThrottlerGuard` (`src/common/guards/throttler.guard.ts`) — explicitly injects `@Inject(Reflector)` to avoid CJS/ESM class identity mismatches under `tsx`.
    2. `JwtAuthGuard` (`src/common/guards/jwt-auth.guard.ts`) — validates `access_token` cookie or Bearer token; respects `@Public()`.
    3. `PermissionsGuard` (`src/common/guards/permissions.guard.ts`) — checks `@RequirePermissions(...)` using `PermissionsCacheService` (Redis / In-Memory cache with 10-minute TTL).
  - Global interceptors:
    - `AuditLogInterceptor` (`APP_INTERCEPTOR`) — records actions for routes decorated with `@Audit(...)`, redacting sensitive keys (`password`, `token`, etc.).
    - `TransformInterceptor` — wraps responses into `{ success: true, message, data, meta? }` while passing through SSE `MessageEvent` streams (`/api/notifications/stream`) untouched.
  - Global filter:
    - `AllExceptionsFilter` — maps `AppError` codes (`ERROR_MAP`), Zod errors, and NestJS `HttpException`s (including duck-typed CJS `HttpException` instances like `ThrottlerException`) into `{ success: false, message, errors? }`.

- **Validation (`src/common/pipes/zod-validation.pipe.ts`)**:
  - `new ZodValidationPipe(schema, targetType = "body")` only validates arguments matching `targetType` (`"body"` by default), preventing method-level `@UsePipes(...)` from colliding with `@Param("id", ParseIntPipe)`.

- **Database (`src/database/`)**:
  - `schema/` contains PostgreSQL table definitions (`users`, `roles`, `permissions`, `user_roles`, `role_permissions`, `refresh_tokens`, `email_verification_tokens`, `password_reset_tokens`, `audit_logs`, `notifications`, `notification_roles`, `notification_reads`).
  - Injected into NestJS services via `@Inject(DRIZZLE_DB) private readonly db: DrizzleDb`.

- **Permissions Cache Invalidation**:
  - Whenever roles or permissions are mutated in `UsersService`, `RolesService`, or `PermissionsService`, call `this.permissionsCache.invalidateUser(userId)` or `this.permissionsCache.invalidateAll()` so `PermissionsGuard` immediately reflects the updated permissions.

### Frontend (`frontend/src/`)

- **Feature-First Structure (`src/features/<domain>/`)**:
  - Domains: `auth`, `users`, `roles`, `permissions`, `audit-logs`, `dashboard`, `notifications`, `profile`.
  - Each feature contains `api/`, `components/`, `hooks/`, `schemas/`, and `types/`.
- **UI Primitives (`src/shared/components/ui/`)**:
  - Built on **Shadcn UI** (Radix UI primitives + `class-variance-authority` + `cn()` helper in `src/shared/lib/utils.ts`).
- **Auth & RBAC Guards**:
  - `apiClient` (`src/shared/lib/api-client.ts`) sends `withCredentials: true` and queues concurrent requests during `401` token refresh (`POST /api/auth/refresh`).
  - `ProtectedRoute` and `PermissionGate` (`src/shared/components/guard/`) enforce route and element-level permissions.
  - Real-time notifications use `EventSource` connected to `/api/notifications/stream` listening for `new_notification` events.
