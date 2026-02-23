import type { ToolDefinition, SlashCommand } from "./types";
import { hasPermission } from "@/lib/permissions";
import type { Role } from "@prisma/client";

const tools = new Map<string, ToolDefinition>();
const slashCommands: SlashCommand[] = [];

export function registerTool(tool: ToolDefinition, slash?: Omit<SlashCommand, "toolName">) {
  tools.set(tool.name, tool);
  if (slash) {
    slashCommands.push({ ...slash, toolName: tool.name });
  }
}

export function getTool(name: string): ToolDefinition | undefined {
  return tools.get(name);
}

export function listTools(role?: string): ToolDefinition[] {
  const all = Array.from(tools.values());
  if (!role) return all;
  return all.filter((t) =>
    hasPermission(role as Role, t.requiredPermission as never)
  );
}

export function listSlashCommands(role?: string): SlashCommand[] {
  if (!role) return [...slashCommands];
  return slashCommands.filter((sc) => {
    const tool = tools.get(sc.toolName);
    return tool && hasPermission(role as Role, tool.requiredPermission as never);
  });
}

export function parseSlashCommand(input: string): { toolName: string; args: Record<string, string> } | null {
  const trimmed = input.trim();
  if (!trimmed.startsWith("/")) return null;

  const parts = trimmed.slice(1).split(/\s+/);
  const command = parts[0]?.toLowerCase();
  if (!command) return null;

  const sc = slashCommands.find((s) => s.command === command);
  if (!sc) return null;

  // Parse remaining as positional or key=value args
  const args: Record<string, string> = {};
  const rest = parts.slice(1);
  rest.forEach((part, i) => {
    if (part.includes("=")) {
      const [key, ...vals] = part.split("=");
      args[key] = vals.join("=");
    } else {
      args[`arg${i}`] = part;
    }
  });

  return { toolName: sc.toolName, args };
}
