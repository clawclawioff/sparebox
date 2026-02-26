-- Agent Secrets (encrypted API keys for tools)
CREATE TABLE IF NOT EXISTS agent_secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  encrypted_value TEXT NOT NULL,
  label TEXT,
  category TEXT DEFAULT 'tool',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(agent_id, key)
);

CREATE INDEX IF NOT EXISTS idx_agent_secrets_agent ON agent_secrets(agent_id);

-- Agent Logs (container log entries)
CREATE TABLE IF NOT EXISTS agent_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  level TEXT DEFAULT 'info',
  message TEXT NOT NULL,
  source TEXT DEFAULT 'container',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_logs_agent_ts ON agent_logs(agent_id, timestamp DESC);

-- Agent settings JSONB column
ALTER TABLE agents ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';
