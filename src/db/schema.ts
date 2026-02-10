import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  real,
  uuid,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Enums
export const userRoleEnum = pgEnum("user_role", ["default", "host", "deployer", "admin"]);
export const hostStatusEnum = pgEnum("host_status", [
  "pending",
  "active",
  "inactive",
  "suspended",
]);
export const agentStatusEnum = pgEnum("agent_status", [
  "pending",
  "deploying",
  "running",
  "stopped",
  "failed",
]);
export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "past_due",
  "canceled",
  "trialing",
]);

// ============================================
// BETTER-AUTH REQUIRED TABLES
// ============================================

// User table (required by better-auth - singular name!)
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  name: text("name"),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  // Custom fields for Sparebox
  role: userRoleEnum("role").notNull().default("default"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeConnectAccountId: text("stripe_connect_account_id"),
});

// Session table (required by better-auth)
export const session = pgTable("session", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Account table (required by better-auth for OAuth)
export const account = pgTable("account", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  idToken: text("id_token"),
  password: text("password"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Verification table (required by better-auth for email verification)
export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============================================
// SPAREBOX BUSINESS TABLES
// ============================================

// Hosts (machines that can run agents)
export const hosts = pgTable("hosts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  status: hostStatusEnum("status").notNull().default("pending"),

  // Hardware specs
  cpuCores: integer("cpu_cores"),
  ramGb: integer("ram_gb"),
  storageGb: integer("storage_gb"),
  osInfo: text("os_info"),

  // Location (for latency matching)
  region: text("region"),
  country: text("country"),
  city: text("city"),

  // Pricing (cents per month)
  pricePerMonth: integer("price_per_month").notNull().default(1000),

  // Networking
  tailscaleIp: text("tailscale_ip"),
  publicIp: text("public_ip"),
  lastHeartbeat: timestamp("last_heartbeat"),

  // Daemon info
  daemonVersion: text("daemon_version"),
  nodeVersion: text("node_version"),

  // Stats
  uptimePercent: real("uptime_percent").default(100),
  totalEarnings: integer("total_earnings").default(0),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Agents (deployed AI agent instances)
export const agents = pgTable("agents", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  hostId: uuid("host_id").references(() => hosts.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  status: agentStatusEnum("status").notNull().default("pending"),
  config: text("config"),
  openclawVersion: text("openclaw_version").default("latest"),
  lastActive: timestamp("last_active"),
  totalUptime: integer("total_uptime").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Subscriptions
export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  agentId: uuid("agent_id")
    .notNull()
    .references(() => agents.id, { onDelete: "cascade" }),
  hostId: uuid("host_id")
    .notNull()
    .references(() => hosts.id, { onDelete: "cascade" }),
  status: subscriptionStatusEnum("status").notNull().default("active"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  stripePriceId: text("stripe_price_id"),
  pricePerMonth: integer("price_per_month").notNull(),
  hostPayoutPerMonth: integer("host_payout_per_month").notNull(),
  platformFeePerMonth: integer("platform_fee_per_month").notNull(),
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  canceledAt: timestamp("canceled_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Payouts
export const payouts = pgTable("payouts", {
  id: uuid("id").defaultRandom().primaryKey(),
  hostId: uuid("host_id")
    .notNull()
    .references(() => hosts.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(),
  stripeTransferId: text("stripe_transfer_id"),
  status: text("status").notNull().default("pending"),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Host Heartbeats (for monitoring)
export const hostHeartbeats = pgTable("host_heartbeats", {
  id: uuid("id").defaultRandom().primaryKey(),
  hostId: uuid("host_id")
    .notNull()
    .references(() => hosts.id, { onDelete: "cascade" }),
  cpuUsage: real("cpu_usage"),
  ramUsage: real("ram_usage"),
  diskUsage: real("disk_usage"),
  agentCount: integer("agent_count").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Host API Keys (for daemon authentication)
export const hostApiKeys = pgTable("host_api_keys", {
  id: uuid("id").defaultRandom().primaryKey(),
  hostId: uuid("host_id")
    .notNull()
    .references(() => hosts.id, { onDelete: "cascade" }),
  keyHash: text("key_hash").notNull(),
  keyPrefix: text("key_prefix").notNull(), // First 8 chars for identification
  keySuffix: text("key_suffix").notNull(), // Last 4 chars for display
  name: text("name").default("default"),
  lastUsedAt: timestamp("last_used_at"),
  expiresAt: timestamp("expires_at"),
  revokedAt: timestamp("revoked_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// User Preferences (notification settings)
export const userPreferences = pgTable("user_preferences", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  // Notifications
  emailSecurityAlerts: boolean("email_security_alerts").default(true),
  emailAccountUpdates: boolean("email_account_updates").default(true),
  emailAgentStatus: boolean("email_agent_status").default(true),
  emailBillingAlerts: boolean("email_billing_alerts").default(true),
  emailNewDeployments: boolean("email_new_deployments").default(true),
  emailMachineOffline: boolean("email_machine_offline").default(true),
  emailPayouts: boolean("email_payouts").default(true),
  emailProductUpdates: boolean("email_product_updates").default(false),
  emailTips: boolean("email_tips").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Waitlist (email capture for early access)
export const waitlist = pgTable("waitlist", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  role: text("role"), // "host" or "deployer" — optional
  source: text("source").default("landing"), // where they signed up from
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ============================================
// RELATIONS
// ============================================

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  hosts: many(hosts),
  agents: many(agents),
  subscriptions: many(subscriptions),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}));

export const hostsRelations = relations(hosts, ({ one, many }) => ({
  user: one(user, { fields: [hosts.userId], references: [user.id] }),
  agents: many(agents),
  subscriptions: many(subscriptions),
  payouts: many(payouts),
  apiKeys: many(hostApiKeys),
}));

export const agentsRelations = relations(agents, ({ one, many }) => ({
  user: one(user, { fields: [agents.userId], references: [user.id] }),
  host: one(hosts, { fields: [agents.hostId], references: [hosts.id] }),
  subscriptions: many(subscriptions),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(user, { fields: [subscriptions.userId], references: [user.id] }),
  agent: one(agents, { fields: [subscriptions.agentId], references: [agents.id] }),
  host: one(hosts, { fields: [subscriptions.hostId], references: [hosts.id] }),
}));

export const payoutsRelations = relations(payouts, ({ one }) => ({
  host: one(hosts, { fields: [payouts.hostId], references: [hosts.id] }),
}));

export const hostHeartbeatsRelations = relations(hostHeartbeats, ({ one }) => ({
  host: one(hosts, { fields: [hostHeartbeats.hostId], references: [hosts.id] }),
}));

export const hostApiKeysRelations = relations(hostApiKeys, ({ one }) => ({
  host: one(hosts, { fields: [hostApiKeys.hostId], references: [hosts.id] }),
}));

export const userPreferencesRelations = relations(userPreferences, ({ one }) => ({
  user: one(user, { fields: [userPreferences.userId], references: [user.id] }),
}));
