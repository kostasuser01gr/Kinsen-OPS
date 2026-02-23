import type { Permission } from "./permissions";
import { hasPermission } from "./permissions";
import { getTool } from "./tools/registry";
import type { Role } from "@prisma/client";

export interface ShortcutDef {
  id: string;
  name: string;
  actionType: string;
  promptTemplate?: string | null;
  toolName?: string | null;
  toolSequence?: unknown;
  defaultInputs?: unknown;
  isActive: boolean;
  permissionScopeRequired?: string | null;
}

export interface ShortcutContext {
  conversationId?: string | null;
  entityId?: string | null;
  entityType?: string | null;
  entityState?: string | null;
}

export interface ShortcutValidation {
  visible: boolean;
  enabled: boolean;
  disabledReason: string | null;
  missingContext: string[];
  missingPermissions: string[];
  configValid: boolean;
  validationCode: string;
}

/**
 * Validates whether a shortcut can be executed given the current context and user permissions.
 * Frontend-only — backend still enforces authoritatively.
 */
export function validateShortcutExecution(
  shortcut: ShortcutDef,
  context: ShortcutContext,
  userRole: string,
): ShortcutValidation {
  const missingContext: string[] = [];
  const missingPermissions: string[] = [];
  let configValid = true;
  let disabledReason: string | null = null;
  let validationCode = "ok";

  // 1. Check shortcut is active
  if (!shortcut.isActive) {
    return {
      visible: false,
      enabled: false,
      disabledReason: "Shortcut is inactive",
      missingContext: [],
      missingPermissions: [],
      configValid: true,
      validationCode: "inactive",
    };
  }

  // 2. Validate config completeness by action type
  switch (shortcut.actionType) {
    case "tool_action":
      if (!shortcut.toolName) {
        configValid = false;
        disabledReason = "Shortcut configuration invalid (missing tool_name)";
        validationCode = "config_invalid_no_tool";
      } else {
        const tool = getTool(shortcut.toolName);
        if (!tool) {
          configValid = false;
          disabledReason = `Tool "${shortcut.toolName}" not found`;
          validationCode = "config_invalid_unknown_tool";
        }
      }
      break;
    case "prompt_template":
      if (!shortcut.promptTemplate) {
        configValid = false;
        disabledReason = "Shortcut configuration invalid (missing prompt template)";
        validationCode = "config_invalid_no_template";
      }
      break;
    case "tool_sequence":
      if (!shortcut.toolSequence || !Array.isArray(shortcut.toolSequence) || (shortcut.toolSequence as unknown[]).length === 0) {
        configValid = false;
        disabledReason = "Shortcut configuration invalid (empty tool sequence)";
        validationCode = "config_invalid_no_sequence";
      }
      break;
    case "saved_view":
      // Saved views are always config-valid
      break;
    default:
      configValid = false;
      disabledReason = `Unknown action type: ${shortcut.actionType}`;
      validationCode = "config_invalid_unknown_action";
  }

  if (!configValid) {
    return {
      visible: true,
      enabled: false,
      disabledReason,
      missingContext,
      missingPermissions,
      configValid,
      validationCode,
    };
  }

  // 3. Check context requirements
  if (!context.conversationId && shortcut.actionType !== "saved_view") {
    missingContext.push("conversationId");
  }

  // 4. Check permissions
  // a) Check shortcut-level permission scope
  if (shortcut.permissionScopeRequired) {
    if (!hasPermission(userRole as Role, shortcut.permissionScopeRequired as Permission)) {
      missingPermissions.push(shortcut.permissionScopeRequired);
    }
  }

  // b) For tool_action, also check the tool's required permission
  if (shortcut.actionType === "tool_action" && shortcut.toolName) {
    const tool = getTool(shortcut.toolName);
    if (tool && !hasPermission(userRole as Role, tool.requiredPermission as Permission)) {
      missingPermissions.push(tool.requiredPermission);
    }
  }

  // c) For tool_sequence, check all tools in sequence
  if (shortcut.actionType === "tool_sequence" && Array.isArray(shortcut.toolSequence)) {
    for (const step of shortcut.toolSequence as Array<{ toolName: string }>) {
      const tool = getTool(step.toolName);
      if (tool && !hasPermission(userRole as Role, tool.requiredPermission as Permission)) {
        if (!missingPermissions.includes(tool.requiredPermission)) {
          missingPermissions.push(tool.requiredPermission);
        }
      }
    }
  }

  // Build final result
  if (missingContext.length > 0) {
    disabledReason = missingContext.includes("conversationId")
      ? "Start a conversation first"
      : `Missing context: ${missingContext.join(", ")}`;
    validationCode = "missing_context";
  } else if (missingPermissions.length > 0) {
    disabledReason = `Requires permission: ${missingPermissions.join(", ")}`;
    validationCode = "permission_denied";
  }

  const enabled = configValid && missingContext.length === 0 && missingPermissions.length === 0;

  return {
    visible: true,
    enabled,
    disabledReason,
    missingContext,
    missingPermissions,
    configValid,
    validationCode,
  };
}
