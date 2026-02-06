import { router } from "./trpc";
import { hostsRouter } from "./routers/hosts";
import { agentsRouter } from "./routers/agents";
import { usersRouter } from "./routers/users";
import { waitlistRouter } from "./routers/waitlist";

export const appRouter = router({
  hosts: hostsRouter,
  agents: agentsRouter,
  users: usersRouter,
  waitlist: waitlistRouter,
});

export type AppRouter = typeof appRouter;
