# Setup Guide

Step-by-step instructions for running RBAC Boilerplate locally.

## Prerequisites

| Requirement | Version | Check |
|-------------|---------|-------|
| Node.js | 20+ | `node --version` |
| npm | 10+ | `npm --version` |
| PostgreSQL or NeonDB | 14+ | `psql --version` (or Neon cloud account) |

## 1. Create the Project

```bash
npx rbac-boilerplate my-dashboard
cd my-dashboard
```

All remaining commands are run from inside the `my-dashboard/` directory.

## 2. Configure Environment

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

Open `backend/.env` and set these required values:

```env
# Database (Option A: NeonDB Serverless URL)
DATABASE_URL=postgresql://user:password@ep-sample-123456.us-east-2.aws.neon.tech/neondb?sslmode=require

# Database (Option B: Local PostgreSQL)
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=rbac_db
# DB_USER=postgres
# DB_PASSWORD=your_password
# DB_SSL=false

# JWT Secrets — generate with:
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_ACCESS_SECRET=<your-random-secret-min-32-chars>
JWT_REFRESH_SECRET=<your-different-random-secret-min-32-chars>

# Email (Resend — https://resend.com)
# Optional in dev (falls back to simulation mode in console if omitted)
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM=onboarding@resend.dev

# Redis Cache (Optional — automatically falls back to In-Memory cache if omitted)
# REDIS_URL=redis://localhost:6379
```

`frontend/.env.local` already defaults to `NEXT_PUBLIC_API_URL=http://localhost:3001/api` — no changes needed for local development.

## 3. Database Preparation

If using local PostgreSQL:
```sql
CREATE DATABASE rbac_db;
```
If using NeonDB, simply paste your Neon connection string into `DATABASE_URL`.

## 4. Install Dependencies

```bash
npm install
```

`npm install` installs dependencies across root workspaces (`backend/`, `frontend/`, `packages/cli`).

## 5. Run Migrations

```bash
npm run migrate
```

Applies Drizzle SQL migrations (`backend/src/database/migrations/`) to create all tables: `users`, `roles`, `permissions`, `user_roles`, `role_permissions`, `refresh_tokens`, `audit_logs`, `email_verification_tokens`, `password_reset_tokens`, `notifications`, `notification_roles`, `notification_reads`.

## 6. Seed Default Data

```bash
npm run seed
```

Creates 14 granular permissions + 2 initial roles (`admin` gets all 14, `user` gets view privileges).

## 7. Create Admin User

```bash
npm run create-admin
```

Interactive prompt asks for name, email, and password. The user is created via an atomic transaction with the `admin` role and email pre-verified.

## 8. Start Development Servers

Run each server in its own terminal — **both from inside the project directory** (`my-dashboard/`):

```bash
# Terminal 1: NestJS Backend API
npm run dev:backend   # http://localhost:3001

# Terminal 2: Next.js + Shadcn UI Frontend
npm run dev:frontend  # http://localhost:3000
```

Visit `http://localhost:3000/login` and log in with your admin credentials.

- **Swagger OpenAPI Documentation**: `http://localhost:3001/api/docs`
- **Drizzle Studio (Database GUI)**: `npm run db:studio`

## Useful Scripts

| Command | Description |
|---------|-------------|
| `npm run dev:backend` | Start NestJS backend in watch mode |
| `npm run dev:frontend` | Start Next.js frontend with Turbopack |
| `npm run build:backend` | Compile NestJS backend to `dist/` |
| `npm run build:frontend` | Build Next.js production bundle |
| `npm test` | Run all test suites across workspaces |
| `npm run typecheck` | TypeScript typecheck across all workspaces |
| `npm run migrate` | Run Drizzle database migrations |
| `npm run db:generate` | Generate migration SQL files with Drizzle Kit |
| `npm run db:push` | Push schema changes directly to DB (dev only) |
| `npm run db:studio` | Open Drizzle Studio visual database inspector |
| `npm run seed` | Seed default roles and permissions |
| `npm run create-admin` | Create admin user interactively |

## Troubleshooting

**`Error: connect ECONNREFUSED 127.0.0.1:5432`**
PostgreSQL service is not running locally. Start it via `sudo systemctl start postgresql` or Docker. Alternatively, use a cloud NeonDB instance via `DATABASE_URL`.

**`Error: JWT_ACCESS_SECRET must be at least 32 characters`**
Generate 64-character random strings:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Frontend shows blank page or API errors**
Confirm `frontend/.env.local` contains `NEXT_PUBLIC_API_URL=http://localhost:3001/api` and that the NestJS backend is running.
