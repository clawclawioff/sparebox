import { pgTable, foreignKey, uuid, integer, text, timestamp, index, uniqueIndex, boolean, unique, jsonb, real, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const agentStatus = pgEnum("agent_status", ['pending', 'deploying', 'running', 'stopped', 'failed', 'deleted'])
export const hostStatus = pgEnum("host_status", ['pending', 'active', 'inactive', 'suspended'])
export const subscriptionStatus = pgEnum("subscription_status", ['active', 'past_due', 'canceled', 'trialing'])
export const userRole = pgEnum("user_role", ['host', 'user', 'admin', 'default', 'deployer'])


export const payouts = pgTable("payouts", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	hostId: uuid("host_id").notNull(),
	amount: integer().notNull(),
	stripeTransferId: text("stripe_transfer_id"),
	status: text().default('pending').notNull(),
	periodStart: timestamp("period_start", { mode: 'string' }).notNull(),
	periodEnd: timestamp("period_end", { mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.hostId],
			foreignColumns: [hosts.id],
			name: "payouts_host_id_hosts_id_fk"
		}).onDelete("cascade"),
]);

export const subscriptions = pgTable("subscriptions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	agentId: uuid("agent_id").notNull(),
	hostId: uuid("host_id").notNull(),
	status: subscriptionStatus().default('active').notNull(),
	stripeSubscriptionId: text("stripe_subscription_id"),
	stripePriceId: text("stripe_price_id"),
	pricePerMonth: integer("price_per_month").notNull(),
	hostPayoutPerMonth: integer("host_payout_per_month").notNull(),
	platformFeePerMonth: integer("platform_fee_per_month").notNull(),
	currentPeriodStart: timestamp("current_period_start", { mode: 'string' }),
	currentPeriodEnd: timestamp("current_period_end", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	canceledAt: timestamp("canceled_at", { mode: 'string' }),
	tier: text(),
}, (table) => [
	index("idx_subs_host_id").using("btree", table.hostId.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("idx_subs_stripe_sub_id").using("btree", table.stripeSubscriptionId.asc().nullsLast().op("text_ops")),
	index("idx_subs_user_id").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	index("subs_host_id_idx").using("btree", table.hostId.asc().nullsLast().op("uuid_ops")),
	index("subs_stripe_id_idx").using("btree", table.stripeSubscriptionId.asc().nullsLast().op("text_ops")),
	index("subs_user_id_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.agentId],
			foreignColumns: [agents.id],
			name: "subscriptions_agent_id_agents_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.hostId],
			foreignColumns: [hosts.id],
			name: "subscriptions_host_id_hosts_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "subscriptions_user_id_user_id_fk"
		}).onDelete("cascade"),
]);

export const agentIntegrations = pgTable("agent_integrations", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	agentId: uuid("agent_id").notNull(),
	integrationId: text("integration_id").notNull(),
	enabled: boolean().default(true).notNull(),
	credentials: text().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("agent_integrations_agent_id_integration_id_idx").using("btree", table.agentId.asc().nullsLast().op("text_ops"), table.integrationId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.agentId],
			foreignColumns: [agents.id],
			name: "agent_integrations_agent_id_agents_id_fk"
		}).onDelete("cascade"),
]);

export const agentWorkspaceFiles = pgTable("agent_workspace_files", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	agentId: uuid("agent_id").notNull(),
	filename: text().notNull(),
	content: text().default(').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("agent_workspace_files_agent_id_filename_idx").using("btree", table.agentId.asc().nullsLast().op("text_ops"), table.filename.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.agentId],
			foreignColumns: [agents.id],
			name: "agent_workspace_files_agent_id_agents_id_fk"
		}).onDelete("cascade"),
]);

export const verification = pgTable("verification", {
	id: text().primaryKey().notNull(),
	identifier: text().notNull(),
	value: text().notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const user = pgTable("user", {
	id: text().primaryKey().notNull(),
	email: text().notNull(),
	emailVerified: boolean("email_verified").default(false).notNull(),
	name: text(),
	image: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	role: userRole().default('user').notNull(),
	stripeCustomerId: text("stripe_customer_id"),
	stripeConnectAccountId: text("stripe_connect_account_id"),
}, (table) => [
	unique("user_email_unique").on(table.email),
]);

export const session = pgTable("session", {
	id: text().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	token: text().notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "session_user_id_user_id_fk"
		}).onDelete("cascade"),
	unique("session_token_unique").on(table.token),
]);

export const account = pgTable("account", {
	id: text().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	accountId: text("account_id").notNull(),
	providerId: text("provider_id").notNull(),
	accessToken: text("access_token"),
	refreshToken: text("refresh_token"),
	accessTokenExpiresAt: timestamp("access_token_expires_at", { mode: 'string' }),
	refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { mode: 'string' }),
	scope: text(),
	password: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	idToken: text("id_token"),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "account_user_id_user_id_fk"
		}).onDelete("cascade"),
]);

