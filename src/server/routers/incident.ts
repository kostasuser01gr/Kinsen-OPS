import { z } from "zod";
import { router, protectedProcedure, permissionProcedure } from "@/server/trpc";
import { IncidentSeverity, IncidentStatus, ClaimsStatus, EvidenceType } from "@prisma/client";
import { TRPCError } from "@trpc/server";

export const incidentRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        branchId: z.string().optional(),
        status: z.nativeEnum(IncidentStatus).optional(),
        severity: z.nativeEnum(IncidentSeverity).optional(),
        vehicleId: z.string().optional(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const { branchId, status, severity, vehicleId, page = 1, limit = 20 } = input ?? {};
      const where = {
        ...(branchId && { branchId }),
        ...(status && { status }),
        ...(severity && { severity }),
        ...(vehicleId && { vehicleId }),
      };

      const [incidents, total] = await Promise.all([
        ctx.db.incident.findMany({
          where,
          include: {
            vehicle: { select: { id: true, plate: true, make: true, model: true } },
            branch: { select: { id: true, name: true, code: true } },
            reportedBy: { select: { id: true, name: true } },
            _count: { select: { evidence: true } },
          },
          orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
          skip: (page - 1) * limit,
          take: limit,
        }),
        ctx.db.incident.count({ where }),
      ]);

      return { incidents, total, page, limit, totalPages: Math.ceil(total / limit) };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const incident = await ctx.db.incident.findUnique({
        where: { id: input.id },
        include: {
          vehicle: { include: { branch: true } },
          branch: true,
          reportedBy: { select: { id: true, name: true, role: true } },
          evidence: {
            include: { uploadedBy: { select: { id: true, name: true } } },
            orderBy: { createdAt: "desc" },
          },
        },
      });
      if (!incident) throw new TRPCError({ code: "NOT_FOUND" });
      return incident;
    }),

  create: permissionProcedure("incident:write")
    .input(
      z.object({
        vehicleId: z.string(),
        branchId: z.string(),
        severity: z.nativeEnum(IncidentSeverity),
        description: z.string().min(1),
        financialImpactEstimate: z.number().min(0).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const incident = await ctx.db.incident.create({
        data: { ...input, reportedById: ctx.user.id },
      });

      await ctx.db.auditLog.create({
        data: {
          actorId: ctx.user.id,
          action: "incident.create",
          entityType: "Incident",
          entityId: incident.id,
          newState: { severity: input.severity, vehicleId: input.vehicleId },
          branchId: input.branchId,
        },
      });

      return incident;
    }),

  updateStatus: permissionProcedure("incident:resolve")
    .input(
      z.object({
        id: z.string(),
        status: z.nativeEnum(IncidentStatus),
        claimsStatus: z.nativeEnum(ClaimsStatus).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const incident = await ctx.db.incident.findUnique({ where: { id: input.id } });
      if (!incident) throw new TRPCError({ code: "NOT_FOUND" });

      const updated = await ctx.db.incident.update({
        where: { id: input.id },
        data: {
          status: input.status,
          claimsStatus: input.claimsStatus,
          resolvedAt: input.status === "RESOLVED" || input.status === "CLOSED" ? new Date() : undefined,
        },
      });

      await ctx.db.auditLog.create({
        data: {
          actorId: ctx.user.id,
          action: "incident.update_status",
          entityType: "Incident",
          entityId: input.id,
          previousState: { status: incident.status },
          newState: { status: input.status },
          branchId: incident.branchId,
        },
      });

      return updated;
    }),

  addEvidence: permissionProcedure("incident:write")
    .input(
      z.object({
        incidentId: z.string(),
        type: z.nativeEnum(EvidenceType),
        url: z.string().url(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.incidentEvidence.create({
        data: { ...input, uploadedById: ctx.user.id },
      });
    }),
});
