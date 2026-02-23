import { z } from "zod";
import { router, protectedProcedure } from "@/server/trpc";
import "@/lib/tools/all-tools";
import { getTool, listTools, parseSlashCommand } from "@/lib/tools/registry";
import { hasPermission } from "@/lib/permissions";
import type { Role } from "@prisma/client";

export const toolExecRouter = router({
  listTools: protectedProcedure.query(({ ctx }) => {
    return listTools(ctx.user.role).map((t) => ({
      name: t.name,
      displayName: t.displayName,
      description: t.description,
      category: t.category,
      isWriteAction: t.isWriteAction,
    }));
  }),

  listSlashCommands: protectedProcedure.query(({ ctx }) => {
    const { listSlashCommands } = require("@/lib/tools/registry");
    return listSlashCommands(ctx.user.role);
  }),

  execute: protectedProcedure
    .input(
      z.object({
        conversationId: z.string(),
        toolName: z.string(),
        input: z.record(z.string(), z.unknown()).default({}),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tool = getTool(input.toolName);
      if (!tool) {
        // Store error as system message
        const msg = await ctx.db.message.create({
          data: {
            conversationId: input.conversationId,
            role: "system",
            content: `Unknown tool: ${input.toolName}`,
          },
        });
        return msg;
      }

      // Permission check
      if (!hasPermission(ctx.user.role as Role, tool.requiredPermission as never)) {
        const msg = await ctx.db.message.create({
          data: {
            conversationId: input.conversationId,
            role: "system",
            content: `Permission denied: requires ${tool.requiredPermission}`,
          },
        });
        return msg;
      }

      // Execute tool
      try {
        const result = await tool.execute(input.input, {
          userId: ctx.user.id,
          role: ctx.user.role,
          branchId: ctx.user.branchId,
          db: ctx.db,
        });

        // Audit log for write actions
        if (tool.isWriteAction) {
          await ctx.db.auditLog.create({
            data: {
              actorId: ctx.user.id,
              action: `tool.${input.toolName}`,
              entityType: "Tool",
              entityId: input.toolName,
              newState: JSON.parse(JSON.stringify({ toolInput: input.input, result: result.success })),
            },
          });
        }

        // Store tool result message
        const msg = await ctx.db.message.create({
          data: {
            conversationId: input.conversationId,
            role: "tool_result",
            content: result.title,
            toolName: input.toolName,
            toolInput: JSON.parse(JSON.stringify(input.input)),
            toolOutput: JSON.parse(JSON.stringify(result)),
          },
        });

        // Update conversation timestamp
        await ctx.db.conversation.update({
          where: { id: input.conversationId },
          data: { updatedAt: new Date() },
        });

        return msg;
      } catch (error) {
        const msg = await ctx.db.message.create({
          data: {
            conversationId: input.conversationId,
            role: "system",
            content: `Tool error: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
        });
        return msg;
      }
    }),

  parseCommand: protectedProcedure
    .input(z.object({ text: z.string() }))
    .query(({ input }) => {
      return parseSlashCommand(input.text);
    }),
});
