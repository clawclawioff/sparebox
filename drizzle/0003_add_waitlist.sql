CREATE TABLE IF NOT EXISTS "waitlist" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "email" text NOT NULL UNIQUE,
  "role" text,
  "source" text DEFAULT 'landing',
  "created_at" timestamp DEFAULT now() NOT NULL
);
