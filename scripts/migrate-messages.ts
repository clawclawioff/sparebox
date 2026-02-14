import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!);

async function main() {
  console.log("Running migration 0012: agent_messages...");

  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS "agent_messages" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "agent_id" uuid NOT NULL REFERENCES "agents"("id") ON DELETE CASCADE,
      "role" text NOT NULL DEFAULT 'user',
      "content" text NOT NULL,
      "status" text NOT NULL DEFAULT 'pending',
      "delivered_at" timestamp,
      "responded_at" timestamp,
      "created_at" timestamp DEFAULT now() NOT NULL
    );
  `);
  console.log("✓ Table created");

  await sql.unsafe(`CREATE INDEX IF NOT EXISTS "idx_agent_messages_agent_id" ON "agent_messages" ("agent_id");`);
  console.log("✓ Index: agent_id");

  await sql.unsafe(`CREATE INDEX IF NOT EXISTS "idx_agent_messages_status" ON "agent_messages" ("agent_id", "status");`);
  console.log("✓ Index: status");

  await sql.unsafe(`CREATE INDEX IF NOT EXISTS "idx_agent_messages_created" ON "agent_messages" ("agent_id", "created_at" DESC);`);
  console.log("✓ Index: created_at");

  console.log("Migration 0012 complete!");
  await sql.end();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
