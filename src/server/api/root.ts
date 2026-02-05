import { router } from "./trpc";
import { hostsRouter } from "./routers/hosts";
import { agentsRouter } from "./routers/agents";

export const appRouter = router({
  hosts: hostsRouter,
  agents: agentsRouter,
});

export type AppRouter = typeof appRouter;
