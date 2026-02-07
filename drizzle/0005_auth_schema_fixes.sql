-- Add id_token column for Google OAuth (better-auth v1.4+ requires it)
ALTER TABLE "account" ADD COLUMN IF NOT EXISTS "id_token" TEXT;
