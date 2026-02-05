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
export const userRoleEnum = pgEnum("user_role", ["host", "user", "admin"]);
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

// Users table (managed by better-auth, extended with our fields)
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  role: userRoleEnum("role").notNull().default("user"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeConnectAccountId: text("stripe_connect_account_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Sessions table (for better-auth)
export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Hosts (machines that can run agents)
export const hosts = pgTable("hosts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
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
  pricePerMonth: integer("price_per_month").notNull().default(1000), // $10 default

  // Networking
  tailscaleIp: text("tailscale_ip"),
  lastHeartbeat: timestamp("last_heartbeat"),

  // Stats
  uptimePercent: real("uptime_percent").default(100),
  totalEarnings: integer("total_earnings").default(0), // cents

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Agents (deployed AI agent instances)
export const agents = pgTable("agents", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  hostId: uuid("host_id").references(() => hosts.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  status: agentStatusEnum("status").notNull().default("pending"),

  // Configuration
  config: text("config"), // JSON blob of OpenClaw config

  // Stats
  lastActive: timestamp("last_active"),
  totalUptime: integer("total_uptime").default(0), // seconds

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Subscriptions (user subscriptions for agents)
export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  agentId: uuid("agent_id")
    .notNull()
    .references(() => agents.id, { onDelete: "cascade" }),
  hostId: uuid("host_id")
    .notNull()
    .references(() => hosts.id, { onDelete: "cascade" }),

  status: subscriptionStatusEnum("status").notNull().default("active"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  stripePriceId: text("stripe_price_id"),

  // Billing
  pricePerMonth: integer("price_per_month").notNull(), // cents
  hostPayoutPerMonth: integer("host_payout_per_month").notNull(), // cents (60% of price)
  platformFeePerMonth: integer("platform_fee_per_month").notNull(), // cents (40% of price)

  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Host payouts (record of payments to hosts)
export const payouts = pgTable("payouts", {
  id: uuid("id").defaultRandom().primaryKey(),
  hostId: uuid("host_id")
    .notNull()
    .references(() => hosts.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(), // cents
  stripeTransferId: text("stripe_transfer_id"),
  status: text("status").notNull().default("pending"), // pending, completed, failed
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  hosts: many(hosts),
  agents: many(agents),
  subscriptions: many(subscriptions),
  sessions: many(sessions),
}));

export const hostsRelations = relations(hosts, ({ one, many }) => ({
  user: one(users, { fields: [hosts.userId], references: [users.id] }),
  agents: many(agents),
  subscriptions: many(subscriptions),
  payouts: many(payouts),
}));

export const agentsRelations = relations(agents, ({ one, many }) => ({
  user: one(users, { fields: [agents.userId], references: [users.id] }),
  host: one(hosts, { fields: [agents.hostId], references: [hosts.id] }),
  subscriptions: many(subscriptions),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(users, { fields: [subscriptions.userId], references: [users.id] }),
  agent: one(agents, { fields: [subscriptions.agentId], references: [agents.id] }),
  host: one(hosts, { fields: [subscriptions.hostId], references: [hosts.id] }),
}));

export const payoutsRelations = relations(payouts, ({ one }) => ({
  host: one(hosts, { fields: [payouts.hostId], references: [hosts.id] }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));