export const agentCommands = pgTable("agent_commands", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	agentId: uuid("agent_id").notNull(),
	hostId: uuid("host_id").notNull(),
	type: text().notNull(),
	payload: jsonb(),
	status: text().default('pending').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	sentAt: timestamp("sent_at", { mode: 'string' }),
	ackedAt: timestamp("acked_at", { mode: 'string' }),
	error: text(),
}, (table) => [
	index("idx_agent_commands_agent").using("btree", table.agentId.asc().nullsLast().op("uuid_ops")),
	index("idx_agent_commands_host_pending").using("btree", table.hostId.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("text_ops")).where(sql`(status = 'pending'::text)`),
	foreignKey({
			columns: [table.agentId],
			foreignColumns: [agents.id],
			name: "agent_commands_agent_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.hostId],
			foreignColumns: [hosts.id],
			name: "agent_commands_host_id_fkey"
		}).onDelete("cascade"),
]);

export const agents = pgTable("agents", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	hostId: uuid("host_id"),
	name: text().notNull(),
	status: agentStatus().default('pending').notNull(),
	config: jsonb().default({}),
	lastActive: timestamp("last_active", { mode: 'string' }),
	totalUptime: integer("total_uptime").default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	openclawVersion: text("openclaw_version").default('latest'),
	tier: text().default('standard').notNull(),
	workspaceFiles: jsonb("workspace_files").default({}),
	encryptedApiKey: text("encrypted_api_key"),
	containerId: text("container_id"),
	isolationMode: text("isolation_mode").default('docker'),
	gatewayToken: text("gateway_token"),
	containerPort: integer("container_port"),
	settings: jsonb().default({}),
	deployStage: text("deploy_stage"),
	deployProgress: integer("deploy_progress"),
	llmProvider: text("llm_provider"),
	llmModel: text("llm_model"),
}, (table) => [
	index("agents_container_port_idx").using("btree", table.containerPort.asc().nullsLast().op("int4_ops")).where(sql`(container_port IS NOT NULL)`),
	index("agents_user_id_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	uniqueIndex("agents_user_name_idx").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.name.asc().nullsLast().op("text_ops")),
	index("idx_agents_user_id").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	uniqueIndex("idx_agents_user_name").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.name.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.hostId],
			foreignColumns: [hosts.id],
			name: "agents_host_id_hosts_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "agents_user_id_user_id_fk"
		}).onDelete("cascade"),
]);

export const hosts = pgTable("hosts", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	name: text().notNull(),
	description: text(),
	status: hostStatus().default('pending').notNull(),
	cpuCores: integer("cpu_cores"),
	ramGb: integer("ram_gb"),
	storageGb: integer("storage_gb"),
	osInfo: text("os_info"),
	region: text(),
	country: text(),
	city: text(),
	pricePerMonth: integer("price_per_month").default(1000).notNull(),
	tailscaleIp: text("tailscale_ip"),
	lastHeartbeat: timestamp("last_heartbeat", { mode: 'string' }),
	uptimePercent: real("uptime_percent").default(100),
	totalEarnings: integer("total_earnings").default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	daemonVersion: text("daemon_version"),
	nodeVersion: text("node_version"),
	publicIp: text("public_ip"),
	specsVerified: boolean("specs_verified").default(false),
	verifiedCpuCores: integer("verified_cpu_cores"),
	verifiedRamGb: integer("verified_ram_gb"),
	verifiedOsInfo: text("verified_os_info"),
	verifiedAt: timestamp("verified_at", { mode: 'string' }),
	priceLite: integer("price_lite"),
	priceStandard: integer("price_standard"),
	pricePro: integer("price_pro"),
	priceCompute: integer("price_compute"),
	maxAgents: integer("max_agents"),
	isolationMode: text("isolation_mode").default('unknown'),
	openclawVersion: text("openclaw_version"),
	gpuModel: text("gpu_model"),
	gpuVramGb: real("gpu_vram_gb"),
	dockerVersion: text("docker_version"),
	arch: text(),
	allocatedRamMb: integer("allocated_ram_mb").default(0),
	allocatedCpuCores: real("allocated_cpu_cores").default(0),
	allocatedDiskGb: integer("allocated_disk_gb").default(0),
	canAcceptAgents: boolean("can_accept_agents").default(true),
}, (table) => [
	index("hosts_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	index("hosts_user_id_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	index("idx_hosts_status").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	index("idx_hosts_user_id").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "hosts_user_id_user_id_fk"
		}).onDelete("cascade"),
]);

