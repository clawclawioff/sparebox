-- Unique constraint: one agent name per user
CREATE UNIQUE INDEX IF NOT EXISTS "agents_user_name_idx" ON "agents" ("user_id", "name");

-- Performance indexes
CREATE INDEX IF NOT EXISTS "agents_user_id_idx" ON "agents" ("user_id");
CREATE INDEX IF NOT EXISTS "hosts_user_id_idx" ON "hosts" ("user_id");
CREATE INDEX IF NOT EXISTS "hosts_status_idx" ON "hosts" ("status");
CREATE INDEX IF NOT EXISTS "subs_stripe_id_idx" ON "subscriptions" ("stripe_subscription_id");
CREATE INDEX IF NOT EXISTS "subs_host_id_idx" ON "subscriptions" ("host_id");
CREATE INDEX IF NOT EXISTS "subs_user_id_idx" ON "subscriptions" ("user_id");
CREATE INDEX IF NOT EXISTS "waitlist_email_idx" ON "waitlist" ("email");
