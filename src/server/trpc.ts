import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { db } from "@/server/db";
import { auth } from "@/lib/auth";
import type { Role } from "@prisma/client";
import { type Permission, hasPermission } from "@/lib/permissions";

export const createTRPCContext = async () => {
  const session = await auth();
  return { db, session };
};

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape }) {
    return shape;
  },
});

export const createCallerFactory = t.createCallerFactory;
export const router = t.router;
export const publicProcedure = t.procedure;

const enforceAuth = t.middleware(async ({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      session: ctx.session,
      user: ctx.session.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(enforceAuth);

export const createPermissionMiddleware = (permission: Permission) =>
  t.middleware(async ({ ctx, next }) => {
    if (!ctx.session?.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    if (!hasPermission(ctx.session.user.role as Role, permission)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `Missing permission: ${permission}`,
      });
    }
    return next({
      ctx: {
        session: ctx.session,
        user: ctx.session.user,
      },
    });
  });

export const permissionProcedure = (permission: Permission) =>
  t.procedure.use(createPermissionMiddleware(permission));
