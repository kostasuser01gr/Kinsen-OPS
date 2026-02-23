import { z } from "zod";
import { router, protectedProcedure, permissionProcedure } from "@/server/trpc";
import { MaintenanceType, MaintenancePriority, MaintenanceStatus } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { maintenanceStateMachine } from "@/lib/state-machine";

export const maintenanceRouter = router({
  list: permissionProcedure("maintenance:read")
    .input(
      z.object({
        status: z.nativeEnum(MaintenanceStatus).optional(),
        vehicleId: z.string().optional(),
        priority: z.nativeEnum(MaintenancePriority).optional(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(50).default(20),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const { status, vehicleId, priority, page = 1, limit = 20 } = input ?? {};
      const where: Record<string, unknown> = {};
      if (status) where.status = status;
      if (vehicleId) where.vehicleId = vehicleId;
      if (priority) where.priority = priority;

      const [requests, total] = await Promise.all([
        ctx.db.maintenanceRequest.findMany({
          where: where as never,
          include: {
            vehicle: { select: { id: true, plate: true, make: true, model: true, branchId: true } },
            parts: true,
          },
          orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
          skip: (page - 1) * limit,
          take: limit,
        }),
        ctx.db.maintenanceRequest.count({ where: where as never }),
      ]);

      return { requests, total, page, limit };
    }),

  getById: permissionProcedure("maintenance:read")
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const request = await ctx.db.maintenanceRequest.findUnique({
        where: { id: input.id },
        include: {
          vehicle: { select: { id: true, plate: true, make: true, model: true, status: true } },
          parts: true,
        },
      });
      if (!request) throw new TRPCError({ code: "NOT_FOUND", message: "Maintenance request not found" });
      return request;
    }),

  create: permissionProcedure("maintenance:request")
    .input(
      z.object({
        vehicleId: z.string(),
        type: z.nativeEnum(MaintenanceType),
        priority: z.nativeEnum(MaintenancePriority).default(MaintenancePriority.MEDIUM),
        description: z.string().min(1),
        estimatedCost: z.number().min(0).optional(),
        estimatedDuration: z.number().min(0).optional(),
        scheduledDate: z.string().datetime().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const vehicle = await ctx.db.vehicle.findUnique({ where: { id: input.vehicleId } });
      if (!vehicle) throw new TRPCError({ code: "NOT_FOUND", message: "Vehicle not found" });

      const request = await ctx.db.maintenanceRequest.create({
        data: {
          vehicleId: input.vehicleId,
          branchId: vehicle.branchId,
          requestedById: ctx.user.id,
          type: input.type,
          priority: input.priority,
          description: input.description,
          estimatedCost: input.estimatedCost,
          estimatedDuration: input.estimatedDuration,
          scheduledDate: input.scheduledDate ? new Date(input.scheduledDate) : null,
        },
      });

      await ctx.db.auditLog.create({
        data: {
          actorId: ctx.user.id,
          action: "maintenance.created",
          entityType: "MaintenanceRequest",
          entityId: request.id,
          newState: JSON.parse(JSON.stringify({
            vehicleId: input.vehicleId,
            type: input.type,
            priority: input.priority,
          })),
          branchId: vehicle.branchId,
        },
      });

      return request;
    }),

  transition: permissionProcedure("maintenance:approve")
    .input(
      z.object({
        id: z.string(),
        toStatus: z.nativeEnum(MaintenanceStatus),
        reason: z.string().optional(),
        technicianNotes: z.string().optional(),
        actualCost: z.number().min(0).optional(),
        actualDuration: z.number().min(0).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const request = await ctx.db.maintenanceRequest.findUnique({
        where: { id: input.id },
        include: { vehicle: true },
      });
      if (!request) throw new TRPCError({ code: "NOT_FOUND", message: "Maintenance request not found" });

      const validation = maintenanceStateMachine.validate(request.status, input.toStatus);
      if (!validation.valid) {
        throw new TRPCError({ code: "BAD_REQUEST", message: validation.reason ?? "Invalid status transition" });
      }

      if (validation.reasonRequired && !input.reason) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Reason required when transitioning to ${input.toStatus}` });
      }

      const updateData: Record<string, unknown> = { status: input.toStatus };
      if (input.toStatus === "APPROVED") {
        updateData.approvedById = ctx.user.id;
        updateData.approvedAt = new Date();
      }
      if (input.toStatus === "COMPLETED") {
        updateData.completedDate = new Date();
      }
      if (input.technicianNotes) updateData.technicianNotes = input.technicianNotes;
      if (input.actualCost !== undefined) updateData.actualCost = input.actualCost;
      if (input.actualDuration !== undefined) updateData.actualDuration = input.actualDuration;

      const updated = await ctx.db.maintenanceRequest.update({
        where: { id: input.id },
        data: updateData as never,
      });

      await ctx.db.auditLog.create({
        data: {
          actorId: ctx.user.id,
          action: "maintenance.status_change",
          entityType: "MaintenanceRequest",
          entityId: input.id,
          previousState: JSON.parse(JSON.stringify({ status: request.status })),
          newState: JSON.parse(JSON.stringify({ status: input.toStatus, reason: input.reason })),
          reason: input.reason,
          branchId: request.branchId,
        },
      });

      // Auto-transition vehicle status when maintenance completes
      if (input.toStatus === "COMPLETED" && request.vehicle) {
        const fleetImpact = request.fleetImpact;
        if (fleetImpact === "NEEDS_INSPECTION") {
          await ctx.db.vehicle.update({
            where: { id: request.vehicleId },
            data: { status: "INSPECTION_IN_PROGRESS" },
          });
        }
      }

      return updated;
    }),

  addPart: permissionProcedure("maintenance:approve")
    .input(
      z.object({
        maintenanceRequestId: z.string(),
        name: z.string().min(1),
        partNumber: z.string().optional(),
        quantity: z.number().min(1).default(1),
        unitCost: z.number().min(0).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const request = await ctx.db.maintenanceRequest.findUnique({
        where: { id: input.maintenanceRequestId },
      });
      if (!request) throw new TRPCError({ code: "NOT_FOUND", message: "Maintenance request not found" });

      return ctx.db.maintenancePart.create({
        data: {
          maintenanceRequestId: input.maintenanceRequestId,
          name: input.name,
          partNumber: input.partNumber,
          quantity: input.quantity,
          unitCost: input.unitCost,
        },
      });
    }),
});
