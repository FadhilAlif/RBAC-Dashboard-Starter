import path from "path";
import { fileURLToPath } from "url";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { db, queryClient } from "./connection.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function runMigrations() {
  console.log("Starting PostgreSQL database migrations...");
  try {
    await migrate(db, {
      migrationsFolder: path.join(__dirname, "migrations"),
    });
    console.log("Database migrations applied successfully.");
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  }
}

// When executed directly via tsx
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runMigrations()
    .then(async () => {
      await queryClient.end();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error(err);
      await queryClient.end();
      process.exit(1);
    });
}
