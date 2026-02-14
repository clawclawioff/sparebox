-- Agent Messages table for deployer <-> agent chat
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
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_agent_messages_agent_id" ON "agent_messages" ("agent_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_agent_messages_status" ON "agent_messages" ("agent_id", "status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_agent_messages_created" ON "agent_messages" ("agent_id", "created_at" DESC);
