import { stdin as input, stdout as output } from "node:process";
import { createInterface } from "node:readline";
import { eq } from "drizzle-orm";
import { db, queryClient } from "../src/database/connection.js";
import { roles, userRoles, users } from "../src/database/schema/index.js";
import { hashPassword } from "../src/utils/hash.js";

const rl = createInterface({ input, output });

function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

async function main() {
  try {
    console.log("\n📝 Create Admin User (Drizzle ORM & PostgreSQL)\n");

    const email = await prompt("Email: ");
    if (!email.includes("@")) {
      console.error("❌ Invalid email format");
      rl.close();
      process.exit(1);
    }

    const password = await prompt("Password: ");
    if (password.length < 6) {
      console.error("❌ Password must be at least 6 characters");
      rl.close();
      process.exit(1);
    }

    const name = await prompt("Full Name: ");
    if (!name) {
      console.error("❌ Name cannot be empty");
      rl.close();
      process.exit(1);
    }

    rl.close();

    console.log("\n⏳ Creating admin user in database...");

    // Check if user already exists
    const [existingUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser) {
      console.error("❌ User with this email already exists");
      await queryClient.end();
      process.exit(1);
    }

    // Get admin role
    const [adminRole] = await db
      .select({ id: roles.id })
      .from(roles)
      .where(eq(roles.name, "admin"))
      .limit(1);

    if (!adminRole) {
      console.error("❌ Admin role not found in database. Run 'npm run seed' first.");
      await queryClient.end();
      process.exit(1);
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user and assign admin role in an atomic transaction
    const user = await db.transaction(async (tx) => {
      const [newUser] = await tx
        .insert(users)
        .values({
          email,
          fullName: name,
          passwordHash,
          isActive: true,
          emailVerifiedAt: new Date(),
        })
        .returning({ id: users.id, email: users.email, fullName: users.fullName });

      await tx.insert(userRoles).values({
        userId: newUser.id,
        roleId: adminRole.id,
      });

      return newUser;
    });

    await queryClient.end();

    console.log("\n✅ Admin user created successfully!");
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.fullName}`);
    console.log("   Role: admin\n");
  } catch (error) {
    await queryClient.end();
    console.error("❌ Error creating admin user:", error instanceof Error ? error.message : error);
    rl.close();
    process.exit(1);
  }
}

main();
