import { Inject, Injectable } from "@nestjs/common";
import { and, count, desc, eq, ilike, inArray, isNull, ne } from "drizzle-orm";
import { DRIZZLE_DB } from "../../database/database.module.js";
import type { DrizzleDatabase } from "../../database/connection.js";
import {
  permissions,
  rolePermissions,
  roles,
  userRoles,
  users,
} from "../../database/schema/index.js";
import { buildWorkbook } from "../../lib/exporters/table-workbook.js";
import type {
  CreateRoleInput,
  UpdateRoleInput,
} from "./roles.schemas.js";

export interface RoleUserItem {
  id: number;
  name: string;
}

export interface RoleItem {
  id: number;
  name: string;
  description: string | null;
  permissions: string[];
  users: RoleUserItem[];
  userCount?: number;
  created_at: Date;
  createdAt?: Date;
}

@Injectable()
export class RolesService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDatabase) {}

  async listRoles(
    page: number = 1,
    limit: number = 10,
    search?: string,
    permission?: string,
  ) {
    const conditions = [];

    if (search) {
      conditions.push(ilike(roles.name, `%${search}%`));
    }

    if (permission) {
      const matchedRoles = await this.db
        .select({ roleId: rolePermissions.roleId })
        .from(rolePermissions)
        .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
        .where(eq(permissions.name, permission));

      const matchedIds = matchedRoles.map((r) => r.roleId);
      if (matchedIds.length === 0) {
        return { data: [], meta: { total: 0, page, limit } };
      }
      conditions.push(inArray(roles.id, matchedIds));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalRecord] = await this.db
      .select({ count: count() })
      .from(roles)
      .where(whereClause);

    const total = totalRecord?.count ? Number(totalRecord.count) : 0;

    const rows = await this.db
      .select()
      .from(roles)
      .where(whereClause)
      .orderBy(desc(roles.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);

    const data: RoleItem[] = await Promise.all(
      rows.map(async (r) => {
        const [rolePerms, roleUsers] = await Promise.all([
          this.getRolePermissionNames(r.id),
          this.db
            .select({ id: users.id, name: users.fullName })
            .from(userRoles)
            .innerJoin(users, eq(userRoles.userId, users.id))
            .where(and(eq(userRoles.roleId, r.id), isNull(users.deletedAt)))
            .limit(10),
        ]);

        return {
          id: r.id,
          name: r.name,
          description: r.description,
          permissions: rolePerms,
          users: roleUsers,
          userCount: roleUsers.length,
          created_at: r.createdAt,
          createdAt: r.createdAt,
        };
      }),
    );

    return {
      data,
      meta: { total, page, limit },
    };
  }

  async getRole(roleId: number): Promise<RoleItem | null> {
    const [role] = await this.db
      .select()
      .from(roles)
      .where(eq(roles.id, roleId))
      .limit(1);

    if (!role) return null;

    const [perms, roleUsers] = await Promise.all([
      this.getRolePermissionNames(roleId),
      this.db
        .select({ id: users.id, name: users.fullName })
        .from(userRoles)
        .innerJoin(users, eq(userRoles.userId, users.id))
        .where(and(eq(userRoles.roleId, roleId), isNull(users.deletedAt)))
        .limit(10),
    ]);

    return {
      id: role.id,
      name: role.name,
      description: role.description,
      permissions: perms,
      users: roleUsers,
      userCount: roleUsers.length,
      created_at: role.createdAt,
      createdAt: role.createdAt,
    };
  }

  async createRole(input: CreateRoleInput): Promise<number> {
    const [existing] = await this.db
      .select({ id: roles.id })
      .from(roles)
      .where(eq(roles.name, input.name))
      .limit(1);

    if (existing) throw new Error("ROLE_NAME_TAKEN");

    const [newRole] = await this.db
      .insert(roles)
      .values({
        name: input.name,
        description: input.description,
      })
      .returning({ id: roles.id });

    if (!newRole) throw new Error("Failed to create role");
    return newRole.id;
  }

  async updateRole(roleId: number, input: UpdateRoleInput): Promise<void> {
    const [role] = await this.db
      .select({ id: roles.id })
      .from(roles)
      .where(eq(roles.id, roleId))
      .limit(1);

    if (!role) throw new Error("ROLE_NOT_FOUND");

    if (input.name) {
      const [existing] = await this.db
        .select({ id: roles.id })
        .from(roles)
        .where(and(eq(roles.name, input.name), ne(roles.id, roleId)))
        .limit(1);

      if (existing) throw new Error("ROLE_NAME_TAKEN");
    }

    await this.db
      .update(roles)
      .set({
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
      })
      .where(eq(roles.id, roleId));
  }

  async deleteRole(roleId: number): Promise<void> {
    const [role] = await this.db
      .select({ id: roles.id })
      .from(roles)
      .where(eq(roles.id, roleId))
      .limit(1);

    if (!role) throw new Error("ROLE_NOT_FOUND");

    await this.db.delete(roles).where(eq(roles.id, roleId));
  }

  async syncPermissions(roleId: number, permissionIds: number[]): Promise<void> {
    const [role] = await this.db
      .select({ id: roles.id })
      .from(roles)
      .where(eq(roles.id, roleId))
      .limit(1);

    if (!role) throw new Error("ROLE_NOT_FOUND");

    await this.db.transaction(async (tx) => {
      await tx.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));
      if (permissionIds.length > 0) {
        for (const permissionId of permissionIds) {
          await tx
            .insert(rolePermissions)
            .values({ roleId, permissionId })
            .onConflictDoNothing();
        }
      }
    });
  }

  async assignPermission(roleId: number, permissionId: number): Promise<void> {
    const [role] = await this.db
      .select({ id: roles.id })
      .from(roles)
      .where(eq(roles.id, roleId))
      .limit(1);

    if (!role) throw new Error("ROLE_NOT_FOUND");

    await this.db
      .insert(rolePermissions)
      .values({ roleId, permissionId })
      .onConflictDoNothing();
  }

  async removePermission(roleId: number, permissionId: number): Promise<void> {
    await this.db
      .delete(rolePermissions)
      .where(and(eq(rolePermissions.roleId, roleId), eq(rolePermissions.permissionId, permissionId)));
  }

  async buildRolesExportWorkbook(search?: string, permission?: string): Promise<Buffer> {
    const { data } = await this.listRoles(1, 10000, search, permission);

    return buildWorkbook([
      {
        sheetName: "Roles",
        tableName: "Roles",
        columns: ["Name", "Description", "Users Count", "Permissions", "Created At"],
        rows: data.map((r) => [
          r.name,
          r.description ?? "",
          Array.isArray(r.users) ? r.users.length : 0,
          r.permissions.join(", "),
          new Date(r.created_at).toISOString().slice(0, 10),
        ]),
      },
    ]);
  }

  private async getRolePermissionNames(roleId: number): Promise<string[]> {
    const rows = await this.db
      .select({ name: permissions.name })
      .from(rolePermissions)
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(rolePermissions.roleId, roleId));

    return rows.map((p) => p.name);
  }
}
