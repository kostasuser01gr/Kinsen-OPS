import { z } from "zod";
import { router, protectedProcedure, permissionProcedure } from "@/server/trpc";
import { ApprovalStatus, ApprovalType } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { approvalStateMachine } from "@/lib/state-machine";

export const approvalRouter = router({
  list: permissionProcedure("approval:read")
    .input(
      z.object({
        status: z.nativeEnum(ApprovalStatus).optional(),
        type: z.nativeEnum(ApprovalType).optional(),
        mine: z.boolean().optional(), // only requests I need to decide on
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(50).default(20),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const { status, type, mine, page = 1, limit = 20 } = input ?? {};
      const where: Record<string, unknown> = {};
      if (status) where.status = status;
      if (type) where.type = type;
      if (mine) where.status = "PENDING"; // show pending items for approvers

      const [requests, total] = await Promise.all([
        ctx.db.approvalRequest.findMany({
          where: where as never,
          include: {
            requester: { select: { id: true, name: true, identifier: true } },
            approver: { select: { id: true, name: true, identifier: true } },
          },
          orderBy: { requestedAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
        ctx.db.approvalRequest.count({ where: where as never }),
      ]);

      return { requests, total, page, limit };
    }),

  getById: permissionProcedure("approval:read")
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const request = await ctx.db.approvalRequest.findUnique({
        where: { id: input.id },
        include: {
          requester: { select: { id: true, name: true, identifier: true, role: true } },
          approver: { select: { id: true, name: true, identifier: true } },
        },
      });
      if (!request) throw new TRPCError({ code: "NOT_FOUND", message: "Approval request not found" });
      return request;
    }),

  create: protectedProcedure
    .input(
      z.object({
        type: z.nativeEnum(ApprovalType),
        entityType: z.string(),
        entityId: z.string(),
        reason: z.string().min(1),
        payload: z.record(z.string(), z.unknown()),
        expiresInHours: z.number().min(1).max(168).optional(), // max 1 week
      })
    )
    .mutation(async ({ ctx, input }) => {
      const expiresAt = input.expiresInHours
        ? new Date(Date.now() + input.expiresInHours * 60 * 60 * 1000)
        : null;

      const request = await ctx.db.approvalRequest.create({
        data: {
          type: input.type,
          requesterId: ctx.user.id,
          entityType: input.entityType,
          entityId: input.entityId,
          reason: input.reason,
          payload: JSON.parse(JSON.stringify(input.payload)),
          expiresAt,
        },
      });

      await ctx.db.auditLog.create({
        data: {
          actorId: ctx.user.id,
          action: "approval.requested",
          entityType: "ApprovalRequest",
          entityId: request.id,
          newState: JSON.parse(JSON.stringify({
            type: input.type,
            entityType: input.entityType,
            entityId: input.entityId,
          })),
          branchId: ctx.user.branchId,
        },
      });

      return request;
    }),

  decide: permissionProcedure("approval:decide")
    .input(
      z.object({
        id: z.string(),
        decision: z.enum(["APPROVED", "DENIED"]),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const request = await ctx.db.approvalRequest.findUnique({
        where: { id: input.id },
      });

      if (!request) throw new TRPCError({ code: "NOT_FOUND", message: "Approval request not found" });

      const validation = approvalStateMachine.validate(request.status, input.decision as never);
      if (!validation.valid) {
        throw new TRPCError({ code: "BAD_REQUEST", message: validation.reason ?? "Invalid status transition" });
      }

      // Check expiry
      if (request.expiresAt && new Date() > request.expiresAt) {
        await ctx.db.approvalRequest.update({
          where: { id: input.id },
          data: { status: "EXPIRED" },
        });
        throw new TRPCError({ code: "BAD_REQUEST", message: "This approval request has expired" });
      }

      const updated = await ctx.db.approvalRequest.update({
        where: { id: input.id },
        data: {
          status: input.decision,
          approverId: ctx.user.id,
          approverNotes: input.notes,
          decidedAt: new Date(),
        },
      });

      await ctx.db.auditLog.create({
        data: {
          actorId: ctx.user.id,
          action: `approval.${input.decision.toLowerCase()}`,
          entityType: "ApprovalRequest",
          entityId: request.id,
          previousState: JSON.parse(JSON.stringify({ status: request.status })),
          newState: JSON.parse(JSON.stringify({
            status: input.decision,
            type: request.type,
            entityType: request.entityType,
            entityId: request.entityId,
          })),
          branchId: ctx.user.branchId,
        },
      });

      return updated;
    }),

  pendingCount: permissionProcedure("approval:read")
    .query(async ({ ctx }) => {
      const count = await ctx.db.approvalRequest.count({
        where: { status: "PENDING" },
      });
      return { count };
    }),
});
