# RBAC Boilerplate

A production-ready Role-Based Access Control starter template for building dashboard applications. Ships with authentication, user management, fine-grained permissions, audit logging, and an admin UI — modern tech stack, clean code, ready to clone and customize.

![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)
![NestJS](https://img.shields.io/badge/NestJS-12-red)
![Next.js](https://img.shields.io/badge/Next.js-16-black)
![Drizzle](https://img.shields.io/badge/Drizzle-ORM-orange)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-NeonDB-blue)
![Shadcn UI](https://img.shields.io/badge/Shadcn-UI-black)
![License](https://img.shields.io/badge/license-MIT-green)

## Features

- **Authentication** — Register, login, logout, forgot/reset password, email verification (via Resend SDK)
- **Dual JWT Tokens** — Access token (15 min) + refresh token (7 days) stored in `httpOnly` cookies with DB rotation
- **RBAC Authorization & Caching** — Fine-grained `resource:action` permissions backed by Redis / In-Memory `PermissionsCacheService` (10m TTL + automatic invalidation)
- **Rate Limiting & Security** — Brute-force protection via `@nestjs/throttler` (60 req/min global, 5 req/min on auth endpoints) + strict HTTP security headers (`helmet` & Next.js CSP/HSTS)
- **User Management** — CRUD users, assign multiple roles, soft delete, Excel export
- **Role Management** — CRUD roles, assign permissions, Excel export
- **Permission Management** — CRUD permissions in `resource:action` format
- **Declarative Audit Logging** — Automatic action logging via `@Audit()` decorator & `AuditLogInterceptor` with sensitive-field redaction and JSONB metadata
- **Admin Dashboard** — Full management UI built with Next.js 16 App Router & Shadcn UI
- **Notifications** — Real-time broadcasts via Server-Sent Events (SSE)

## Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | NestJS 12, TypeScript, Modular Architecture, `@nestjs/throttler`, Helmet |
| **ORM & Database** | Drizzle ORM + PostgreSQL / NeonDB Serverless |
| **Caching** | Redis (`ioredis`) with automatic In-Memory fallback (10m TTL) |
| **Frontend** | Next.js 16 (App Router, Turbopack), React 19, Tailwind CSS v4 |
| **UI Components** | Shadcn UI (Radix UI primitives + CVA) |
| **Auth** | Stateless JWT in `httpOnly` Cookies, DB Token Rotation |
| **Email** | Resend SDK (https://resend.com) + Local Simulation Mode |
| **API Docs** | Swagger / OpenAPI 3.0 at `/api/docs` |
| **Validation** | Zod schemas (Backend & Frontend) |
| **Testing** | Vitest |

## Quick Start

**Prerequisites:** Node.js 20+, PostgreSQL or NeonDB, npm

```bash
npx rbac-boilerplate my-dashboard
cd my-dashboard
```

### Setup

All commands below are run from inside the `my-dashboard/` directory.

```bash
# 1. Configure environment
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
# Open backend/.env and fill in DATABASE_URL (NeonDB) or local DB credentials, plus JWT secrets

# 2. Install dependencies
npm install

# 3. Run database migrations & seed initial data
npm run migrate
npm run seed
npm run create-admin

# 4. Start the dev servers (two terminals, both inside my-dashboard/)
npm run dev:backend   # NestJS API: http://localhost:3001
npm run dev:frontend  # Next.js UI: http://localhost:3000
```

Login at `http://localhost:3000/login` with the admin credentials you just created.

See [docs/SETUP.md](docs/SETUP.md) for the full step-by-step guide and troubleshooting.

## Documentation

| Doc | Description |
|---|---|
| [SETUP.md](docs/SETUP.md) | Step-by-step local setup with troubleshooting |
| [API.md](docs/API.md) | All API endpoints with request/response examples |
| [INTEGRATION.md](docs/INTEGRATION.md) | How to add features, protect routes, extend schema |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design, data flow, folder structure |

Interactive API docs available at `http://localhost:3001/api/docs` (Swagger UI) once the backend is running.

## Project Structure

```
rbac-boilerplate/
├── backend/                  # NestJS API (TypeScript)
│   ├── src/
│   │   ├── common/           # Guards, Decorators, Interceptors, Filters, Pipes
│   │   ├── database/         # Drizzle schema, migrations, connection provider
│   │   └── modules/          # Auth, Users, Roles, Permissions, Dashboard, Notifications, AuditLogs
│   ├── seeders/              # Default roles + permissions seeder
│   └── scripts/              # Create admin script
├── frontend/                 # Next.js 16 App Router (TypeScript)
│   └── src/
│       ├── app/              # Routes & layouts
│       ├── features/         # Feature modules (auth, users, roles, permissions, etc.)
│       └── shared/           # Shadcn UI primitives, hooks, guards, stores, utils
└── packages/cli/             # Scaffolder CLI (npx rbac-boilerplate)
```

## Default Roles & Permissions

After running `npm run seed`, the database contains:

**Roles:** `admin`, `user`

**Permissions (14):**
`users:read`, `users:create`, `users:update`, `users:delete`,
`roles:read`, `roles:create`, `roles:update`, `roles:delete`,
`permissions:read`, `permissions:create`, `permissions:update`, `permissions:delete`,
`audit_logs:read`, `notifications:create`

The `admin` role has all 14 permissions. The `user` role has view permissions by default.

## License

MIT
