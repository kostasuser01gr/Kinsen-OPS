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
import { workspaceRouter } from "@/server/routers/workspace";
import { toolExecRouter } from "@/server/routers/tool-exec";
import { shortcutRouter } from "@/server/routers/shortcuts";

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
  workspace: workspaceRouter,
  toolExec: toolExecRouter,
  shortcut: shortcutRouter,
});

export type AppRouter = typeof appRouter;
