import { router } from "./trpc";
import { hostsRouter } from "./routers/hosts";
import { agentsRouter } from "./routers/agents";
import { usersRouter } from "./routers/users";
import { waitlistRouter } from "./routers/waitlist";
import { preferencesRouter } from "./routers/preferences";
import { billingRouter } from "./routers/billing";
import { connectRouter } from "./routers/connect";
import { messagesRouter } from "./routers/messages";
import { adminRouter } from "./routers/admin";
import { secretsRouter } from "./routers/secrets";
import { logsRouter } from "./routers/logs";
import { agentSettingsRouter } from "./routers/agentSettings";

export const appRouter = router({
  hosts: hostsRouter,
  agents: agentsRouter,
  users: usersRouter,
  waitlist: waitlistRouter,
  preferences: preferencesRouter,
  billing: billingRouter,
  connect: connectRouter,
  messages: messagesRouter,
  admin: adminRouter,
  secrets: secretsRouter,
  logs: logsRouter,
  agentSettings: agentSettingsRouter,
});

export type AppRouter = typeof appRouter;
