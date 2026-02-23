/**
 * Generic state machine validator for entity lifecycle management.
 * Supports valid transitions, blocked transitions, override rules, and reason codes.
 */

export interface StateMachineConfig<TState extends string> {
  name: string;
  transitions: Record<TState, TState[]>;
  overrideAllowed?: TState[];        // states that can be force-transitioned with admin override
  requiresReason?: TState[];         // transitions TO these states require a reason
  terminalStates?: TState[];         // states that cannot transition out (except override)
}

export interface TransitionValidation<TState extends string> {
  valid: boolean;
  from: TState;
  to: TState;
  reason: string | null;
  allowedTransitions: TState[];
  isOverrideRequired: boolean;
  reasonRequired: boolean;
}

export function createStateMachine<TState extends string>(config: StateMachineConfig<TState>) {
  return {
    validate(from: TState, to: TState, hasOverridePermission = false): TransitionValidation<TState> {
      const allowed = config.transitions[from] ?? [];
      const isTerminal = config.terminalStates?.includes(from) ?? false;
      const isNormallyValid = allowed.includes(to);
      const reasonRequired = config.requiresReason?.includes(to) ?? false;

      if (isNormallyValid) {
        return { valid: true, from, to, reason: null, allowedTransitions: allowed, isOverrideRequired: false, reasonRequired };
      }

      // Check if override is possible
      if (hasOverridePermission && config.overrideAllowed?.includes(to)) {
        return { valid: true, from, to, reason: null, allowedTransitions: allowed, isOverrideRequired: true, reasonRequired: true };
      }

      const msg = isTerminal
        ? `${from} is a terminal state in ${config.name}. Admin override required.`
        : `Invalid ${config.name} transition: ${from} → ${to}. Allowed: ${allowed.join(", ") || "none"}`;

      return { valid: false, from, to, reason: msg, allowedTransitions: allowed, isOverrideRequired: false, reasonRequired: false };
    },

    getAllowedTransitions(from: TState): TState[] {
      return config.transitions[from] ?? [];
    },

    isTerminal(state: TState): boolean {
      return config.terminalStates?.includes(state) ?? false;
    },
  };
}

// ─── VEHICLE STATE MACHINE ──────────────────────────────

export const vehicleStateMachine = createStateMachine({
  name: "VehicleStatus",
  transitions: {
    AVAILABLE: ["RESERVED_PREP_PENDING", "MAINTENANCE_PENDING", "OUT_OF_SERVICE", "TRANSFER_PENDING"],
    RESERVED_PREP_PENDING: ["PICKUP_READY", "AVAILABLE"],
    PICKUP_READY: ["ON_RENT", "AVAILABLE"],
    ON_RENT: ["RETURN_PENDING_CHECKIN"],
    RETURN_PENDING_CHECKIN: ["INSPECTION_IN_PROGRESS"],
    INSPECTION_IN_PROGRESS: ["CLEANING_PENDING", "DAMAGE_HOLD", "AVAILABLE"],
    CLEANING_PENDING: ["AVAILABLE", "MAINTENANCE_PENDING"],
    MAINTENANCE_PENDING: ["AVAILABLE", "OUT_OF_SERVICE"],
    DAMAGE_HOLD: ["MAINTENANCE_PENDING", "OUT_OF_SERVICE", "AVAILABLE"],
    COMPLIANCE_HOLD: ["AVAILABLE", "OUT_OF_SERVICE"],
    TRANSFER_PENDING: ["TRANSFER_IN_TRANSIT"],
    TRANSFER_IN_TRANSIT: ["AVAILABLE"],
    OUT_OF_SERVICE: ["AVAILABLE", "MAINTENANCE_PENDING"],
  } as Record<string, string[]>,
  overrideAllowed: ["AVAILABLE", "OUT_OF_SERVICE", "MAINTENANCE_PENDING"],
  requiresReason: ["OUT_OF_SERVICE", "DAMAGE_HOLD", "COMPLIANCE_HOLD"],
});

// ─── RENTAL STATE MACHINE ───────────────────────────────

