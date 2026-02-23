import { router } from "@/server/trpc";
import { fleetRouter } from "@/server/routers/fleet";
import { rentalRouter } from "@/server/routers/rental";
import { taskRouter } from "@/server/routers/task";
import { financeRouter } from "@/server/routers/finance";
import { incidentRouter } from "@/server/routers/incident";
import { chatRouter } from "@/server/routers/chat";
import { analyticsRouter } from "@/server/routers/analytics";
import { auditRouter } from "@/server/routers/audit";
import { branchRouter } from "@/server/routers/branch";

export const appRouter = router({
  fleet: fleetRouter,
  rental: rentalRouter,
  task: taskRouter,
  finance: financeRouter,
  incident: incidentRouter,
  chat: chatRouter,
  analytics: analyticsRouter,
  audit: auditRouter,
  branch: branchRouter,
});

export type AppRouter = typeof appRouter;
