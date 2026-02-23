import { z } from "zod";
import { router, protectedProcedure, permissionProcedure } from "@/server/trpc";
import { RentalStatus, PaymentStatus, DepositStatus } from "@prisma/client";
import { TRPCError } from "@trpc/server";

export const rentalRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        branchId: z.string().optional(),
        status: z.nativeEnum(RentalStatus).optional(),
        customerId: z.string().optional(),
        vehicleId: z.string().optional(),
        search: z.string().optional(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const { branchId, status, customerId, vehicleId, search, page = 1, limit = 20 } = input ?? {};
      const where = {
        ...(branchId && { branchOutId: branchId }),
        ...(status && { status }),
        ...(customerId && { customerId }),
        ...(vehicleId && { vehicleId }),
        ...(search && {
          OR: [
            { contractNumber: { contains: search, mode: "insensitive" as const } },
            { customer: { lastName: { contains: search, mode: "insensitive" as const } } },
            { vehicle: { plate: { contains: search, mode: "insensitive" as const } } },
          ],
        }),
      };

      const [rentals, total] = await Promise.all([
        ctx.db.rental.findMany({
          where,
          include: {
            customer: { select: { id: true, firstName: true, lastName: true, phone: true } },
            vehicle: { select: { id: true, plate: true, make: true, model: true, class: true } },
            branchOut: { select: { id: true, name: true, code: true } },
            branchIn: { select: { id: true, name: true, code: true } },
          },
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
        ctx.db.rental.count({ where }),
      ]);

      return { rentals, total, page, limit, totalPages: Math.ceil(total / limit) };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const rental = await ctx.db.rental.findUnique({
        where: { id: input.id },
        include: {
          customer: true,
          vehicle: { include: { branch: true } },
          branchOut: true,
          branchIn: true,
          payments: { orderBy: { createdAt: "desc" } },
        },
      });

      if (!rental) throw new TRPCError({ code: "NOT_FOUND", message: "Rental not found" });
      return rental;
    }),

  create: permissionProcedure("rental:write")
    .input(
      z.object({
        customerId: z.string(),
        vehicleId: z.string(),
        branchOutId: z.string(),
        branchInId: z.string().optional(),
        pickupTime: z.string().datetime(),
        returnTime: z.string().datetime().optional(),
        dailyRate: z.number().positive(),
        depositAmount: z.number().min(0).optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const vehicle = await ctx.db.vehicle.findUnique({ where: { id: input.vehicleId } });
      if (!vehicle) throw new TRPCError({ code: "NOT_FOUND", message: "Vehicle not found" });
      if (vehicle.status !== "AVAILABLE" && vehicle.status !== "PICKUP_READY") {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Vehicle is ${vehicle.status}, not available for rent` });
      }

      const rental = await ctx.db.rental.create({
        data: {
          ...input,
          pickupTime: new Date(input.pickupTime),
          returnTime: input.returnTime ? new Date(input.returnTime) : undefined,
          depositStatus: input.depositAmount ? "HELD" : undefined,
        },
      });

      await ctx.db.auditLog.create({
        data: {
          actorId: ctx.user.id,
          action: "rental.create",
          entityType: "Rental",
          entityId: rental.id,
          newState: { contractNumber: rental.contractNumber, vehicleId: input.vehicleId },
          branchId: input.branchOutId,
        },
      });

      return rental;
    }),

  updateStatus: permissionProcedure("rental:write")
    .input(
      z.object({
        id: z.string(),
        status: z.nativeEnum(RentalStatus),
        actualReturnTime: z.string().datetime().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const rental = await ctx.db.rental.findUnique({ where: { id: input.id } });
      if (!rental) throw new TRPCError({ code: "NOT_FOUND" });

      const updated = await ctx.db.rental.update({
        where: { id: input.id },
        data: {
          status: input.status,
          ...(input.actualReturnTime && { actualReturnTime: new Date(input.actualReturnTime) }),
        },
      });

      await ctx.db.auditLog.create({
        data: {
          actorId: ctx.user.id,
          action: "rental.update_status",
          entityType: "Rental",
          entityId: input.id,
          previousState: { status: rental.status },
          newState: { status: input.status },
          branchId: rental.branchOutId,
        },
      });

      return updated;
    }),

  // Customer CRUD
  listCustomers: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const { search, page = 1, limit = 20 } = input ?? {};
      const where = search
        ? {
            OR: [
              { firstName: { contains: search, mode: "insensitive" as const } },
              { lastName: { contains: search, mode: "insensitive" as const } },
              { phone: { contains: search } },
              { email: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {};

      const [customers, total] = await Promise.all([
        ctx.db.customer.findMany({ where, orderBy: { lastName: "asc" }, skip: (page - 1) * limit, take: limit }),
        ctx.db.customer.count({ where }),
      ]);

      return { customers, total, page, limit };
    }),

  createCustomer: permissionProcedure("rental:write")
    .input(
      z.object({
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        email: z.string().email().optional(),
        phone: z.string().min(1),
        licenseNumber: z.string().min(1),
        idDocument: z.string().optional(),
        address: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.customer.create({ data: input });
    }),
});