export const hostHeartbeats = pgTable("host_heartbeats", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	hostId: uuid("host_id").notNull(),
	cpuUsage: real("cpu_usage"),
	ramUsage: real("ram_usage"),
	diskUsage: real("disk_usage"),
	agentCount: integer("agent_count").default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_heartbeats_host_created").using("btree", table.hostId.asc().nullsLast().op("timestamp_ops"), table.createdAt.asc().nullsLast().op("timestamp_ops")),
	foreignKey({
			columns: [table.hostId],
			foreignColumns: [hosts.id],
			name: "host_heartbeats_host_id_hosts_id_fk"
		}).onDelete("cascade"),
]);

export const userPreferences = pgTable("user_preferences", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	emailSecurityAlerts: boolean("email_security_alerts").default(true),
	emailAccountUpdates: boolean("email_account_updates").default(true),
	emailAgentStatus: boolean("email_agent_status").default(true),
	emailBillingAlerts: boolean("email_billing_alerts").default(true),
	emailNewDeployments: boolean("email_new_deployments").default(true),
	emailMachineOffline: boolean("email_machine_offline").default(true),
	emailPayouts: boolean("email_payouts").default(true),
	emailProductUpdates: boolean("email_product_updates").default(false),
	emailTips: boolean("email_tips").default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "user_preferences_user_id_user_id_fk"
		}).onDelete("cascade"),
	unique("user_preferences_user_id_unique").on(table.userId),
]);

export const waitlist = pgTable("waitlist", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	email: text().notNull(),
	role: text(),
	source: text().default('landing'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("waitlist_email_idx").using("btree", table.email.asc().nullsLast().op("text_ops")),
	unique("waitlist_email_key").on(table.email),
]);

export const agentSecrets = pgTable("agent_secrets", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	agentId: uuid("agent_id").notNull(),
	key: text().notNull(),
	encryptedValue: text("encrypted_value").notNull(),
	label: text(),
	category: text().default('tool'),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_agent_secrets_agent").using("btree", table.agentId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.agentId],
			foreignColumns: [agents.id],
			name: "agent_secrets_agent_id_fkey"
		}).onDelete("cascade"),
	unique("agent_secrets_agent_id_key_key").on(table.agentId, table.key),
]);

export const agentLogs = pgTable("agent_logs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	agentId: uuid("agent_id").notNull(),
	timestamp: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	level: text().default('info'),
	message: text().notNull(),
	source: text().default('container'),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_agent_logs_agent_ts").using("btree", table.agentId.asc().nullsLast().op("timestamptz_ops"), table.timestamp.desc().nullsFirst().op("timestamptz_ops")),
	foreignKey({
			columns: [table.agentId],
			foreignColumns: [agents.id],
			name: "agent_logs_agent_id_fkey"
		}).onDelete("cascade"),
]);

export const agentMessages = pgTable("agent_messages", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	agentId: uuid("agent_id").notNull(),
	role: text().default('user').notNull(),
	content: text().notNull(),
	status: text().default('pending').notNull(),
	deliveredAt: timestamp("delivered_at", { mode: 'string' }),
	respondedAt: timestamp("responded_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_agent_messages_agent_id").using("btree", table.agentId.asc().nullsLast().op("uuid_ops")),
	index("idx_agent_messages_created").using("btree", table.agentId.asc().nullsLast().op("timestamp_ops"), table.createdAt.desc().nullsFirst().op("uuid_ops")),
	index("idx_agent_messages_status").using("btree", table.agentId.asc().nullsLast().op("uuid_ops"), table.status.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.agentId],
			foreignColumns: [agents.id],
			name: "agent_messages_agent_id_fkey"
		}).onDelete("cascade"),
]);

export const hostApiKeys = pgTable("host_api_keys", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	hostId: uuid("host_id").notNull(),
	keyHash: text("key_hash").notNull(),
	keyPrefix: text("key_prefix").notNull(),
	keySuffix: text("key_suffix").notNull(),
	name: text().default('default'),
	lastUsedAt: timestamp("last_used_at", { withTimezone: true, mode: 'string' }),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }),
	revokedAt: timestamp("revoked_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_api_keys_hash").using("btree", table.keyHash.asc().nullsLast().op("text_ops")),
	index("idx_api_keys_host_revoked").using("btree", table.hostId.asc().nullsLast().op("uuid_ops"), table.revokedAt.asc().nullsLast().op("timestamptz_ops")),
	index("idx_host_api_keys_hash").using("btree", table.keyHash.asc().nullsLast().op("text_ops")),
	index("idx_host_api_keys_host").using("btree", table.hostId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.hostId],
			foreignColumns: [hosts.id],
			name: "host_api_keys_host_id_fkey"
		}).onDelete("cascade"),
]);
