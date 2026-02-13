-- Sprint 5: Agent Deployment & Execution
-- Migration 0010: Command queue, tier pricing, agent config storage

-- =============================================================================
-- 1. Agent Commands Table (command queue for daemon)
-- =============================================================================

CREATE TABLE IF NOT EXISTS agent_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  host_id UUID NOT NULL REFERENCES hosts(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- deploy, start, stop, restart, undeploy, update_config
  payload JSONB,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, sent, acked, failed, expired
  created_at TIMESTAMP DEFAULT NOW(),
  sent_at TIMESTAMP,
  acked_at TIMESTAMP,
  error TEXT
);

CREATE INDEX IF NOT EXISTS idx_agent_commands_host_pending
  ON agent_commands(host_id, status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_agent_commands_agent
  ON agent_commands(agent_id);

-- =============================================================================
-- 2. Hosts: Per-tier pricing + isolation info
-- =============================================================================

ALTER TABLE hosts ADD COLUMN IF NOT EXISTS price_lite INTEGER;
ALTER TABLE hosts ADD COLUMN IF NOT EXISTS price_standard INTEGER;
ALTER TABLE hosts ADD COLUMN IF NOT EXISTS price_pro INTEGER;
ALTER TABLE hosts ADD COLUMN IF NOT EXISTS price_compute INTEGER;
ALTER TABLE hosts ADD COLUMN IF NOT EXISTS max_agents INTEGER;
ALTER TABLE hosts ADD COLUMN IF NOT EXISTS isolation_mode TEXT DEFAULT 'unknown';
ALTER TABLE hosts ADD COLUMN IF NOT EXISTS openclaw_version TEXT;

-- Backfill: existing hosts get their current price as standard tier price
UPDATE hosts SET price_standard = price_per_month WHERE price_standard IS NULL AND price_per_month > 0;

-- =============================================================================
-- 3. Agents: Tier, config (JSONB), workspace files, container tracking
-- =============================================================================

ALTER TABLE agents ADD COLUMN IF NOT EXISTS tier TEXT NOT NULL DEFAULT 'standard';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS workspace_files JSONB DEFAULT '{}';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS encrypted_api_key TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS container_id TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS isolation_mode TEXT DEFAULT 'docker';

-- Convert config from TEXT to JSONB if it's currently TEXT
-- (safe: existing values are either NULL or JSON strings)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agents' AND column_name = 'config' AND data_type = 'text'
  ) THEN
    ALTER TABLE agents ALTER COLUMN config TYPE JSONB USING
      CASE
        WHEN config IS NULL THEN NULL
        WHEN config = '' THEN '{}'::jsonb
        ELSE config::jsonb
      END;
  END IF;
END $$;

-- Set default for config column
ALTER TABLE agents ALTER COLUMN config SET DEFAULT '{}';

-- =============================================================================
-- 4. Subscriptions: Tier tracking
-- =============================================================================

ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS tier TEXT;
