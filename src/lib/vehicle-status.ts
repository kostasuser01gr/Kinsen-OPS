export const VEHICLE_STATUS_TRANSITIONS: Record<string, string[]> = {
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
};

export function isValidTransition(from: string, to: string): boolean {
  const allowed = VEHICLE_STATUS_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
}

export const VEHICLE_STATUS_LABELS: Record<string, string> = {
  AVAILABLE: "Available",
  RESERVED_PREP_PENDING: "Reserved – Prep Pending",
  PICKUP_READY: "Pickup Ready",
  ON_RENT: "On Rent",
  RETURN_PENDING_CHECKIN: "Return – Check-in Pending",
  INSPECTION_IN_PROGRESS: "Inspection In Progress",
  CLEANING_PENDING: "Cleaning Pending",
  MAINTENANCE_PENDING: "Maintenance Pending",
  DAMAGE_HOLD: "Damage Hold",
  COMPLIANCE_HOLD: "Compliance Hold",
  TRANSFER_PENDING: "Transfer Pending",
  TRANSFER_IN_TRANSIT: "Transfer In Transit",
  OUT_OF_SERVICE: "Out of Service",
};

export const VEHICLE_STATUS_COLORS: Record<string, string> = {
  AVAILABLE: "bg-green-100 text-green-800",
  RESERVED_PREP_PENDING: "bg-blue-100 text-blue-800",
  PICKUP_READY: "bg-cyan-100 text-cyan-800",
  ON_RENT: "bg-purple-100 text-purple-800",
  RETURN_PENDING_CHECKIN: "bg-yellow-100 text-yellow-800",
  INSPECTION_IN_PROGRESS: "bg-orange-100 text-orange-800",
  CLEANING_PENDING: "bg-amber-100 text-amber-800",
  MAINTENANCE_PENDING: "bg-red-100 text-red-800",
  DAMAGE_HOLD: "bg-red-200 text-red-900",
  COMPLIANCE_HOLD: "bg-pink-100 text-pink-800",
  TRANSFER_PENDING: "bg-indigo-100 text-indigo-800",
  TRANSFER_IN_TRANSIT: "bg-indigo-200 text-indigo-900",
  OUT_OF_SERVICE: "bg-gray-200 text-gray-800",
};
