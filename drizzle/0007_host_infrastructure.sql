-- Sprint 3: Host Infrastructure
-- Adds API key table for daemon auth + new host columns

-- Host API Keys table
CREATE TABLE IF NOT EXISTS host_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL REFERENCES hosts(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  key_suffix TEXT NOT NULL,
  name TEXT DEFAULT 'default',
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_host_api_keys_hash ON host_api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_host_api_keys_host ON host_api_keys(host_id);

-- Add columns to hosts table
ALTER TABLE hosts ADD COLUMN IF NOT EXISTS daemon_version TEXT;
ALTER TABLE hosts ADD COLUMN IF NOT EXISTS node_version TEXT;
ALTER TABLE hosts ADD COLUMN IF NOT EXISTS public_ip TEXT;
