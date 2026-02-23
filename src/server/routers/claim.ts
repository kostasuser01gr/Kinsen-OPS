import { z } from "zod";
import { router, permissionProcedure } from "@/server/trpc";
import { ClaimStatus, ClaimType, ResponsibleParty } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { claimStateMachine } from "@/lib/state-machine";

export const claimRouter = router({
  list: permissionProcedure("claims:read")
    .input(
      z.object({
        status: z.nativeEnum(ClaimStatus).optional(),
        incidentId: z.string().optional(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(50).default(20),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const { status, incidentId, page = 1, limit = 20 } = input ?? {};
      const where: Record<string, unknown> = {};
      if (status) where.status = status;
      if (incidentId) where.incidentId = incidentId;

      const [claims, total] = await Promise.all([
        ctx.db.claim.findMany({
          where: where as never,
          include: {
            incident: { select: { id: true, description: true, severity: true } },
            rental: { select: { contractNumber: true } },
            customer: { select: { firstName: true, lastName: true } },
            _count: { select: { documents: true } },
          },
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
        ctx.db.claim.count({ where: where as never }),
      ]);

      return { claims, total, page, limit };
    }),

  getById: permissionProcedure("claims:read")
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const claim = await ctx.db.claim.findUnique({
        where: { id: input.id },
        include: {
          incident: {
            include: {
              vehicle: { select: { plate: true, make: true, model: true } },
              evidence: true,
            },
          },
          rental: { select: { contractNumber: true } },
          customer: { select: { firstName: true, lastName: true, phone: true } },
          documents: true,
        },
      });
      if (!claim) throw new TRPCError({ code: "NOT_FOUND", message: "Claim not found" });
      return claim;
    }),

  create: permissionProcedure("claims:manage")
    .input(
      z.object({
        incidentId: z.string(),
        vehicleId: z.string(),
        rentalId: z.string().optional(),
        customerId: z.string().optional(),
        claimType: z.nativeEnum(ClaimType),
        responsibleParty: z.nativeEnum(ResponsibleParty).default(ResponsibleParty.UNKNOWN),
        amount: z.number().min(0).optional(),
        insurerRef: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const incident = await ctx.db.incident.findUnique({ where: { id: input.incidentId } });
      if (!incident) throw new TRPCError({ code: "NOT_FOUND", message: "Incident not found" });

      const claim = await ctx.db.claim.create({
        data: {
          incidentId: input.incidentId,
          vehicleId: input.vehicleId,
          rentalId: input.rentalId,
          customerId: input.customerId,
          claimType: input.claimType,
          responsibleParty: input.responsibleParty,
          amount: input.amount,
          insurerRef: input.insurerRef,
          filedById: ctx.user.id,
        },
      });

      // Update incident claims status
      await ctx.db.incident.update({
        where: { id: input.incidentId },
        data: { claimsStatus: "PENDING" },
      });

      await ctx.db.auditLog.create({
        data: {
          actorId: ctx.user.id,
          action: "claim.created",
          entityType: "Claim",
          entityId: claim.id,
          newState: JSON.parse(JSON.stringify({
            incidentId: input.incidentId,
            claimType: input.claimType,
            amount: input.amount,
          })),
          branchId: incident.branchId,
        },
      });

      return claim;
    }),

  transition: permissionProcedure("claims:manage")
    .input(
      z.object({
        id: z.string(),
        toStatus: z.nativeEnum(ClaimStatus),
        reason: z.string().optional(),
        settlementAmount: z.number().min(0).optional(),
        assessorNotes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const claim = await ctx.db.claim.findUnique({
        where: { id: input.id },
        include: { incident: true },
      });
      if (!claim) throw new TRPCError({ code: "NOT_FOUND", message: "Claim not found" });

      const validation = claimStateMachine.validate(claim.status, input.toStatus);
      if (!validation.valid) {
        throw new TRPCError({ code: "BAD_REQUEST", message: validation.reason ?? "Invalid status transition" });
      }

      if (validation.reasonRequired && !input.reason) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Reason required when transitioning to ${input.toStatus}` });
      }

      const updateData: Record<string, unknown> = { status: input.toStatus };
      if (input.toStatus === "SUBMITTED") updateData.filedAt = new Date();
      if (input.toStatus === "SETTLED" || input.toStatus === "CLOSED") updateData.resolvedAt = new Date();
      if (input.settlementAmount !== undefined) updateData.settlementAmount = input.settlementAmount;
      if (input.assessorNotes) updateData.assessorNotes = input.assessorNotes;

      const updated = await ctx.db.claim.update({
        where: { id: input.id },
        data: updateData as never,
      });

      await ctx.db.auditLog.create({
        data: {
          actorId: ctx.user.id,
          action: "claim.status_change",
          entityType: "Claim",
          entityId: input.id,
          previousState: JSON.parse(JSON.stringify({ status: claim.status })),
          newState: JSON.parse(JSON.stringify({ status: input.toStatus, reason: input.reason })),
          reason: input.reason,
          branchId: claim.incident.branchId,
        },
      });

      return updated;
    }),
});
