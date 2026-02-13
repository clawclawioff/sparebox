-- Migration: Add performance indexes for frequently queried columns
-- Audit: CRITICAL 1 — Missing Database Indexes

-- Agents
CREATE INDEX idx_agents_user_id ON agents (user_id);

-- Hosts
CREATE INDEX idx_hosts_user_id ON hosts (user_id);
CREATE INDEX idx_hosts_status ON hosts (status);

-- Subscriptions
CREATE UNIQUE INDEX idx_subs_stripe_sub_id ON subscriptions (stripe_subscription_id);
CREATE INDEX idx_subs_user_id ON subscriptions (user_id);
CREATE INDEX idx_subs_host_id ON subscriptions (host_id);

-- Host API Keys
CREATE INDEX idx_api_keys_hash ON host_api_keys (key_hash);
CREATE INDEX idx_api_keys_host_revoked ON host_api_keys (host_id, revoked_at);

-- Host Heartbeats
CREATE INDEX idx_heartbeats_host_created ON host_heartbeats (host_id, created_at);

-- Agents unique name per user
CREATE UNIQUE INDEX idx_agents_user_name ON agents (user_id, name);
