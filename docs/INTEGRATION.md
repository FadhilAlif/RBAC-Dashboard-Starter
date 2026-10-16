# Integration Guide

How to customize and extend RBAC Boilerplate for your project.

## Adding a New Permission

### 1. Define the permission name

Use `resource:action` format: `reports:read`, `billing:update`, `settings:delete`.

### 2. Add it to the seeder (for default permissions)

Open `backend/seeders/seed.ts` and add to the `DEFAULT_PERMISSIONS` array:

```typescript
{ name: "reports:read", description: "View reports" },
```

Re-run: `npm run seed` (uses idempotent upsert — safe to re-run on existing data).

### 3. Or create it via API

```bash
POST /api/permissions
{ "name": "reports:read", "description": "View reports" }
```

### 4. Assign it to a role via API

```bash
PUT /api/roles/1/permissions
{ "permissionIds": [1, 2, 3, 14] }
```

---

## Protecting a Backend Route (NestJS)

Use the `@RequirePermissions()` decorator combined with the global `PermissionsGuard`:

```typescript
import { Controller, Get, UseGuards } from "@nestjs/common";
import { RequirePermissions } from "@/common/decorators/require-permissions.decorator";

@Controller("reports")
export class ReportsController {
  // Requires "reports:read" permission
  @Get()
  @RequirePermissions("reports:read")
  async listReports() {
    return this.reportsService.findAll();
  }

  // Multiple permissions (requires all listed permissions)
  @Get("analytics")
  @RequirePermissions("reports:read", "analytics:view")
  async getAnalytics() {
    return this.reportsService.getAnalytics();
  }
}
```

### Declarative Audit Logging (`@Audit`) & Custom Rate Limiting (`@Throttle`)

Use `@Audit()` to automatically record actions in `audit_logs` (with automatic redaction of sensitive fields via `AuditLogInterceptor`), and `@Throttle()` to customize rate limits per endpoint:

```typescript
import { Body, Controller, Post, UsePipes } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { Audit } from "@/common/decorators/audit.decorator";
import { RequirePermissions } from "@/common/decorators/require-permissions.decorator";
import { ZodValidationPipe } from "@/common/pipes/zod-validation.pipe";

@Controller("reports")
export class ReportsController {
  @Post()
  @RequirePermissions("reports:create")
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // Max 10 creations/min per IP
  @Audit({ action: "reports:create", resourceType: "reports" })
  @UsePipes(new ZodValidationPipe(createReportSchema))
  async createReport(@Body() dto: CreateReportDto) {
    return this.reportsService.create(dto);
  }
}
```

---

## Adding a New Backend Module in NestJS

Follow NestJS modular architecture with Drizzle ORM: Schema → Service → Controller → Module.

### 1. Define Drizzle Schema (`src/database/schema/reports.ts`)

```typescript
import { pgTable, serial, varchar, timestamp } from "drizzle-orm/pg-core";

export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
```

Export it in `src/database/schema/index.ts`.
Generate migration: `npm run db:generate`
Run migration: `npm run migrate`

### 2. Create Service (`src/modules/reports/reports.service.ts`)

```typescript
import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { eq, desc } from "drizzle-orm";
import { DRIZZLE_DB, type DrizzleDb } from "@/database/database.module";
import { reports } from "@/database/schema";

@Injectable()
export class ReportsService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDb) {}

  async findAll() {
    return this.db.select().from(reports).orderBy(desc(reports.createdAt));
  }

  async findById(id: number) {
    const [report] = await this.db.select().from(reports).where(eq(reports.id, id));
    if (!report) throw new NotFoundException("Report not found");
    return report;
  }
}
```

### 3. Create Controller (`src/modules/reports/reports.controller.ts`)

```typescript
import { Controller, Get, Param, ParseIntPipe } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { RequirePermissions } from "@/common/decorators/require-permissions.decorator";
import { ReportsService } from "./reports.service";

@ApiTags("Reports")
@Controller("reports")
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  @RequirePermissions("reports:read")
  @ApiOperation({ summary: "List all reports" })
  async list() {
    return this.reportsService.findAll();
  }

  @Get(":id")
  @RequirePermissions("reports:read")
  @ApiOperation({ summary: "Get report by ID" })
  async get(@Param("id", ParseIntPipe) id: number) {
    return this.reportsService.findById(id);
  }
}
```

### 4. Create Module (`src/modules/reports/reports.module.ts`)

```typescript
import { Module } from "@nestjs/common";
import { ReportsController } from "./reports.controller";
import { ReportsService } from "./reports.service";

@Module({
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
```

### 5. Register in `src/app.module.ts`

Import and add `ReportsModule` to the `imports` array in `AppModule`.

---

## Protecting a Frontend Page

Wrap your page with `ProtectedRoute` from `frontend/src/shared/components/guard/`:

```tsx
// app/(dashboard)/reports/page.tsx
import { ProtectedRoute } from "@/shared/components/guard";

export default function ReportsPage() {
  return (
    <ProtectedRoute requiredPermission="reports:read">
      <div>Reports content here</div>
    </ProtectedRoute>
  );
}
```

`ProtectedRoute` redirects to `/login` if unauthenticated, or shows an access-denied state if the permission is missing.

---

## Conditional UI Based on Permission

Use `PermissionGate` to show or hide elements:

```tsx
import { PermissionGate } from "@/shared/components/guard";
import { Button } from "@/shared/components/ui";

<PermissionGate permission="reports:read">
  <Button>View Reports</Button>
</PermissionGate>

<PermissionGate permission="reports:read" fallback={<span>Access denied</span>}>
  <ReportsTable />
</PermissionGate>
```

Use the `usePermission` hook for imperative checks:

```tsx
import { usePermission } from "@/shared/hooks";

const canExport = usePermission("reports:read");

return canExport ? <ExportButton /> : null;
```

---

## Adding a New Frontend Feature Module

Follow the feature-based structure in `frontend/src/features/`:

```
features/reports/
  components/
    ReportModal.tsx       # Create/edit modal using Shadcn Dialog/Modal
  hooks/
    useReports.ts         # CRUD hooks with TanStack Query
  types/
    report.ts             # TypeScript types
```

**Example hook (`useReports.ts`):**

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/shared/lib/api-client";

export function useReports() {
  return useQuery({
    queryKey: ["reports"],
    queryFn: () => apiClient.get("/reports").then((r) => r.data.data),
  });
}

export function useCreateReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { title: string }) => apiClient.post("/reports", data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["reports"] }),
  });
}
```

---

## Customizing Token Expiry

In `backend/.env`:
```env
JWT_ACCESS_EXPIRES_IN=15m    # default: 15m
JWT_REFRESH_EXPIRES_IN=7d    # default: 7d
```

---

## Disabling Email Verification

To allow users to log in immediately after registration without email verification:

In `backend/src/modules/auth/auth.service.ts`, in the `register` method, set:
```typescript
isActive: true,
emailVerifiedAt: new Date(),
```

And comment out the `this.mailService.sendVerificationEmail(...)` call.
