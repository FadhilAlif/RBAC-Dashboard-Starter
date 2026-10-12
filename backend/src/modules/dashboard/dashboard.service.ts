import { Inject, Injectable } from "@nestjs/common";
import { and, count, desc, eq, gte, isNull } from "drizzle-orm";
import { DRIZZLE_DB } from "../../database/database.module.js";
import type { DrizzleDatabase } from "../../database/connection.js";
import {
  auditLogs,
  permissions,
  rolePermissions,
  roles,
  userRoles,
  users,
} from "../../database/schema/index.js";
import { buildWorkbook } from "../../lib/exporters/table-workbook.js";

const STATS_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export interface RoleDistributionItem {
  id: number;
  name: string;
  count: number;
  pct: number;
}

export interface DashboardStatsDto {
  totalUsers: number;
  newUsersThisWeek: number;
  inactiveUsers: number;
  totalRoles: number;
  totalPermissionsAssigned: number;
  totalPermissions: number;
  totalEvents: number;
  eventsToday: number;
  recentActivity: {
    id: number;
    action: string;
    resourceType: string;
    resourceId: number | null;
    userName: string | null;
    createdAt: string;
  }[];
}

@Injectable()
export class DashboardService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDatabase) {}

  async getRoleDistribution(): Promise<RoleDistributionItem[]> {
    const [totalUsersRes] = await this.db
      .select({ count: count() })
      .from(users)
      .where(isNull(users.deletedAt));

    const totalUsers = totalUsersRes?.count ? Number(totalUsersRes.count) : 0;

    const allRoles = await this.db
      .select({ id: roles.id, name: roles.name })
      .from(roles)
      .orderBy(roles.name)
      .limit(6);

    const items = await Promise.all(
      allRoles.map(async (r) => {
        const [c] = await this.db
          .select({ count: count() })
          .from(userRoles)
          .where(eq(userRoles.roleId, r.id));

        const roleCount = c?.count ? Number(c.count) : 0;
        return {
          id: r.id,
          name: r.name,
          count: roleCount,
          pct: totalUsers > 0 ? Math.round((roleCount / totalUsers) * 100) : 0,
        };
      }),
    );

    return items;
  }

  async getDashboardStats(): Promise<DashboardStatsDto> {
    const now = new Date();
    const sinceDate = new Date(Date.now() - STATS_WINDOW_MS);
    const todayMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    const [
      totalUsersRes,
      inactiveUsersRes,
      newUsersThisWeekRes,
      totalRolesRes,
      totalPermissionsAssignedRes,
      totalPermissionsRes,
      totalEventsRes,
      eventsTodayRes,
      recentLogs,
    ] = await Promise.all([
      this.db.select({ count: count() }).from(users).where(isNull(users.deletedAt)),
      this.db.select({ count: count() }).from(users).where(and(isNull(users.deletedAt), eq(users.isActive, false))),
      this.db.select({ count: count() }).from(users).where(and(isNull(users.deletedAt), gte(users.createdAt, sinceDate))),
      this.db.select({ count: count() }).from(roles),
      this.db.select({ count: count() }).from(rolePermissions),
      this.db.select({ count: count() }).from(permissions),
      this.db.select({ count: count() }).from(auditLogs),
      this.db.select({ count: count() }).from(auditLogs).where(gte(auditLogs.createdAt, todayMidnight)),
      this.db
        .select({
          id: auditLogs.id,
          action: auditLogs.action,
          resourceType: auditLogs.resourceType,
          resourceId: auditLogs.resourceId,
          userName: users.fullName,
          createdAt: auditLogs.createdAt,
        })
        .from(auditLogs)
        .leftJoin(users, eq(auditLogs.userId, users.id))
        .orderBy(desc(auditLogs.createdAt))
        .limit(20),
    ]);

    return {
      totalUsers: totalUsersRes[0]?.count ? Number(totalUsersRes[0].count) : 0,
      inactiveUsers: inactiveUsersRes[0]?.count ? Number(inactiveUsersRes[0].count) : 0,
      newUsersThisWeek: newUsersThisWeekRes[0]?.count ? Number(newUsersThisWeekRes[0].count) : 0,
      totalRoles: totalRolesRes[0]?.count ? Number(totalRolesRes[0].count) : 0,
      totalPermissionsAssigned: totalPermissionsAssignedRes[0]?.count ? Number(totalPermissionsAssignedRes[0].count) : 0,
      totalPermissions: totalPermissionsRes[0]?.count ? Number(totalPermissionsRes[0].count) : 0,
      totalEvents: totalEventsRes[0]?.count ? Number(totalEventsRes[0].count) : 0,
      eventsToday: eventsTodayRes[0]?.count ? Number(eventsTodayRes[0].count) : 0,
      recentActivity: recentLogs.map((log) => ({
        id: log.id,
        action: log.action,
        resourceType: log.resourceType,
        resourceId: log.resourceId,
        userName: log.userName,
        createdAt: log.createdAt.toISOString(),
      })),
    };
  }

  async buildExportWorkbook(): Promise<Buffer> {
    const stats = await this.getDashboardStats();

    return buildWorkbook([
      {
        sheetName: "Overview",
        tableName: "Overview",
        columns: ["Metric", "Value"],
        rows: [
          ["Total Users", stats.totalUsers],
          ["Active Users", stats.totalUsers - stats.inactiveUsers],
          ["Inactive Users", stats.inactiveUsers],
          ["New Users (This Week)", stats.newUsersThisWeek],
          ["Total Roles", stats.totalRoles],
          ["Total Permissions", stats.totalPermissions],
          ["Assigned Permissions", stats.totalPermissionsAssigned],
          ["Total Audit Events", stats.totalEvents],
          ["Events Today", stats.eventsToday],
        ],
      },
    ]);
  }
}
