# RBAC Boilerplate — Frontend (`frontend/`)

Next.js 16 (App Router) admin dashboard for the **RBAC Boilerplate**, built with React 19, TypeScript, Tailwind CSS v4, and **Shadcn UI** (Radix UI primitives + CVA).

## Tech Stack

- **Framework:** Next.js 16 (App Router, Turbopack) + React 19
- **Styling & UI:** Tailwind CSS v4 + Shadcn UI (`src/shared/components/ui/`)
- **State Management:** Zustand (`authStore` persisted to `localStorage`)
- **Server State & Data Fetching:** TanStack React Query v5 + Axios (`apiClient` with automatic `401` token refresh queue)
- **Forms & Validation:** React Hook Form + Zod
- **Real-Time Notifications:** Browser `EventSource` (SSE stream `/api/notifications/stream`)
- **Security:** Strict HTTP Security Headers configured in `next.config.ts` (`CSP`, `HSTS`, `X-Frame-Options`, `X-Content-Type-Options`)
- **Testing:** Vitest + React Testing Library

## Getting Started

From the repository root:

```bash
# Copy environment variables
cp frontend/.env.example frontend/.env.local

# Start development server (http://localhost:3000)
npm run dev:frontend
```

Or directly inside `frontend/`:

```bash
npm run dev        # Start Next.js 16 dev server with Turbopack
npm run build      # Production build
npm run typecheck  # Run TypeScript compiler check
npm test           # Run Vitest component & hook unit tests
```

## Directory Structure

```
src/
├── app/
│   ├── (auth)/        # Public authentication routes (login, register, forgot/reset password, verify-email)
│   └── (dashboard)/   # Protected admin routes (dashboard, users, roles, permissions, audit-logs, notifications, profile)
├── features/          # Domain-driven feature modules (api, components, hooks, schemas, types)
└── shared/
    ├── components/
    │   ├── common/    # Layout navigation, BrandMark, ErrorBoundary
    │   ├── guard/     # ProtectedRoute, PermissionGate
    │   └── ui/        # Shadcn UI primitives (Button, Input, Dialog, Select, Table, Badge, Tabs, etc.)
    ├── hooks/         # Shared hooks (usePermission, etc.)
    ├── lib/           # Axios client, Zod helpers, `cn()` utility
    └── stores/        # Zustand stores
```
