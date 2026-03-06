import { relations } from "drizzle-orm/relations";
import { hosts, payouts, agents, subscriptions, user, agentIntegrations, agentWorkspaceFiles, session, account, agentCommands, hostHeartbeats, userPreferences, agentSecrets, agentLogs, agentMessages, hostApiKeys } from "./schema";

export const payoutsRelations = relations(payouts, ({one}) => ({
	host: one(hosts, {
		fields: [payouts.hostId],
		references: [hosts.id]
	}),
}));

export const hostsRelations = relations(hosts, ({one, many}) => ({
	payouts: many(payouts),
	subscriptions: many(subscriptions),
	agentCommands: many(agentCommands),
	agents: many(agents),
	user: one(user, {
		fields: [hosts.userId],
		references: [user.id]
	}),
	hostHeartbeats: many(hostHeartbeats),
	hostApiKeys: many(hostApiKeys),
}));

export const subscriptionsRelations = relations(subscriptions, ({one}) => ({
	agent: one(agents, {
		fields: [subscriptions.agentId],
		references: [agents.id]
	}),
	host: one(hosts, {
		fields: [subscriptions.hostId],
		references: [hosts.id]
	}),
	user: one(user, {
		fields: [subscriptions.userId],
		references: [user.id]
	}),
}));

export const agentsRelations = relations(agents, ({one, many}) => ({
	subscriptions: many(subscriptions),
	agentIntegrations: many(agentIntegrations),
	agentWorkspaceFiles: many(agentWorkspaceFiles),
	agentCommands: many(agentCommands),
	host: one(hosts, {
		fields: [agents.hostId],
		references: [hosts.id]
	}),
	user: one(user, {
		fields: [agents.userId],
		references: [user.id]
	}),
	agentSecrets: many(agentSecrets),
	agentLogs: many(agentLogs),
	agentMessages: many(agentMessages),
}));

export const userRelations = relations(user, ({many}) => ({
	subscriptions: many(subscriptions),
	sessions: many(session),
	accounts: many(account),
	agents: many(agents),
	hosts: many(hosts),
	userPreferences: many(userPreferences),
}));

export const agentIntegrationsRelations = relations(agentIntegrations, ({one}) => ({
	agent: one(agents, {
		fields: [agentIntegrations.agentId],
		references: [agents.id]
	}),
}));

export const agentWorkspaceFilesRelations = relations(agentWorkspaceFiles, ({one}) => ({
	agent: one(agents, {
		fields: [agentWorkspaceFiles.agentId],
		references: [agents.id]
	}),
}));

export const sessionRelations = relations(session, ({one}) => ({
	user: one(user, {
		fields: [session.userId],
		references: [user.id]
	}),
}));

export const accountRelations = relations(account, ({one}) => ({
	user: one(user, {
		fields: [account.userId],
		references: [user.id]
	}),
}));

export const agentCommandsRelations = relations(agentCommands, ({one}) => ({
	agent: one(agents, {
		fields: [agentCommands.agentId],
		references: [agents.id]
	}),
	host: one(hosts, {
		fields: [agentCommands.hostId],
		references: [hosts.id]
	}),
}));

export const hostHeartbeatsRelations = relations(hostHeartbeats, ({one}) => ({
	host: one(hosts, {
		fields: [hostHeartbeats.hostId],
		references: [hosts.id]
	}),
}));

export const userPreferencesRelations = relations(userPreferences, ({one}) => ({
	user: one(user, {
		fields: [userPreferences.userId],
		references: [user.id]
	}),
}));

export const agentSecretsRelations = relations(agentSecrets, ({one}) => ({
	agent: one(agents, {
		fields: [agentSecrets.agentId],
		references: [agents.id]
	}),
}));

export const agentLogsRelations = relations(agentLogs, ({one}) => ({
	agent: one(agents, {
		fields: [agentLogs.agentId],
		references: [agents.id]
	}),
}));

export const agentMessagesRelations = relations(agentMessages, ({one}) => ({
	agent: one(agents, {
		fields: [agentMessages.agentId],
		references: [agents.id]
	}),
}));

export const hostApiKeysRelations = relations(hostApiKeys, ({one}) => ({
	host: one(hosts, {
		fields: [hostApiKeys.hostId],
		references: [hosts.id]
	}),
}));