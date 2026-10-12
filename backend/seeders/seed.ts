import { eq } from "drizzle-orm";
import { db, queryClient } from "../src/database/connection.js";
import { permissions, rolePermissions, roles } from "../src/database/schema/index.js";

const DEFAULT_PERMISSIONS = [
  { name: "users:read", description: "View list and detail of users" },
  { name: "users:create", description: "Create new users" },
  { name: "users:update", description: "Update existing users" },
  { name: "users:delete", description: "Delete users" },
  { name: "roles:read", description: "View list and detail of roles" },
  { name: "roles:create", description: "Create new roles" },
  { name: "roles:update", description: "Update existing roles" },
  { name: "roles:delete", description: "Delete roles" },
  { name: "permissions:read", description: "View list and detail of permissions" },
  { name: "permissions:create", description: "Create new permissions" },
  { name: "permissions:update", description: "Update existing permissions" },
  { name: "permissions:delete", description: "Delete permissions" },
  { name: "audit_logs:read", description: "View audit logs" },
  { name: "notifications:create", description: "Broadcast notifications to selected roles" },
];

const DEFAULT_ROLES = [
  { name: "admin", description: "Full system access — all permissions assigned" },
  { name: "user", description: "Basic user — no admin permissions by default" },
];

export async function seed(): Promise<void> {
  console.log("Starting database seeding with Drizzle ORM...");

  // Seed permissions
  for (const perm of DEFAULT_PERMISSIONS) {
    await db
      .insert(permissions)
      .values({ name: perm.name, description: perm.description })
      .onConflictDoUpdate({
        target: permissions.name,
        set: { description: perm.description, updatedAt: new Date() },
      });
  }
  console.log(`✓ Seeded ${DEFAULT_PERMISSIONS.length} permissions`);

  // Seed roles
  for (const role of DEFAULT_ROLES) {
    await db
      .insert(roles)
      .values({ name: role.name, description: role.description })
      .onConflictDoUpdate({
        target: roles.name,
        set: { description: role.description, updatedAt: new Date() },
      });
  }
  console.log(`✓ Seeded ${DEFAULT_ROLES.length} roles`);

  // Get admin role
  const [adminRole] = await db.select().from(roles).where(eq(roles.name, "admin")).limit(1);

  if (!adminRole) throw new Error("Admin role not found after insert");

  // Get all permissions
  const allPermissions = await db.select().from(permissions);

  // Assign all permissions to admin role
  for (const perm of allPermissions) {
    await db
      .insert(rolePermissions)
      .values({
        roleId: adminRole.id,
        permissionId: perm.id,
      })
      .onConflictDoNothing();
  }
  console.log(`✓ Assigned all ${allPermissions.length} permissions to admin role`);

  console.log("\nSeed complete.");
}

seed()
  .then(async () => {
    await queryClient.end();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error("Seed failed:", err);
    await queryClient.end();
    process.exit(1);
  });
