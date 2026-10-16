# rbac-boilerplate

[![npm version](https://img.shields.io/npm/v/rbac-boilerplate.svg)](https://www.npmjs.com/package/rbac-boilerplate)
[![npm downloads](https://img.shields.io/npm/dm/rbac-boilerplate.svg)](https://www.npmjs.com/package/rbac-boilerplate)
[![license](https://img.shields.io/npm/l/rbac-boilerplate.svg)](https://github.com/abdrahman02/rbac-boilerplate/blob/main/LICENSE)
[![Node](https://img.shields.io/node/v/rbac-boilerplate.svg)](https://nodejs.org)

> **RBAC boilerplate & starter kit** — scaffold a production-ready, full-stack **Role-Based Access Control** dashboard with one command.

`rbac-boilerplate` is a free, open-source **RBAC starter template** for building secure dashboard applications. It ships with authentication, user management, fine-grained `resource:action` permissions, role management, declarative audit logging, Redis/In-Memory permission caching, rate limiting, and a modern Shadcn UI admin dashboard — all wired together and ready to customize.

```bash
npx rbac-boilerplate my-dashboard
```

## Why rbac-boilerplate?

Setting up **Role-Based Access Control (RBAC)** from scratch — JWT auth, refresh-token rotation, permission caching, rate limiting, an admin dashboard, and audit logging — takes days. This boilerplate gives you all of it in one command, with strict TypeScript end-to-end and automated Vitest suites passing out of the box.

- ✅ **Authentication & authorization** out of the box (JWT in `httpOnly` cookies, automatic refresh rotation)
- ✅ **Fine-grained permissions** in `resource:action` format (e.g. `users:read`, `roles:update`) with Redis / In-Memory caching
- ✅ **Users, Roles & Permissions CRUD** with a ready-made Next.js 16 + Shadcn UI admin dashboard
- ✅ **Declarative Audit Logging (`@Audit`)** & real-time notifications (Server-Sent Events)
- ✅ **Production-hardened NestJS 12 backend** with `@nestjs/throttler`, Helmet HTTP security headers, and Drizzle ORM

## Quick Start

```bash
npx rbac-boilerplate my-dashboard
cd my-dashboard
```

Then follow the setup steps:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
# Fill in backend/.env: DATABASE_URL (NeonDB or local PostgreSQL), JWT_ACCESS_SECRET, JWT_REFRESH_SECRET

npm install
npm run migrate
npm run seed
npm run create-admin

npm run dev:backend   # http://localhost:3001  (Swagger at /api/docs)
npm run dev:frontend  # http://localhost:3000
```

## Tech Stack

| Layer    | Technology                                                        |
|----------|-------------------------------------------------------------------|
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Shadcn UI |
| Backend  | NestJS 12, TypeScript, `@nestjs/throttler`, Helmet                |
| Database | PostgreSQL 14+ / NeonDB Serverless, Drizzle ORM                   |
| Caching  | Redis (`ioredis`) with automatic In-Memory fallback (10m TTL)     |
| Email    | Resend SDK (`resend`) with local console simulation mode          |
| Auth     | Dual JWT (`httpOnly` cookies, DB refresh-token rotation)          |
| Testing  | Vitest                                                            |

## Features

- **Auth flows** — register, login, logout, forgot/reset password, email verification (via Resend SDK)
- **RBAC core** — fine-grained `resource:action` permissions with `PermissionsGuard` and `PermissionsCacheService`
- **Admin dashboard** — User, Role, and Permission management UI built with Shadcn UI + Radix Primitives
- **Declarative Audit Logging** — track every sensitive action via `@Audit()` and `AuditLogInterceptor`
- **Real-time notifications** — Server-Sent Events (SSE) broadcast stream

## Prerequisites

- Node.js 20+
- PostgreSQL 14+ or a NeonDB Serverless account
- npm 10+

## Documentation

Full documentation ships inside your scaffolded project:

- `docs/SETUP.md` — Step-by-step setup with troubleshooting
- `docs/API.md` — All API endpoints with request/response examples
- `docs/INTEGRATION.md` — How to add features and extend the boilerplate
- `docs/ARCHITECTURE.md` — System design, data flow, folder structure

## Keywords

RBAC, RBAC boilerplate, role-based access control, authentication, authorization, permissions, ACL, access control, admin dashboard, full-stack starter kit, NestJS, Drizzle ORM, PostgreSQL, NeonDB, Next.js, React, Shadcn UI, TypeScript, Resend, JWT.

## License

[MIT](https://github.com/abdrahman02/rbac-boilerplate/blob/main/LICENSE) © M. Abdul Rahman
