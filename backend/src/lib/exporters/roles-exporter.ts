import { buildWorkbook } from "./table-workbook.js";

export interface RoleExportRow {
  id?: number;
  name: string;
  description: string | null;
  permissions: string[];
  userCount?: number;
  users?: { id: number }[];
  permissionCount?: number;
  createdAt: Date;
}

/**
 * Builds a single-sheet Roles export workbook from role rows.
 */
export function buildRolesWorkbook(roles: RoleExportRow[]): Promise<Buffer> {
  return buildWorkbook([
    {
      sheetName: "Roles",
      tableName: "Roles",
      columns: ["Name", "Description", "Permissions", "User Count", "Created At"],
      rows: roles.map((role) => [
        role.name,
        role.description ?? "",
        role.permissions.join(", "),
        role.userCount ?? role.users?.length ?? 0,
        role.createdAt.toISOString().slice(0, 10),
      ]),
    },
  ]);
}
