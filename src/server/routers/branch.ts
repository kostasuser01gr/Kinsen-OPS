import { z } from "zod";
import { router, protectedProcedure, permissionProcedure } from "@/server/trpc";
import { Role } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { hashPin, validatePin, validateIdentifier } from "@/lib/pin";

export const branchRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.branch.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const branch = await ctx.db.branch.findUnique({
        where: { id: input.id },
        include: {
          users: { select: { id: true, name: true, role: true, isActive: true } },
          _count: {
            select: { vehicles: true, shifts: true },
          },
        },
      });
      if (!branch) throw new TRPCError({ code: "NOT_FOUND" });
      return branch;
    }),

  listStaff: protectedProcedure
    .input(z.object({ branchId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      return ctx.db.user.findMany({
        where: {
          isActive: true,
          ...(input?.branchId && { branchId: input.branchId }),
        },
        select: { id: true, name: true, email: true, role: true, branchId: true },
        orderBy: { name: "asc" },
      });
    }),

  createUser: permissionProcedure("admin:manage_users")
    .input(
      z.object({
        identifier: z.string().min(2).max(30),
        name: z.string().min(1),
        pin: z.string().length(4),
        role: z.nativeEnum(Role),
        branchId: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().email().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const cleanId = input.identifier.trim().toLowerCase();
      if (!validateIdentifier(cleanId)) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid identifier format" });
      if (!validatePin(input.pin)) throw new TRPCError({ code: "BAD_REQUEST", message: "PIN must be exactly 4 digits" });

      const existing = await ctx.db.user.findUnique({ where: { identifier: cleanId } });
      if (existing) throw new TRPCError({ code: "CONFLICT", message: "Identifier already registered" });

      const pinHash = await hashPin(input.pin);
      const { pin, identifier, ...rest } = input;
      const user = await ctx.db.user.create({
        data: { ...rest, identifier: cleanId, pinHash },
      });

      await ctx.db.auditLog.create({
        data: {
          actorId: ctx.user.id,
          action: "user.create",
          entityType: "User",
          entityId: user.id,
          newState: { identifier: cleanId, role: input.role, branchId: input.branchId },
        },
      });

      return { id: user.id, name: user.name, identifier: user.identifier, role: user.role };
    }),
});
