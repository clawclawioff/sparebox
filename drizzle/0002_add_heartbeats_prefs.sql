CREATE TABLE "host_heartbeats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"host_id" uuid NOT NULL,
	"cpu_usage" real,
	"ram_usage" real,
	"disk_usage" real,
	"agent_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"email_security_alerts" boolean DEFAULT true,
	"email_account_updates" boolean DEFAULT true,
	"email_agent_status" boolean DEFAULT true,
	"email_billing_alerts" boolean DEFAULT true,
	"email_new_deployments" boolean DEFAULT true,
	"email_machine_offline" boolean DEFAULT true,
	"email_payouts" boolean DEFAULT true,
	"email_product_updates" boolean DEFAULT false,
	"email_tips" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "openclaw_version" text DEFAULT 'latest';--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "canceled_at" timestamp;--> statement-breakpoint
ALTER TABLE "host_heartbeats" ADD CONSTRAINT "host_heartbeats_host_id_hosts_id_fk" FOREIGN KEY ("host_id") REFERENCES "public"."hosts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;