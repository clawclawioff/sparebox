import postgres from "postgres";
import fs from "fs";
import path from "path";

const sql = postgres(process.env.DATABASE_URL!);

async function migrate() {
  const drizzleDir = path.join(__dirname, "../drizzle");
  const files = fs.readdirSync(drizzleDir)
    .filter(f => f.endsWith(".sql"))
    .sort();

  console.log(`Found ${files.length} migration files`);

  for (const file of files) {
    console.log(`\n=== Running ${file} ===`);
    const migrationPath = path.join(drizzleDir, file);
    const migrationSql = fs.readFileSync(migrationPath, "utf-8");

    // Split by statement breakpoint and execute each
    const statements = migrationSql.split("--> statement-breakpoint");

    for (const statement of statements) {
      const trimmed = statement.trim();
      if (trimmed) {
        try {
          console.log("Executing:", trimmed.substring(0, 60) + "...");
          await sql.unsafe(trimmed);
          console.log("✓ Done");
        } catch (e: any) {
          // Ignore "already exists" errors
          if (e.message.includes("already exists") || e.message.includes("duplicate")) {
            console.log("⏭️  Skipped (already exists)");
          } else {
            console.error("❌ Error:", e.message);
          }
        }
      }
    }
  }

  await sql.end();
  console.log("\n✅ Migration complete!");
}

migrate().catch(console.error);
