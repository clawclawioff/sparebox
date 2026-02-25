-- Agent Chat V2: Add gateway token and container port for direct HTTP chat
-- These columns enable the Sparebox backend to call the OpenClaw gateway directly

-- Gateway token (encrypted, for authenticating to container's HTTP API)
ALTER TABLE "agents" ADD COLUMN "gateway_token" text;

-- Container port (the host port mapped to container's port 3000)
ALTER TABLE "agents" ADD COLUMN "container_port" integer;

-- Index on container_port for potential lookups
CREATE INDEX IF NOT EXISTS "agents_container_port_idx" ON "agents" ("container_port") WHERE "container_port" IS NOT NULL;