export const rentalStateMachine = createStateMachine({
  name: "RentalStatus",
  transitions: {
    DRAFT: ["CONFIRMED", "CANCELLED"],
    CONFIRMED: ["ACTIVE", "CANCELLED"],
    ACTIVE: ["COMPLETED", "CANCELLED"],
    COMPLETED: ["CLOSED" as string],
    CANCELLED: [],
    NO_SHOW: [],
    CLOSED: [],
  } as Record<string, string[]>,
  terminalStates: ["CANCELLED", "CLOSED"],
  requiresReason: ["CANCELLED"],
});

// ─── TASK STATE MACHINE ─────────────────────────────────

export const taskStateMachine = createStateMachine({
  name: "TaskStatus",
  transitions: {
    PENDING: ["IN_PROGRESS", "BLOCKED", "CANCELLED"],
    IN_PROGRESS: ["COMPLETED", "BLOCKED", "CANCELLED"],
    BLOCKED: ["PENDING", "IN_PROGRESS", "CANCELLED"],
    COMPLETED: [],
    CANCELLED: [],
  } as Record<string, string[]>,
  terminalStates: ["COMPLETED", "CANCELLED"],
  requiresReason: ["BLOCKED", "CANCELLED"],
});

// ─── MAINTENANCE STATE MACHINE ──────────────────────────

export const maintenanceStateMachine = createStateMachine({
  name: "MaintenanceStatus",
  transitions: {
    REQUESTED: ["APPROVED", "DENIED", "CANCELLED"],
    APPROVED: ["SCHEDULED", "CANCELLED"],
    SCHEDULED: ["IN_PROGRESS", "CANCELLED"],
    IN_PROGRESS: ["COMPLETED", "PAUSED", "NEEDS_RECHECK"],
    PAUSED: ["IN_PROGRESS", "CANCELLED"],
    NEEDS_RECHECK: ["IN_PROGRESS", "COMPLETED"],
    COMPLETED: [],
    CANCELLED: [],
    DENIED: [],
  } as Record<string, string[]>,
  terminalStates: ["COMPLETED", "CANCELLED", "DENIED"],
  requiresReason: ["DENIED", "CANCELLED", "PAUSED"],
});

// ─── CLAIM STATE MACHINE ────────────────────────────────

export const claimStateMachine = createStateMachine({
  name: "ClaimStatus",
  transitions: {
    DRAFT: ["SUBMITTED"],
    SUBMITTED: ["UNDER_REVIEW"],
    UNDER_REVIEW: ["APPROVED", "DENIED", "NEEDS_INFO"],
    NEEDS_INFO: ["SUBMITTED"],
    APPROVED: ["SETTLED"],
    DENIED: ["APPEAL", "CLOSED"],
    APPEAL: ["UNDER_REVIEW"],
    SETTLED: ["CLOSED"],
    CLOSED: [],
  } as Record<string, string[]>,
  terminalStates: ["CLOSED"],
  requiresReason: ["DENIED"],
});

// ─── APPROVAL STATE MACHINE ────────────────────────────

export const approvalStateMachine = createStateMachine({
  name: "ApprovalStatus",
  transitions: {
    PENDING: ["APPROVED", "DENIED", "EXPIRED", "ESCALATED"],
    ESCALATED: ["APPROVED", "DENIED", "EXPIRED"],
    APPROVED: [],
    DENIED: [],
    EXPIRED: [],
  } as Record<string, string[]>,
  terminalStates: ["APPROVED", "DENIED", "EXPIRED"],
  requiresReason: ["DENIED"],
});

// ─── INSPECTION STATE MACHINE ───────────────────────────

export const inspectionStateMachine = createStateMachine({
  name: "InspectionStatus",
  transitions: {
    PENDING: ["IN_PROGRESS"],
    IN_PROGRESS: ["COMPLETED", "DISPUTED"],
    COMPLETED: [],
    DISPUTED: ["IN_PROGRESS"],
  } as Record<string, string[]>,
  terminalStates: ["COMPLETED"],
});
