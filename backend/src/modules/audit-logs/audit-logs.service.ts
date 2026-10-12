import { Inject, Injectable, Logger } from "@nestjs/common";
import { and, count, desc, eq, gte, ilike, lte, or } from "drizzle-orm";
import { DRIZZLE_DB } from "../../database/database.module.js";
import type { DrizzleDatabase } from "../../database/connection.js";
import { auditLogs, users } from "../../database/schema/index.js";

export interface CreateAuditLogInput {
  userId: number | null;
  action: string;
  resourceType: string;
  resourceId?: number | null;
  details?: Record<string, unknown> | null;
  ipAddress?: string | null;
}

export interface AuditLogFilters {
  userId?: number | undefined;
  search?: string | undefined;
  action?: string | undefined;
  resourceType?: string | undefined;
  dateFrom?: Date | undefined;
  dateTo?: Date | undefined;
}

@Injectable()
export class AuditLogsService {
  private readonly logger = new Logger(AuditLogsService.name);

  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDatabase) {}

  async log(input: CreateAuditLogInput): Promise<void> {
    try {
      await this.db.insert(auditLogs).values({
        userId: input.userId,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId ?? null,
        details: input.details ?? null,
        ipAddress: input.ipAddress ?? null,
      });
    } catch (error) {
      this.logger.error(`Failed to record audit log: ${error}`);
    }
  }

  async listAuditLogs(filters: AuditLogFilters, page: number = 1, limit: number = 20) {
    const conditions = [];

    if (filters.userId !== undefined) {
      conditions.push(eq(auditLogs.userId, filters.userId));
    }

    if (filters.search) {
      const pattern = `%${filters.search}%`;
      conditions.push(
        or(ilike(auditLogs.action, pattern), ilike(auditLogs.resourceType, pattern))!,
      );
    }

    if (filters.action) {
      conditions.push(ilike(auditLogs.action, `%${filters.action}%`));
    }

    if (filters.resourceType) {
      conditions.push(eq(auditLogs.resourceType, filters.resourceType));
    }

    if (filters.dateFrom) {
      conditions.push(gte(auditLogs.createdAt, filters.dateFrom));
    }

    if (filters.dateTo) {
      conditions.push(lte(auditLogs.createdAt, filters.dateTo));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalRecord] = await this.db
      .select({ count: count() })
      .from(auditLogs)
      .where(whereClause);

    const total = totalRecord?.count ? Number(totalRecord.count) : 0;

    const rows = await this.db
      .select({
        id: auditLogs.id,
        userId: auditLogs.userId,
        userName: users.fullName,
        userEmail: users.email,
        action: auditLogs.action,
        resourceType: auditLogs.resourceType,
        resourceId: auditLogs.resourceId,
        details: auditLogs.details,
        ipAddress: auditLogs.ipAddress,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .where(whereClause)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);

    return {
      data: rows,
      meta: { total, page, limit },
    };
  }
}
