import { z } from "zod";
import { router, protectedProcedure, permissionProcedure } from "@/server/trpc";
import { TaskStatus, TaskPriority, LinkedEntityType } from "@prisma/client";
import { TRPCError } from "@trpc/server";

export const taskRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        branchId: z.string().optional(),
        status: z.nativeEnum(TaskStatus).optional(),
        priority: z.nativeEnum(TaskPriority).optional(),
        assigneeId: z.string().optional(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const { branchId, status, priority, assigneeId, page = 1, limit = 20 } = input ?? {};
      const where = {
        ...(branchId && { branchId }),
        ...(status && { status }),
        ...(priority && { priority }),
        ...(assigneeId && { assigneeId }),
      };

      const [tasks, total] = await Promise.all([
        ctx.db.task.findMany({
          where,
          include: {
            assignee: { select: { id: true, name: true } },
            creator: { select: { id: true, name: true } },
            branch: { select: { id: true, name: true, code: true } },
          },
          orderBy: [{ priority: "desc" }, { dueAt: "asc" }, { createdAt: "desc" }],
          skip: (page - 1) * limit,
          take: limit,
        }),
        ctx.db.task.count({ where }),
      ]);

      return { tasks, total, page, limit, totalPages: Math.ceil(total / limit) };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const task = await ctx.db.task.findUnique({
        where: { id: input.id },
        include: {
          assignee: { select: { id: true, name: true, role: true } },
          creator: { select: { id: true, name: true } },
          branch: true,
          shift: true,
        },
      });
      if (!task) throw new TRPCError({ code: "NOT_FOUND" });
      return task;
    }),

  create: permissionProcedure("task:write")
    .input(
      z.object({
        type: z.string().min(1),
        title: z.string().min(1),
        description: z.string().optional(),
        linkedEntityType: z.nativeEnum(LinkedEntityType).optional(),
        linkedEntityId: z.string().optional(),
        assigneeId: z.string().optional(),
        priority: z.nativeEnum(TaskPriority).default("MEDIUM"),
        dueAt: z.string().datetime().optional(),
        branchId: z.string(),
        shiftId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.task.create({
        data: {
          ...input,
          creatorId: ctx.user.id,
          dueAt: input.dueAt ? new Date(input.dueAt) : undefined,
        },
      });
    }),

  updateStatus: permissionProcedure("task:complete")
    .input(
      z.object({
        id: z.string(),
        status: z.nativeEnum(TaskStatus),
        handoverNotes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.task.update({
        where: { id: input.id },
        data: {
          status: input.status,
          handoverNotes: input.handoverNotes,
          completedAt: input.status === "COMPLETED" ? new Date() : undefined,
        },
      });
    }),

  assign: permissionProcedure("task:assign")
    .input(z.object({ id: z.string(), assigneeId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.task.update({
        where: { id: input.id },
        data: { assigneeId: input.assigneeId },
      });
    }),

  handoverSummary: protectedProcedure
    .input(z.object({ branchId: z.string() }))
    .query(async ({ ctx, input }) => {
      const [openTasks, blockedTasks, recentlyCompleted] = await Promise.all([
        ctx.db.task.findMany({
          where: { branchId: input.branchId, status: { in: ["PENDING", "IN_PROGRESS"] } },
          include: { assignee: { select: { name: true } } },
          orderBy: [{ priority: "desc" }, { dueAt: "asc" }],
        }),
        ctx.db.task.findMany({
          where: { branchId: input.branchId, status: "BLOCKED" },
          include: { assignee: { select: { name: true } } },
        }),
        ctx.db.task.findMany({
          where: {
            branchId: input.branchId,
            status: "COMPLETED",
            completedAt: { gte: new Date(Date.now() - 8 * 60 * 60 * 1000) },
          },
          include: { assignee: { select: { name: true } } },
          orderBy: { completedAt: "desc" },
        }),
      ]);

      return { openTasks, blockedTasks, recentlyCompleted };
    }),
});
