import type { RoleExportRow } from "./roles-exporter.js";
import type { UserExportRow } from "./users-exporter.js";
import { buildWorkbook, type TableSheet } from "./table-workbook.js";

export interface DashboardStatsOverview {
  totalUsers: number;
  newUsersThisWeek: number;
  inactiveUsers: number;
  totalRoles: number;
  totalPermissionsAssigned: number;
  totalPermissions: number;
}

export interface DashboardExportData {
  stats: DashboardStatsOverview;
  users?: UserExportRow[];
  roles?: RoleExportRow[];
}

/**
 * Builds the multi-sheet dashboard report. The Summary sheet is always present;
 * Users and Roles sheets are included only when their data is provided.
 */
export function buildDashboardWorkbook(data: DashboardExportData): Promise<Buffer> {
  const tables: TableSheet[] = [summaryTable(data.stats)];

  if (data.users) tables.push(usersTable(data.users));
  if (data.roles) tables.push(rolesTable(data.roles));

  return buildWorkbook(tables);
}

function summaryTable(stats: DashboardStatsOverview): TableSheet {
  return {
    sheetName: "Summary",
    tableName: "Summary",
    columns: ["Metric", "Value"],
    rows: [
      ["Total Users", stats.totalUsers],
      ["New Users This Week", stats.newUsersThisWeek],
      ["Inactive Users", stats.inactiveUsers],
      ["Total Roles", stats.totalRoles],
      ["Total Permissions Assigned", stats.totalPermissionsAssigned],
      ["Total Permissions", stats.totalPermissions],
    ],
  };
}

function usersTable(users: UserExportRow[]): TableSheet {
  return {
    sheetName: "Users",
    tableName: "Users",
    columns: ["Full Name", "Email", "Active", "Roles", "Created At"],
    rows: users.map((user) => [
      user.fullName,
      user.email,
      user.isActive ? "Active" : "Inactive",
      user.roles.join(", "),
      user.createdAt.toISOString().slice(0, 10),
    ]),
  };
}

function rolesTable(roles: RoleExportRow[]): TableSheet {
  return {
    sheetName: "Roles",
    tableName: "Roles",
    columns: ["Name", "Permissions Count"],
    rows: roles.map((role) => [role.name, role.permissions.length]),
  };
}
