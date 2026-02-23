import { Role } from "@prisma/client";

export type Permission =
  | "fleet:read"
  | "fleet:write"
  | "fleet:transition"
  | "fleet:transfer"
  | "rental:read"
  | "rental:write"
  | "rental:cancel"
  | "task:read"
  | "task:write"
  | "task:assign"
  | "task:complete"
  | "incident:read"
  | "incident:write"
  | "incident:resolve"
  | "finance:read"
  | "finance:write"
  | "finance:approve_refund"
  | "finance:override"
  | "chat:read"
  | "chat:write"
  | "analytics:read"
  | "analytics:branch_compare"
  | "audit:read"
  | "admin:manage_users"
  | "admin:manage_branches";

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  BRANCH_AGENT: [
    "fleet:read", "fleet:transition",
    "rental:read", "rental:write",
    "task:read", "task:write", "task:complete",
    "incident:read", "incident:write",
    "finance:read",
    "chat:read", "chat:write",
  ],
  SHIFT_SUPERVISOR: [
    "fleet:read", "fleet:write", "fleet:transition",
    "rental:read", "rental:write", "rental:cancel",
    "task:read", "task:write", "task:assign", "task:complete",
    "incident:read", "incident:write",
    "finance:read",
    "chat:read", "chat:write",
    "analytics:read",
  ],
  BRANCH_MANAGER: [
    "fleet:read", "fleet:write", "fleet:transition", "fleet:transfer",
    "rental:read", "rental:write", "rental:cancel",
    "task:read", "task:write", "task:assign", "task:complete",
    "incident:read", "incident:write", "incident:resolve",
    "finance:read", "finance:write", "finance:approve_refund",
    "chat:read", "chat:write",
    "analytics:read",
    "audit:read",
  ],
  FLEET_COORDINATOR: [
    "fleet:read", "fleet:write", "fleet:transition", "fleet:transfer",
    "rental:read",
    "task:read", "task:write", "task:assign", "task:complete",
    "incident:read",
    "chat:read", "chat:write",
    "analytics:read",
  ],
  DAMAGE_CLAIMS_STAFF: [
    "fleet:read",
    "rental:read",
    "incident:read", "incident:write", "incident:resolve",
    "finance:read",
    "chat:read", "chat:write",
  ],
  FINANCE_STAFF: [
    "fleet:read",
    "rental:read",
    "finance:read", "finance:write",
    "chat:read", "chat:write",
  ],
  FINANCE_MANAGER: [
    "fleet:read",
    "rental:read",
    "finance:read", "finance:write", "finance:approve_refund", "finance:override",
    "chat:read", "chat:write",
    "analytics:read",
    "audit:read",
  ],
  OPERATIONS_DIRECTOR: [
    "fleet:read", "fleet:write", "fleet:transition", "fleet:transfer",
    "rental:read", "rental:write", "rental:cancel",
    "task:read", "task:write", "task:assign", "task:complete",
    "incident:read", "incident:write", "incident:resolve",
    "finance:read", "finance:write", "finance:approve_refund", "finance:override",
    "chat:read", "chat:write",
    "analytics:read", "analytics:branch_compare",
    "audit:read",
  ],
  ADMIN: [
    "fleet:read", "fleet:write", "fleet:transition", "fleet:transfer",
    "rental:read", "rental:write", "rental:cancel",
    "task:read", "task:write", "task:assign", "task:complete",
    "incident:read", "incident:write", "incident:resolve",
    "finance:read", "finance:write", "finance:approve_refund", "finance:override",
    "chat:read", "chat:write",
    "analytics:read", "analytics:branch_compare",
    "audit:read",
    "admin:manage_users", "admin:manage_branches",
  ],
  AUDITOR: [
    "fleet:read",
    "rental:read",
    "task:read",
    "incident:read",
    "finance:read",
    "analytics:read", "analytics:branch_compare",
    "audit:read",
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
