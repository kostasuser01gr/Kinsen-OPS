import { z } from "zod";
import { registerTool } from "./registry";
import type { ToolContext } from "./types";

registerTool(
  {
    name: "fleet.list",
    displayName: "List Vehicles",
    description: "Show fleet vehicles with optional filters",
    category: "fleet",
    requiredPermission: "fleet:read",
    isWriteAction: false,
    inputSchema: z.object({
      status: z.string().optional(),
      search: z.string().optional(),
    }) as z.ZodType<Record<string, unknown>>,
    execute: async (input: Record<string, unknown>, ctx: ToolContext) => {
      const where: Record<string, unknown> = { isActive: true };
      if (input.status) where.status = input.status;
      if (input.search) {
        where.OR = [
          { plate: { contains: input.search as string, mode: "insensitive" } },
          { make: { contains: input.search as string, mode: "insensitive" } },
          { model: { contains: input.search as string, mode: "insensitive" } },
        ];
      }
      if (ctx.branchId) where.branchId = ctx.branchId;

      const vehicles = await ctx.db.vehicle.findMany({
        where: where as never,
        include: { branch: { select: { name: true, code: true } } },
        take: 20,
        orderBy: { updatedAt: "desc" },
      });

      return {
        success: true,
        data: vehicles.map((v) => ({
          id: v.id,
          plate: v.plate,
          make: v.make,
          model: v.model,
          year: v.year,
          status: v.status,
          branch: v.branch.code,
          mileage: v.mileage,
          fuelLevel: v.fuelLevel,
        })),
        displayMode: "table" as const,
        title: `Fleet — ${vehicles.length} vehicle${vehicles.length !== 1 ? "s" : ""}`,
      };
    },
  },
  { command: "fleet", description: "List fleet vehicles", usage: "/fleet [status] [search=...]" }
);

registerTool(
  {
    name: "fleet.stats",
    displayName: "Fleet Summary",
    description: "Fleet status breakdown",
    category: "fleet",
    requiredPermission: "fleet:read",
    isWriteAction: false,
    inputSchema: z.object({}) as z.ZodType<Record<string, unknown>>,
    execute: async (_input: Record<string, unknown>, ctx: ToolContext) => {
      const where: Record<string, unknown> = { isActive: true };
      if (ctx.branchId) where.branchId = ctx.branchId;

      const vehicles = await ctx.db.vehicle.findMany({ where: where as never, select: { status: true } });
      const counts: Record<string, number> = {};
      vehicles.forEach((v) => {
        counts[v.status] = (counts[v.status] || 0) + 1;
      });

      return {
        success: true,
        data: { total: vehicles.length, byStatus: counts },
        displayMode: "stat" as const,
        title: `Fleet Summary — ${vehicles.length} total`,
      };
    },
  },
  { command: "fleet-stats", description: "Fleet status summary", usage: "/fleet-stats" }
);

registerTool(
  {
    name: "task.list",
    displayName: "List Tasks",
    description: "Show tasks with optional priority/status filter",
    category: "task",
    requiredPermission: "task:read",
    isWriteAction: false,
    inputSchema: z.object({
      status: z.string().optional(),
      priority: z.string().optional(),
    }) as z.ZodType<Record<string, unknown>>,
    execute: async (input: Record<string, unknown>, ctx: ToolContext) => {
      const where: Record<string, unknown> = {};
      if (input.status) where.status = (input.status as string).toUpperCase();
      if (input.priority) where.priority = (input.priority as string).toUpperCase();
      if (input.arg0) {
        const val = (input.arg0 as string).toUpperCase();
        if (["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED", "BLOCKED"].includes(val)) {
          where.status = val;
        } else if (["LOW", "MEDIUM", "HIGH", "URGENT"].includes(val)) {
          where.priority = val;
        }
      }
      if (ctx.branchId) where.branchId = ctx.branchId;

      const tasks = await ctx.db.task.findMany({
        where: where as never,
        include: {
          assignee: { select: { name: true, identifier: true } },
          branch: { select: { code: true } },
        },
        take: 20,
        orderBy: [{ priority: "desc" }, { dueAt: "asc" }],
      });

      return {
        success: true,
        data: tasks.map((t) => ({
          id: t.id,
          title: t.title,
          type: t.type,
          status: t.status,
          priority: t.priority,
          assignee: t.assignee?.name || "Unassigned",
          branch: t.branch.code,
          dueAt: t.dueAt?.toISOString(),
        })),
        displayMode: "table" as const,
        title: `Tasks — ${tasks.length} found`,
      };
    },
  },
  { command: "tasks", description: "List tasks", usage: "/tasks [status|priority]" }
);

