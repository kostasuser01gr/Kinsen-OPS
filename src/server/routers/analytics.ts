import { z } from "zod";
import { router, protectedProcedure, permissionProcedure } from "@/server/trpc";

export const analyticsRouter = router({
  fleetOverview: permissionProcedure("analytics:read")
    .input(z.object({ branchId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const branchFilter = input?.branchId ? { branchId: input.branchId } : {};

      const [totalVehicles, statusBreakdown, classBreakdown] = await Promise.all([
        ctx.db.vehicle.count({ where: { isActive: true, ...branchFilter } }),
        ctx.db.vehicle.groupBy({
          by: ["status"],
          where: { isActive: true, ...branchFilter },
          _count: { _all: true },
        }),
        ctx.db.vehicle.groupBy({
          by: ["class"],
          where: { isActive: true, ...branchFilter },
          _count: { _all: true },
        }),
      ]);

      const onRent = statusBreakdown.find((s) => s.status === "ON_RENT")?._count._all ?? 0;
      const available = statusBreakdown.find((s) => s.status === "AVAILABLE")?._count._all ?? 0;

      return {
        totalVehicles,
        utilization: totalVehicles > 0 ? Math.round((onRent / totalVehicles) * 100) : 0,
        readinessRate: totalVehicles > 0 ? Math.round((available / totalVehicles) * 100) : 0,
        statusBreakdown: statusBreakdown.map((s) => ({ status: s.status, count: s._count._all })),
        classBreakdown: classBreakdown.map((c) => ({ class: c.class, count: c._count._all })),
      };
    }),

  operationsKPIs: permissionProcedure("analytics:read")
    .input(z.object({ branchId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const branchFilter = input?.branchId ? { branchId: input.branchId } : {};
      const branchOutFilter = input?.branchId ? { branchOutId: input.branchId } : {};

      const [
        activeRentals,
        openTasks,
        overdueTasks,
        openIncidents,
        pendingRefunds,
        overduePayments,
      ] = await Promise.all([
        ctx.db.rental.count({ where: { status: "ACTIVE", ...branchOutFilter } }),
        ctx.db.task.count({ where: { status: { in: ["PENDING", "IN_PROGRESS"] }, ...branchFilter } }),
        ctx.db.task.count({
          where: {
            status: { in: ["PENDING", "IN_PROGRESS"] },
            dueAt: { lt: new Date() },
            ...branchFilter,
          },
        }),
        ctx.db.incident.count({ where: { status: { notIn: ["CLOSED", "RESOLVED"] }, ...branchFilter } }),
        ctx.db.payment.count({ where: { status: "REFUND_PENDING" } }),
        ctx.db.payment.count({ where: { status: "OVERDUE" } }),
      ]);

      return {
        activeRentals,
        openTasks,
        overdueTasks,
        openIncidents,
        pendingRefunds,
        overduePayments,
      };
    }),

  branchComparison: permissionProcedure("analytics:branch_compare").query(async ({ ctx }) => {
    const branches = await ctx.db.branch.findMany({ where: { isActive: true } });

    const comparison = await Promise.all(
      branches.map(async (branch) => {
        const [vehicles, onRent, openTasks, openIncidents] = await Promise.all([
          ctx.db.vehicle.count({ where: { branchId: branch.id, isActive: true } }),
          ctx.db.vehicle.count({ where: { branchId: branch.id, status: "ON_RENT" } }),
          ctx.db.task.count({ where: { branchId: branch.id, status: { in: ["PENDING", "IN_PROGRESS"] } } }),
          ctx.db.incident.count({ where: { branchId: branch.id, status: { notIn: ["CLOSED", "RESOLVED"] } } }),
        ]);

        return {
          branchId: branch.id,
          branchName: branch.name,
          branchCode: branch.code,
          totalVehicles: vehicles,
          utilization: vehicles > 0 ? Math.round((onRent / vehicles) * 100) : 0,
          openTasks,
          openIncidents,
        };
      })
    );

    return comparison;
  }),
});
