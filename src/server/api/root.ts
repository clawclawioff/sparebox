import { router } from "./trpc";
import { hostsRouter } from "./routers/hosts";
import { agentsRouter } from "./routers/agents";
import { usersRouter } from "./routers/users";
import { waitlistRouter } from "./routers/waitlist";
import { preferencesRouter } from "./routers/preferences";
import { billingRouter } from "./routers/billing";

export const appRouter = router({
  hosts: hostsRouter,
  agents: agentsRouter,
  users: usersRouter,
  waitlist: waitlistRouter,
  preferences: preferencesRouter,
  billing: billingRouter,
});

export type AppRouter = typeof appRouter;