registerTool(
  {
    name: "incident.list",
    displayName: "List Incidents",
    description: "Show open incidents",
    category: "incident",
    requiredPermission: "incident:read",
    isWriteAction: false,
    inputSchema: z.object({
      severity: z.string().optional(),
    }) as z.ZodType<Record<string, unknown>>,
    execute: async (input: Record<string, unknown>, ctx: ToolContext) => {
      const where: Record<string, unknown> = {
        status: { notIn: ["CLOSED"] },
      };
      if (input.severity) where.severity = (input.severity as string).toUpperCase();
      if (input.arg0) where.severity = (input.arg0 as string).toUpperCase();
      if (ctx.branchId) where.branchId = ctx.branchId;

      const incidents = await ctx.db.incident.findMany({
        where: where as never,
        include: {
          vehicle: { select: { plate: true, make: true, model: true } },
          branch: { select: { code: true } },
          reportedBy: { select: { name: true } },
        },
        take: 20,
        orderBy: { createdAt: "desc" },
      });

      return {
        success: true,
        data: incidents.map((i) => ({
          id: i.id,
          vehicle: `${i.vehicle.plate} (${i.vehicle.make} ${i.vehicle.model})`,
          severity: i.severity,
          status: i.status,
          description: i.description.slice(0, 80),
          branch: i.branch.code,
          reportedBy: i.reportedBy.name,
        })),
        displayMode: "table" as const,
        title: `Incidents — ${incidents.length} open`,
      };
    },
  },
  { command: "incidents", description: "List open incidents", usage: "/incidents [severity]" }
);

registerTool(
  {
    name: "finance.summary",
    displayName: "Finance Summary",
    description: "Revenue and payment overview",
    category: "finance",
    requiredPermission: "finance:read",
    isWriteAction: false,
    inputSchema: z.object({}) as z.ZodType<Record<string, unknown>>,
    execute: async (_input: Record<string, unknown>, ctx: ToolContext) => {
      const payments = await ctx.db.payment.findMany({
        where: { status: "PAID" },
        select: { amount: true, type: true },
      });

      let totalRevenue = 0;
      let totalDeposits = 0;
      let count = 0;
      payments.forEach((p) => {
        const amt = Number(p.amount);
        if (p.type === "DEPOSIT" || p.type === "DEPOSIT_REFUND") {
          totalDeposits += amt;
        } else {
          totalRevenue += amt;
        }
        count++;
      });

      const pending = await ctx.db.payment.count({ where: { status: "PENDING" } });

      return {
        success: true,
        data: {
          totalRevenue: totalRevenue.toFixed(2),
          totalDeposits: totalDeposits.toFixed(2),
          paidCount: count,
          pendingCount: pending,
        },
        displayMode: "stat" as const,
        title: "Finance Summary",
      };
    },
  },
  { command: "finance", description: "Finance overview", usage: "/finance" }
);

registerTool(
  {
    name: "rentals.active",
    displayName: "Active Rentals",
    description: "Show currently active rentals",
    category: "rental",
    requiredPermission: "rental:read",
    isWriteAction: false,
    inputSchema: z.object({}) as z.ZodType<Record<string, unknown>>,
    execute: async (_input: Record<string, unknown>, ctx: ToolContext) => {
      const where: Record<string, unknown> = { status: "ACTIVE" };
      if (ctx.branchId) where.branchOutId = ctx.branchId;

      const rentals = await ctx.db.rental.findMany({
        where: where as never,
        include: {
          customer: { select: { firstName: true, lastName: true } },
          vehicle: { select: { plate: true, make: true, model: true } },
          branchOut: { select: { code: true } },
        },
        take: 20,
        orderBy: { pickupTime: "desc" },
      });

      return {
        success: true,
        data: rentals.map((r) => ({
          id: r.id,
          contract: r.contractNumber.slice(0, 8),
          customer: `${r.customer.firstName} ${r.customer.lastName}`,
          vehicle: `${r.vehicle.plate} (${r.vehicle.make} ${r.vehicle.model})`,
          branch: r.branchOut.code,
          pickup: r.pickupTime.toISOString().slice(0, 10),
          returnDue: r.returnTime?.toISOString().slice(0, 10) || "—",
          paymentStatus: r.paymentStatus,
        })),
        displayMode: "table" as const,
        title: `Active Rentals — ${rentals.length}`,
      };
    },
  },
  { command: "rentals", description: "Active rentals", usage: "/rentals" }
);
