import { Role } from "@prisma/client";

export type Permission =
  | "fleet:read"
  | "fleet:write"
  | "fleet:transition"
  | "fleet:transfer"
  | "fleet:override"
  | "rental:read"
  | "rental:write"
  | "rental:cancel"
  | "pickup:execute"
  | "pickup:waive_deposit"
  | "task:read"
  | "task:write"
  | "task:assign"
  | "task:complete"
  | "incident:read"
  | "incident:write"
  | "incident:resolve"
  | "claims:read"
  | "claims:manage"
  | "claims:settle"
  | "maintenance:read"
  | "maintenance:request"
  | "maintenance:approve"
  | "finance:read"
  | "finance:write"
  | "finance:approve_refund"
  | "finance:override"
  | "chat:read"
  | "chat:write"
  | "analytics:read"
  | "analytics:branch_compare"
  | "audit:read"
  | "approval:read"
  | "approval:decide"
  | "shortcut:create"
  | "shortcut:publish_branch"
  | "shortcut:publish_org"
  | "admin:manage_users"
  | "admin:manage_branches"
  | "export:data";

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  BRANCH_AGENT: [
    "fleet:read", "fleet:transition",
    "rental:read", "rental:write",
    "pickup:execute",
    "task:read", "task:write", "task:complete",
    "incident:read", "incident:write",
    "maintenance:read",
    "finance:read",
    "chat:read", "chat:write",
    "shortcut:create",
  ],
  SHIFT_SUPERVISOR: [
    "fleet:read", "fleet:write", "fleet:transition",
    "rental:read", "rental:write", "rental:cancel",
    "pickup:execute",
    "task:read", "task:write", "task:assign", "task:complete",
    "incident:read", "incident:write",
    "maintenance:read", "maintenance:request",
    "finance:read",
    "chat:read", "chat:write",
    "analytics:read",
    "shortcut:create",
  ],
  BRANCH_MANAGER: [
    "fleet:read", "fleet:write", "fleet:transition", "fleet:transfer",
    "rental:read", "rental:write", "rental:cancel",
    "pickup:execute", "pickup:waive_deposit",
    "task:read", "task:write", "task:assign", "task:complete",
    "incident:read", "incident:write", "incident:resolve",
    "claims:read",
    "maintenance:read", "maintenance:request", "maintenance:approve",
    "finance:read", "finance:write", "finance:approve_refund",
    "chat:read", "chat:write",
    "analytics:read",
    "audit:read",
    "approval:read", "approval:decide",
    "shortcut:create", "shortcut:publish_branch",
    "export:data",
  ],
  FLEET_COORDINATOR: [
    "fleet:read", "fleet:write", "fleet:transition", "fleet:transfer",
    "rental:read",
    "task:read", "task:write", "task:assign", "task:complete",
    "incident:read",
    "maintenance:read", "maintenance:request", "maintenance:approve",
    "chat:read", "chat:write",
    "analytics:read",
    "shortcut:create",
    "export:data",
  ],
  DAMAGE_CLAIMS_STAFF: [
    "fleet:read",
    "rental:read",
    "task:read", "task:write", "task:complete",
    "incident:read", "incident:write", "incident:resolve",
    "claims:read", "claims:manage",
    "maintenance:read",
    "finance:read",
    "chat:read", "chat:write",
    "shortcut:create",
    "export:data",
  ],
  FINANCE_STAFF: [
    "fleet:read",
    "rental:read",
    "task:read", "task:write", "task:complete",
    "finance:read", "finance:write",
    "chat:read", "chat:write",
    "shortcut:create",
    "export:data",
  ],
  FINANCE_MANAGER: [
    "fleet:read",
    "rental:read",
    "pickup:waive_deposit",
    "task:read", "task:write", "task:assign", "task:complete",
    "claims:read",
    "finance:read", "finance:write", "finance:approve_refund", "finance:override",
    "chat:read", "chat:write",
    "analytics:read",
    "audit:read",
    "approval:read", "approval:decide",
    "shortcut:create",
    "export:data",
  ],
  OPERATIONS_DIRECTOR: [
    "fleet:read", "fleet:write", "fleet:transition", "fleet:transfer", "fleet:override",
    "rental:read", "rental:write", "rental:cancel",
    "pickup:execute", "pickup:waive_deposit",
    "task:read", "task:write", "task:assign", "task:complete",
    "incident:read", "incident:write", "incident:resolve",
    "claims:read", "claims:manage", "claims:settle",
    "maintenance:read", "maintenance:request", "maintenance:approve",
    "finance:read", "finance:write", "finance:approve_refund", "finance:override",
    "chat:read", "chat:write",
    "analytics:read", "analytics:branch_compare",
    "audit:read",
    "approval:read", "approval:decide",
    "shortcut:create", "shortcut:publish_org",
    "export:data",
  ],
  ADMIN: [
    "fleet:read", "fleet:write", "fleet:transition", "fleet:transfer", "fleet:override",
    "rental:read", "rental:write", "rental:cancel",
    "pickup:execute", "pickup:waive_deposit",
    "task:read", "task:write", "task:assign", "task:complete",
    "incident:read", "incident:write", "incident:resolve",
    "claims:read", "claims:manage", "claims:settle",
    "maintenance:read", "maintenance:request", "maintenance:approve",
    "finance:read", "finance:write", "finance:approve_refund", "finance:override",
    "chat:read", "chat:write",
    "analytics:read", "analytics:branch_compare",
    "audit:read",
    "approval:read", "approval:decide",
    "shortcut:create", "shortcut:publish_branch", "shortcut:publish_org",
    "export:data",
    "admin:manage_users", "admin:manage_branches",
  ],
  AUDITOR: [
    "fleet:read",
    "rental:read",
    "task:read",
    "incident:read",
    "claims:read",
    "maintenance:read",
    "finance:read",
    "analytics:read", "analytics:branch_compare",
    "audit:read",
    "approval:read",
    "export:data",
  ],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function getPermissions(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export function hasAnyPermission(role: Role, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(role, p));
}
