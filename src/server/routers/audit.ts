import { z } from "zod";
import { router, permissionProcedure } from "@/server/trpc";

export const auditRouter = router({
  list: permissionProcedure("audit:read")
    .input(
      z.object({
        entityType: z.string().optional(),
        entityId: z.string().optional(),
        actorId: z.string().optional(),
        action: z.string().optional(),
        branchId: z.string().optional(),
        from: z.string().datetime().optional(),
        to: z.string().datetime().optional(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(50),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const { entityType, entityId, actorId, action, branchId, from, to, page = 1, limit = 50 } = input ?? {};
      const where = {
        ...(entityType && { entityType }),
        ...(entityId && { entityId }),
        ...(actorId && { actorId }),
        ...(action && { action: { contains: action } }),
        ...(branchId && { branchId }),
        ...((from || to) && {
          createdAt: {
            ...(from && { gte: new Date(from) }),
            ...(to && { lte: new Date(to) }),
          },
        }),
      };

      const [logs, total] = await Promise.all([
        ctx.db.auditLog.findMany({
          where,
          include: {
            actor: { select: { id: true, name: true, role: true } },
            branch: { select: { id: true, name: true, code: true } },
          },
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
        ctx.db.auditLog.count({ where }),
      ]);

      return { logs, total, page, limit, totalPages: Math.ceil(total / limit) };
    }),
});
