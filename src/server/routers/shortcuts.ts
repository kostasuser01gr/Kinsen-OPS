import { z } from "zod";
import { router, protectedProcedure } from "@/server/trpc";
import { hasPermission } from "@/lib/permissions";
import type { Role } from "@prisma/client";

export const shortcutRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.shortcut.findMany({
      where: {
        isActive: true,
        OR: [
          { createdById: ctx.user.id },
          { visibilityScope: "org" },
          { visibilityScope: "branch" },
          { visibilityScope: "team" },
        ],
      },
      orderBy: { name: "asc" },
      include: {
        createdBy: { select: { name: true, identifier: true } },
      },
    });
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(50),
        description: z.string().max(200).optional(),
        icon: z.string().max(30).optional(),
        actionType: z.enum(["prompt_template", "tool_action", "tool_sequence", "saved_view"]),
        promptTemplate: z.string().optional(),
        toolName: z.string().optional(),
        toolSequence: z.array(z.object({ toolName: z.string(), input: z.record(z.string(), z.unknown()) })).optional(),
        defaultInputs: z.record(z.string(), z.unknown()).optional(),
        outputMode: z.enum(["chat", "widget", "table"]).default("chat"),
        permissionScopeRequired: z.string().optional(),
        visibilityScope: z.enum(["private", "team", "branch", "org"]).default("private"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Only admins/managers can create org/branch shortcuts
      if (["org", "branch"].includes(input.visibilityScope)) {
        if (!hasPermission(ctx.user.role as Role, "admin:manage_users" as never)) {
          const canManage = hasPermission(ctx.user.role as Role, "admin:manage_branches" as never);
          if (!canManage) {
            throw new Error("Only managers and admins can create shared shortcuts");
          }
        }
      }

      const shortcut = await ctx.db.shortcut.create({
        data: {
          ...input,
          toolSequence: input.toolSequence ? (input.toolSequence as never) : undefined,
          defaultInputs: input.defaultInputs ? (input.defaultInputs as never) : undefined,
          createdById: ctx.user.id,
        },
      });

      // Audit
      await ctx.db.auditLog.create({
        data: {
          actorId: ctx.user.id,
          action: "shortcut.create",
          entityType: "Shortcut",
          entityId: shortcut.id,
          newState: { name: input.name, actionType: input.actionType, visibility: input.visibilityScope },
        },
      });

      return shortcut;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(50).optional(),
        description: z.string().max(200).optional(),
        icon: z.string().max(30).optional(),
        promptTemplate: z.string().optional(),
        toolName: z.string().optional(),
        defaultInputs: z.record(z.string(), z.unknown()).optional(),
        outputMode: z.enum(["chat", "widget", "table"]).optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const existing = await ctx.db.shortcut.findFirst({
        where: { id, createdById: ctx.user.id },
      });
      if (!existing) throw new Error("Shortcut not found or not owned by you");

      return ctx.db.shortcut.update({
        where: { id },
        data: { ...data, defaultInputs: data.defaultInputs as never },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.shortcut.findFirst({
        where: { id: input.id, createdById: ctx.user.id },
      });
      if (!existing) throw new Error("Shortcut not found or not owned by you");

      await ctx.db.shortcut.delete({ where: { id: input.id } });

      await ctx.db.auditLog.create({
        data: {
          actorId: ctx.user.id,
          action: "shortcut.delete",
          entityType: "Shortcut",
          entityId: input.id,
          previousState: { name: existing.name },
        },
      });

      return { success: true };
    }),
});
