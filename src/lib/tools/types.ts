import { z } from "zod";
import type { PrismaClient } from "@prisma/client";

export interface ToolContext {
  userId: string;
  role: string;
  branchId: string | null;
  db: PrismaClient;
}

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  displayMode: "card" | "table" | "text" | "stat";
  title: string;
}

export interface ToolDefinition {
  name: string;
  displayName: string;
  description: string;
  category: string;
  requiredPermission: string;
  isWriteAction: boolean;
  inputSchema: z.ZodType<Record<string, unknown>>;
  execute: (input: Record<string, unknown>, ctx: ToolContext) => Promise<ToolResult>;
}

export interface SlashCommand {
  command: string;
  toolName: string;
  description: string;
  usage: string;
}
