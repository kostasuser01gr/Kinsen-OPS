import { z } from "zod";
import { router, protectedProcedure, permissionProcedure } from "@/server/trpc";
import { VehicleStatus, VehicleClass } from "@prisma/client";
import { isValidTransition } from "@/lib/vehicle-status";
import { TRPCError } from "@trpc/server";

export const fleetRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        branchId: z.string().optional(),
        status: z.nativeEnum(VehicleStatus).optional(),
        class: z.nativeEnum(VehicleClass).optional(),
        search: z.string().optional(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const { branchId, status, class: vehicleClass, search, page = 1, limit = 20 } = input ?? {};
      const where = {
        isActive: true,
        ...(branchId && { branchId }),
        ...(status && { status }),
        ...(vehicleClass && { class: vehicleClass }),
        ...(search && {
          OR: [
            { plate: { contains: search, mode: "insensitive" as const } },
            { make: { contains: search, mode: "insensitive" as const } },
            { model: { contains: search, mode: "insensitive" as const } },
            { internalCode: { contains: search, mode: "insensitive" as const } },
          ],
        }),
      };

      const [vehicles, total] = await Promise.all([
        ctx.db.vehicle.findMany({
          where,
          include: { branch: { select: { id: true, name: true, code: true } } },
          orderBy: { updatedAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
        ctx.db.vehicle.count({ where }),
      ]);

      return { vehicles, total, page, limit, totalPages: Math.ceil(total / limit) };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const vehicle = await ctx.db.vehicle.findUnique({
        where: { id: input.id },
        include: {
          branch: true,
          statusHistory: {
            include: { actor: { select: { id: true, name: true } } },
            orderBy: { createdAt: "desc" },
            take: 20,
          },
          rentals: {
            where: { status: { in: ["ACTIVE", "CONFIRMED"] } },
            include: { customer: true },
            take: 5,
          },
          incidents: {
            where: { status: { notIn: ["CLOSED", "RESOLVED"] } },
            orderBy: { createdAt: "desc" },
            take: 5,
          },
        },
      });

      if (!vehicle) throw new TRPCError({ code: "NOT_FOUND", message: "Vehicle not found" });
      return vehicle;
    }),

  create: permissionProcedure("fleet:write")
    .input(
      z.object({
        plate: z.string().min(1),
        vin: z.string().optional(),
        internalCode: z.string().optional(),
        branchId: z.string(),
        class: z.nativeEnum(VehicleClass),
        make: z.string().min(1),
        model: z.string().min(1),
        year: z.number().min(1990).max(2030),
        color: z.string().optional(),
        mileage: z.number().min(0).default(0),
        fuelLevel: z.number().min(0).max(100).optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const vehicle = await ctx.db.vehicle.create({ data: input });

      await ctx.db.auditLog.create({
        data: {
          actorId: ctx.user.id,
          action: "vehicle.create",
          entityType: "Vehicle",
          entityId: vehicle.id,
          newState: JSON.parse(JSON.stringify(input)),
          branchId: input.branchId,
        },
      });

      return vehicle;
    }),

  transitionStatus: permissionProcedure("fleet:transition")
    .input(
      z.object({
        vehicleId: z.string(),
        toStatus: z.nativeEnum(VehicleStatus),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const vehicle = await ctx.db.vehicle.findUnique({ where: { id: input.vehicleId } });
      if (!vehicle) throw new TRPCError({ code: "NOT_FOUND", message: "Vehicle not found" });

      if (!isValidTransition(vehicle.status, input.toStatus)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Invalid transition: ${vehicle.status} → ${input.toStatus}`,
        });
      }

      const [updated] = await ctx.db.$transaction([
        ctx.db.vehicle.update({
          where: { id: input.vehicleId },
          data: { status: input.toStatus },
        }),
        ctx.db.vehicleStatusHistory.create({
          data: {
            vehicleId: input.vehicleId,
            fromStatus: vehicle.status,
            toStatus: input.toStatus,
            reason: input.reason,
            actorId: ctx.user.id,
          },
        }),
        ctx.db.auditLog.create({
          data: {
            actorId: ctx.user.id,
            action: "vehicle.transition_status",
            entityType: "Vehicle",
            entityId: input.vehicleId,
            previousState: { status: vehicle.status },
            newState: { status: input.toStatus },
            reason: input.reason,
            branchId: vehicle.branchId,
          },
        }),
      ]);

      return updated;
    }),

  statusSummary: protectedProcedure
    .input(z.object({ branchId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const where = {
        isActive: true,
        ...(input?.branchId && { branchId: input.branchId }),
      };

      const counts = await ctx.db.vehicle.groupBy({
        by: ["status"],
        where,
        _count: { _all: true },
      });

      return counts.map((c) => ({ status: c.status, count: c._count._all }));
    }),
});
