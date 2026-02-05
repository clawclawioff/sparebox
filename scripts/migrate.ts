import postgres from "postgres";
import fs from "fs";
import path from "path";

const sql = postgres(process.env.DATABASE_URL!);

async function migrate() {
  const migrationPath = path.join(__dirname, "../drizzle/0001_lively_hulk.sql");
  const migrationSql = fs.readFileSync(migrationPath, "utf-8");

  // Split by statement breakpoint and execute each
  const statements = migrationSql.split("--> statement-breakpoint");

  for (const statement of statements) {
    const trimmed = statement.trim();
    if (trimmed) {
      try {
        console.log("Executing:", trimmed.substring(0, 50) + "...");
        await sql.unsafe(trimmed);
        console.log("✓ Done");
      } catch (e: any) {
        console.error("Error:", e.message);
      }
    }
  }

  await sql.end();
  console.log("Migration complete!");
}

migrate().catch(console.error);
