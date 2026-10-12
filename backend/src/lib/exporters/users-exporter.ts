import { buildWorkbook } from "./table-workbook.js";

export interface UserExportRow {
  fullName: string;
  email: string;
  isActive: boolean;
  roles: string[];
  createdAt: Date;
}

/**
 * Builds a single-sheet Users export workbook from filtered user export rows.
 */
export function buildUsersWorkbook(users: UserExportRow[]): Promise<Buffer> {
  return buildWorkbook([
    {
      sheetName: "Users",
      tableName: "Users",
      columns: ["Name", "Email", "Status", "Roles", "Created At"],
      rows: users.map((user) => [
        user.fullName,
        user.email,
        user.isActive ? "Active" : "Inactive",
        user.roles.join(", "),
        user.createdAt.toISOString().slice(0, 10),
      ]),
    },
  ]);
}
