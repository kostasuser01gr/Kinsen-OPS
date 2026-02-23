import { z } from "zod";
import { router, permissionProcedure } from "@/server/trpc";
import { InspectionType, InspectionStatus, CheckpointCategory, CheckpointCondition } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { inspectionStateMachine } from "@/lib/state-machine";

export const inspectionRouter = router({
  list: permissionProcedure("rental:read")
    .input(
      z.object({
        rentalId: z.string().optional(),
        vehicleId: z.string().optional(),
        type: z.nativeEnum(InspectionType).optional(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(50).default(20),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const { rentalId, vehicleId, type, page = 1, limit = 20 } = input ?? {};
      const where: Record<string, unknown> = {};
      if (rentalId) where.rentalId = rentalId;
      if (vehicleId) where.vehicleId = vehicleId;
      if (type) where.type = type;

      const [inspections, total] = await Promise.all([
        ctx.db.inspection.findMany({
          where: where as never,
          include: {
            vehicle: { select: { plate: true, make: true, model: true } },
            inspector: { select: { name: true } },
            _count: { select: { items: true } },
          },
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
        ctx.db.inspection.count({ where: where as never }),
      ]);

      return { inspections, total, page, limit };
    }),

  getById: permissionProcedure("rental:read")
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const inspection = await ctx.db.inspection.findUnique({
        where: { id: input.id },
        include: {
          vehicle: { select: { plate: true, make: true, model: true } },
          rental: { select: { contractNumber: true } },
          inspector: { select: { name: true, identifier: true } },
          items: { orderBy: { category: "asc" } },
        },
      });
      if (!inspection) throw new TRPCError({ code: "NOT_FOUND", message: "Inspection not found" });
      return inspection;
    }),

  create: permissionProcedure("pickup:execute")
    .input(
      z.object({
        rentalId: z.string(),
        vehicleId: z.string(),
        type: z.nativeEnum(InspectionType),
        fuelLevel: z.number().min(0).max(100).optional(),
        mileage: z.number().min(0).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const rental = await ctx.db.rental.findUnique({ where: { id: input.rentalId } });
      if (!rental) throw new TRPCError({ code: "NOT_FOUND", message: "Rental not found" });

      const vehicle = await ctx.db.vehicle.findUnique({ where: { id: input.vehicleId } });
      if (!vehicle) throw new TRPCError({ code: "NOT_FOUND", message: "Vehicle not found" });

      const inspection = await ctx.db.inspection.create({
        data: {
          rentalId: input.rentalId,
          vehicleId: input.vehicleId,
          type: input.type,
          inspectorId: ctx.user.id,
          branchId: vehicle.branchId,
          status: "IN_PROGRESS",
          fuelLevel: input.fuelLevel,
          mileage: input.mileage,
        },
      });

      await ctx.db.auditLog.create({
        data: {
          actorId: ctx.user.id,
          action: `inspection.created`,
          entityType: "Inspection",
          entityId: inspection.id,
          newState: JSON.parse(JSON.stringify({ type: input.type, vehicleId: input.vehicleId, rentalId: input.rentalId })),
          branchId: vehicle.branchId,
        },
      });

      return inspection;
    }),

  addItem: permissionProcedure("pickup:execute")
    .input(
      z.object({
        inspectionId: z.string(),
        category: z.nativeEnum(CheckpointCategory),
        checkpointName: z.string().min(1),
        condition: z.nativeEnum(CheckpointCondition).default(CheckpointCondition.OK),
        photoRef: z.string().optional(),
        notes: z.string().optional(),
        previousCondition: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const inspection = await ctx.db.inspection.findUnique({ where: { id: input.inspectionId } });
      if (!inspection) throw new TRPCError({ code: "NOT_FOUND", message: "Inspection not found" });
      if (inspection.status !== "IN_PROGRESS") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Can only add items to in-progress inspections" });
      }

      return ctx.db.inspectionItem.create({ data: input });
    }),

  complete: permissionProcedure("pickup:execute")
    .input(
      z.object({
        id: z.string(),
        overallCondition: z.string().optional(),
        discrepancyNotes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const inspection = await ctx.db.inspection.findUnique({
        where: { id: input.id },
        include: { items: true },
      });
      if (!inspection) throw new TRPCError({ code: "NOT_FOUND", message: "Inspection not found" });

      const validation = inspectionStateMachine.validate(inspection.status, "COMPLETED");
      if (!validation.valid) {
        throw new TRPCError({ code: "BAD_REQUEST", message: validation.reason ?? "Cannot complete inspection" });
      }

      const hasDiscrepancy = inspection.items.some(
        (item) => item.condition !== "OK"
      );

      const updated = await ctx.db.inspection.update({
        where: { id: input.id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          overallCondition: input.overallCondition,
          discrepancyFlag: hasDiscrepancy,
          discrepancyNotes: input.discrepancyNotes,
        },
      });

      // Link inspection to rental
      const rentalUpdate: Record<string, string> = {};
      if (inspection.type === "PICKUP") rentalUpdate.pickupInspectionId = input.id;
      if (inspection.type === "RETURN") rentalUpdate.returnInspectionId = input.id;
      if (Object.keys(rentalUpdate).length > 0) {
        await ctx.db.rental.update({
          where: { id: inspection.rentalId },
          data: rentalUpdate,
        });
      }

      // Auto-create task if discrepancy found
      if (hasDiscrepancy) {
        await ctx.db.task.create({
          data: {
            type: "inspection_discrepancy",
            title: `Review ${inspection.type.toLowerCase()} inspection discrepancy`,
            description: input.discrepancyNotes || "Inspection items flagged with damage",
            linkedEntityType: "VEHICLE",
            linkedEntityId: inspection.vehicleId,
            sourceType: "inspection",
            sourceId: inspection.id,
            creatorId: ctx.user.id,
            priority: "HIGH",
            branchId: inspection.branchId,
          },
        });
      }

      await ctx.db.auditLog.create({
        data: {
          actorId: ctx.user.id,
          action: "inspection.completed",
          entityType: "Inspection",
          entityId: input.id,
          newState: JSON.parse(JSON.stringify({
            type: inspection.type,
            discrepancyFlag: hasDiscrepancy,
            itemCount: inspection.items.length,
          })),
          branchId: inspection.branchId,
        },
      });

      return updated;
    }),
});
