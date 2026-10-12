import { buildWorkbook } from "./table-workbook.js";

export interface PermissionRow {
  name: string;
  description: string | null;
  roles?: string[];
  createdAt: Date;
}

/**
 * Builds a single-sheet Permissions export workbook from permission rows.
 */
export function buildPermissionsWorkbook(permissions: PermissionRow[]): Promise<Buffer> {
  return buildWorkbook([
    {
      sheetName: "Permissions",
      tableName: "Permissions",
      columns: ["Name", "Description", "Created At"],
      rows: permissions.map((permission) => [
        permission.name,
        permission.description ?? "",
        permission.createdAt.toISOString().slice(0, 10),
      ]),
    },
  ]);
}
