import { z } from "zod";
import { router, protectedProcedure } from "@/server/trpc";
import "@/lib/tools/all-tools";
import { getTool, listTools, parseSlashCommand } from "@/lib/tools/registry";
import { hasPermission } from "@/lib/permissions";
import type { Role } from "@prisma/client";

// Structured error codes for frontend consumption
type ToolErrorCode =
  | "TOOL_NOT_FOUND"
  | "PERMISSION_DENIED"
  | "INVALID_INPUT"
  | "EXECUTION_ERROR"
  | "TOOL_UNAVAILABLE";

interface StructuredToolError {
  code: ToolErrorCode;
  message: string;
  toolName: string;
  requiredPermission?: string;
}

export const toolExecRouter = router({
  listTools: protectedProcedure.query(({ ctx }) => {
    return listTools(ctx.user.role).map((t) => ({
      name: t.name,
      displayName: t.displayName,
      description: t.description,
      category: t.category,
      isWriteAction: t.isWriteAction,
      requiredPermission: t.requiredPermission,
    }));
  }),

  listSlashCommands: protectedProcedure.query(({ ctx }) => {
    const { listSlashCommands } = require("@/lib/tools/registry");
    return listSlashCommands(ctx.user.role);
  }),

  // Precheck endpoint — validates tool executability without running it
  precheck: protectedProcedure
    .input(z.object({ toolName: z.string() }))
    .query(({ ctx, input }) => {
      const tool = getTool(input.toolName);
      if (!tool) {
        return { executable: false, code: "TOOL_NOT_FOUND" as ToolErrorCode, reason: `Tool "${input.toolName}" not found` };
      }
      if (!hasPermission(ctx.user.role as Role, tool.requiredPermission as never)) {
        return {
          executable: false,
          code: "PERMISSION_DENIED" as ToolErrorCode,
          reason: `Requires permission: ${tool.requiredPermission}`,
          requiredPermission: tool.requiredPermission,
        };
      }
      return { executable: true, code: null, reason: null };
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
        const error: StructuredToolError = {
          code: "TOOL_NOT_FOUND",
          message: `Unknown tool: ${input.toolName}`,
          toolName: input.toolName,
        };
        const msg = await ctx.db.message.create({
          data: {
            conversationId: input.conversationId,
            role: "system",
            content: error.message,
            toolName: input.toolName,
            toolOutput: JSON.parse(JSON.stringify({ error })),
          },
        });

        // Audit failed execution attempt
        await ctx.db.auditLog.create({
          data: {
            actorId: ctx.user.id,
            action: "tool.execute_failed",
            entityType: "Tool",
            entityId: input.toolName,
            newState: JSON.parse(JSON.stringify({ error: error.code, toolName: input.toolName })),
          },
        });

        return msg;
      }

      // Permission check
      if (!hasPermission(ctx.user.role as Role, tool.requiredPermission as never)) {
        const error: StructuredToolError = {
          code: "PERMISSION_DENIED",
          message: `Permission denied: requires ${tool.requiredPermission}`,
          toolName: input.toolName,
          requiredPermission: tool.requiredPermission,
        };
        const msg = await ctx.db.message.create({
          data: {
            conversationId: input.conversationId,
            role: "system",
            content: error.message,
            toolName: input.toolName,
            toolOutput: JSON.parse(JSON.stringify({ error })),
          },
        });

        await ctx.db.auditLog.create({
          data: {
            actorId: ctx.user.id,
            action: "tool.permission_denied",
            entityType: "Tool",
            entityId: input.toolName,
            newState: JSON.parse(JSON.stringify({
              error: error.code,
              requiredPermission: tool.requiredPermission,
              userRole: ctx.user.role,
            })),
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
      } catch (err) {
        const error: StructuredToolError = {
          code: "EXECUTION_ERROR",
          message: err instanceof Error ? err.message : "Unknown execution error",
          toolName: input.toolName,
        };

        const msg = await ctx.db.message.create({
          data: {
            conversationId: input.conversationId,
            role: "system",
            content: `Tool error: ${error.message}`,
            toolName: input.toolName,
            toolOutput: JSON.parse(JSON.stringify({ error })),
          },
        });

        await ctx.db.auditLog.create({
          data: {
            actorId: ctx.user.id,
            action: "tool.execute_error",
            entityType: "Tool",
            entityId: input.toolName,
            newState: JSON.parse(JSON.stringify({
              error: error.code,
              message: error.message,
              toolInput: input.input,
            })),
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
