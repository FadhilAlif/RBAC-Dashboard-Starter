import { randomBytes } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import { and, count, desc, eq, ilike, inArray, isNull, ne, or } from "drizzle-orm";
import { DRIZZLE_DB } from "../../database/database.module.js";
import type { DrizzleDatabase } from "../../database/connection.js";
import {
  passwordResetTokens,
  roles,
  userRoles,
  users,
} from "../../database/schema/index.js";
import { hashPassword } from "../../utils/hash.js";
import { MailService } from "../auth/mail.service.js";
import { TokenService } from "../auth/token.service.js";
import { buildWorkbook } from "../../lib/exporters/table-workbook.js";
import type {
  CreateUserInput,
  UpdateUserInput,
} from "./users.schemas.js";

import { PermissionsCacheService } from "../permissions/permissions-cache.service.js";
import { Optional } from "@nestjs/common";

const INVITE_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface UserItem {
  id: number;
  name: string;
  fullName?: string;
  email: string;
  is_active: boolean;
  isActive?: boolean;
  email_verified: boolean;
  emailVerified?: boolean;
  roles: string[];
  created_at: Date | string;
  createdAt?: Date | string;
}

@Injectable()
export class UsersService {
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: DrizzleDatabase,
    @Inject(TokenService) private readonly tokenService: TokenService,
    @Inject(MailService) private readonly mailService: MailService,
    @Optional()
    @Inject(PermissionsCacheService)
    private readonly permissionsCacheService?: PermissionsCacheService,
  ) {}

  async listUsers(
    page: number = 1,
    limit: number = 10,
    search?: string,
    role?: string,
    status?: boolean,
  ) {
    const conditions = [isNull(users.deletedAt)];

    if (search) {
      const searchPattern = `%${search}%`;
      conditions.push(or(ilike(users.fullName, searchPattern), ilike(users.email, searchPattern))!);
    }

    if (status !== undefined) {
      conditions.push(eq(users.isActive, status));
    }

    if (role) {
      // Dapatkan user ids yang memiliki role tersebut
      const matchedUserRoles = await this.db
        .select({ userId: userRoles.userId })
        .from(userRoles)
        .innerJoin(roles, eq(userRoles.roleId, roles.id))
        .where(eq(roles.name, role));

      const matchedIds = matchedUserRoles.map((r) => r.userId);
      if (matchedIds.length === 0) {
        return {
          data: [],
          meta: { total: 0, page, limit },
        };
      }
      conditions.push(inArray(users.id, matchedIds));
    }

    const whereClause = and(...conditions);

    const [totalRecord] = await this.db
      .select({ count: count() })
      .from(users)
      .where(whereClause);

    const total = totalRecord?.count ? Number(totalRecord.count) : 0;

    const rows = await this.db
      .select()
      .from(users)
      .where(whereClause)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);

    const data: UserItem[] = await Promise.all(
      rows.map(async (u) => {
        const userRolesList = await this.getUserRoleNames(u.id);
        return {
          id: u.id,
          name: u.fullName,
          fullName: u.fullName,
          email: u.email,
          is_active: u.isActive,
          isActive: u.isActive,
          email_verified: u.emailVerifiedAt !== null,
          emailVerified: u.emailVerifiedAt !== null,
          roles: userRolesList,
          created_at: u.createdAt,
          createdAt: u.createdAt,
        };
      }),
    );

    return {
      data,
      meta: {
        total,
        page,
        limit,
      },
    };
  }

  async getUser(userId: number): Promise<UserItem | null> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(and(eq(users.id, userId), isNull(users.deletedAt)))
      .limit(1);

    if (!user) return null;

    const rolesList = await this.getUserRoleNames(userId);
    return {
      id: user.id,
      name: user.fullName,
      fullName: user.fullName,
      email: user.email,
      is_active: user.isActive,
      isActive: user.isActive,
      email_verified: user.emailVerifiedAt !== null,
      emailVerified: user.emailVerifiedAt !== null,
      roles: rolesList,
      created_at: user.createdAt,
      createdAt: user.createdAt,
    };
  }

  async createUser(input: CreateUserInput): Promise<number> {
    const [existing] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.email, input.email), isNull(users.deletedAt)))
      .limit(1);

    if (existing) throw new Error("EMAIL_TAKEN");

    const placeholderHash = await hashPassword(randomBytes(32).toString("hex"));

    const [newUser] = await this.db
      .insert(users)
      .values({
        fullName: input.name,
        email: input.email,
        passwordHash: placeholderHash,
        isActive: false,
      })
      .returning({ id: users.id });

    if (!newUser) throw new Error("Failed to create user");

    if (input.role_ids && input.role_ids.length > 0) {
      for (const roleId of input.role_ids) {
        await this.db
          .insert(userRoles)
          .values({ userId: newUser.id, roleId })
          .onConflictDoNothing();
      }
    }

    const rawToken = this.tokenService.generateVerificationToken();
    const tokenHash = this.tokenService.hashVerificationToken(rawToken);
    const expiresAt = new Date(Date.now() + INVITE_TOKEN_TTL_MS);

    await this.db.insert(passwordResetTokens).values({
      userId: newUser.id,
      tokenHash,
      expiresAt,
      isInvite: true,
    });

    await this.mailService.sendInviteEmail(input.email, input.name, rawToken);

    return newUser.id;
  }

  async updateUser(userId: number, input: UpdateUserInput): Promise<void> {
    const [user] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, userId), isNull(users.deletedAt)))
      .limit(1);

    if (!user) throw new Error("USER_NOT_FOUND");

    if (input.email) {
      const [conflict] = await this.db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.email, input.email), ne(users.id, userId), isNull(users.deletedAt)))
        .limit(1);

      if (conflict) throw new Error("EMAIL_TAKEN");
    }

    await this.db
      .update(users)
      .set({
        ...(input.name !== undefined ? { fullName: input.name } : {}),
        ...(input.email !== undefined ? { email: input.email } : {}),
        ...(input.is_active !== undefined ? { isActive: input.is_active } : {}),
      })
      .where(eq(users.id, userId));
  }

  async deleteUser(userId: number): Promise<void> {
    const [user] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, userId), isNull(users.deletedAt)))
      .limit(1);

    if (!user) throw new Error("USER_NOT_FOUND");

    const anonymizedEmail = `deleted_${userId}_${Date.now()}@deleted.local`;

    await this.db
      .update(users)
      .set({
        deletedAt: new Date(),
        isActive: false,
        email: anonymizedEmail,
      })
      .where(eq(users.id, userId));

    await this.permissionsCacheService?.invalidateUser(userId);
  }

  async syncRoles(userId: number, roleIds: number[]): Promise<void> {
    const [user] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, userId), isNull(users.deletedAt)))
      .limit(1);

    if (!user) throw new Error("USER_NOT_FOUND");

    await this.db.transaction(async (tx) => {
      await tx.delete(userRoles).where(eq(userRoles.userId, userId));
      if (roleIds.length > 0) {
        for (const roleId of roleIds) {
          await tx
            .insert(userRoles)
            .values({ userId, roleId })
            .onConflictDoNothing();
        }
      }
    });

    await this.permissionsCacheService?.invalidateUser(userId);
  }

  async removeRole(userId: number, roleId: number): Promise<void> {
    await this.db
      .delete(userRoles)
      .where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, roleId)));

    await this.permissionsCacheService?.invalidateUser(userId);
  }

  async buildUsersExportWorkbook(
    search?: string,
    role?: string,
    status?: string,
  ): Promise<Buffer> {
    const statusBool = status === "active" ? true : status === "inactive" ? false : undefined;
    const { data } = await this.listUsers(1, 10000, search, role, statusBool);

    return buildWorkbook([
      {
        sheetName: "Users",
        tableName: "Users",
        columns: ["Name", "Email", "Status", "Roles", "Created At"],
        rows: data.map((u) => [
          u.name,
          u.email,
          u.is_active ? "Active" : "Inactive",
          u.roles.join(", "),
          new Date(u.created_at).toISOString().slice(0, 10),
        ]),
      },
    ]);
  }

  private async getUserRoleNames(userId: number): Promise<string[]> {
    const rows = await this.db
      .select({ name: roles.name })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(userRoles.userId, userId));

    return rows.map((r) => r.name);
  }
}
