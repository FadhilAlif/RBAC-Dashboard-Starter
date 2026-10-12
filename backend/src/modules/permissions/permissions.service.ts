import { Inject, Injectable } from "@nestjs/common";
import { and, count, desc, eq, ilike, inArray, ne, notInArray } from "drizzle-orm";
import { DRIZZLE_DB } from "../../database/database.module.js";
import type { DrizzleDatabase } from "../../database/connection.js";
import {
  permissions,
  rolePermissions,
  roles,
} from "../../database/schema/index.js";
import { buildWorkbook } from "../../lib/exporters/table-workbook.js";
import type {
  CreatePermissionInput,
  UpdatePermissionInput,
} from "./permissions.schemas.js";

export interface PermissionItem {
  id: number;
  name: string;
  description: string | null;
  roles: string[];
  createdAt: string;
  created_at: Date | string;
}

@Injectable()
export class PermissionsService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDatabase) {}

  async listPermissions(page: number = 1, limit: number = 50, search?: string, usage?: string) {
    const conditions = [];

    if (search) {
      conditions.push(ilike(permissions.name, `%${search}%`));
    }

    if (usage === "used") {
      const usedPerms = await this.db
        .selectDistinct({ id: rolePermissions.permissionId })
        .from(rolePermissions);
      const usedIds = usedPerms.map((p) => p.id);
      if (usedIds.length === 0) {
        return { data: [], meta: { total: 0, page, limit } };
      }
      conditions.push(inArray(permissions.id, usedIds));
    } else if (usage === "unused") {
      const usedPerms = await this.db
        .selectDistinct({ id: rolePermissions.permissionId })
        .from(rolePermissions);
      const usedIds = usedPerms.map((p) => p.id);
      if (usedIds.length > 0) {
        conditions.push(notInArray(permissions.id, usedIds));
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalRecord] = await this.db
      .select({ count: count() })
      .from(permissions)
      .where(whereClause);

    const total = totalRecord?.count ? Number(totalRecord.count) : 0;

    const rows = await this.db
      .select()
      .from(permissions)
      .where(whereClause)
      .orderBy(desc(permissions.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);

    const data: PermissionItem[] = await Promise.all(
      rows.map(async (p) => {
        const roleRows = await this.db
          .select({ name: roles.name })
          .from(rolePermissions)
          .innerJoin(roles, eq(rolePermissions.roleId, roles.id))
          .where(eq(rolePermissions.permissionId, p.id));

        return {
          id: p.id,
          name: p.name,
          description: p.description,
          roles: roleRows.map((r) => r.name),
          createdAt: p.createdAt.toISOString(),
          created_at: p.createdAt,
        };
      }),
    );

    return {
      data,
      meta: { total, page, limit },
    };
  }

  async getPermission(id: number): Promise<PermissionItem | null> {
    const [perm] = await this.db
      .select()
      .from(permissions)
      .where(eq(permissions.id, id))
      .limit(1);

    if (!perm) return null;

    const roleRows = await this.db
      .select({ name: roles.name })
      .from(rolePermissions)
      .innerJoin(roles, eq(rolePermissions.roleId, roles.id))
      .where(eq(rolePermissions.permissionId, id));

    return {
      id: perm.id,
      name: perm.name,
      description: perm.description,
      roles: roleRows.map((r) => r.name),
      createdAt: perm.createdAt.toISOString(),
      created_at: perm.createdAt,
    };
  }

  async createPermission(input: CreatePermissionInput): Promise<number> {
    const [existing] = await this.db
      .select({ id: permissions.id })
      .from(permissions)
      .where(eq(permissions.name, input.name))
      .limit(1);

    if (existing) throw new Error("PERMISSION_NAME_TAKEN");

    const [newPerm] = await this.db
      .insert(permissions)
      .values({
        name: input.name,
        description: input.description,
      })
      .returning({ id: permissions.id });

    if (!newPerm) throw new Error("Failed to create permission");
    return newPerm.id;
  }

  async updatePermission(id: number, input: UpdatePermissionInput): Promise<void> {
    const [perm] = await this.db
      .select({ id: permissions.id })
      .from(permissions)
      .where(eq(permissions.id, id))
      .limit(1);

    if (!perm) throw new Error("PERMISSION_NOT_FOUND");

    if (input.name) {
      const [existing] = await this.db
        .select({ id: permissions.id })
        .from(permissions)
        .where(and(eq(permissions.name, input.name), ne(permissions.id, id)))
        .limit(1);

      if (existing) throw new Error("PERMISSION_NAME_TAKEN");
    }

    await this.db
      .update(permissions)
      .set({
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
      })
      .where(eq(permissions.id, id));
  }

  async deletePermission(id: number): Promise<void> {
    const [perm] = await this.db
      .select({ id: permissions.id })
      .from(permissions)
      .where(eq(permissions.id, id))
      .limit(1);

    if (!perm) throw new Error("PERMISSION_NOT_FOUND");

    await this.db.delete(permissions).where(eq(permissions.id, id));
  }

  async buildPermissionsExportWorkbook(search?: string, usage?: string): Promise<Buffer> {
    const { data } = await this.listPermissions(1, 10000, search, usage);

    return buildWorkbook([
      {
        sheetName: "Permissions",
        tableName: "Permissions",
        columns: ["Name", "Description", "Created At"],
        rows: data.map((p) => [
          p.name,
          p.description ?? "",
          new Date(p.created_at).toISOString().slice(0, 10),
        ]),
      },
    ]);
  }
}
