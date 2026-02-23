import { z } from "zod";
import { router, protectedProcedure, permissionProcedure } from "@/server/trpc";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { TRPCError } from "@trpc/server";

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
        email: z.string().email(),
        name: z.string().min(1),
        password: z.string().min(8),
        role: z.nativeEnum(Role),
        branchId: z.string().optional(),
        phone: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.user.findUnique({ where: { email: input.email } });
      if (existing) throw new TRPCError({ code: "CONFLICT", message: "Email already registered" });

      const passwordHash = await bcrypt.hash(input.password, 12);
      const { password, ...rest } = input;
      const user = await ctx.db.user.create({
        data: { ...rest, passwordHash },
      });

      await ctx.db.auditLog.create({
        data: {
          actorId: ctx.user.id,
          action: "user.create",
          entityType: "User",
          entityId: user.id,
          newState: { email: input.email, role: input.role, branchId: input.branchId },
        },
      });

      return { id: user.id, name: user.name, email: user.email, role: user.role };
    }),
});
