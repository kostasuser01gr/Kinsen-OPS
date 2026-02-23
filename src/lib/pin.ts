import bcrypt from "bcryptjs";

const PIN_REGEX = /^\d{4}$/;
const SALT_ROUNDS = 12;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export function validatePin(pin: string): boolean {
  return PIN_REGEX.test(pin);
}

export function validateIdentifier(id: string): boolean {
  return /^[a-zA-Z0-9._-]{2,30}$/.test(id);
}

export async function hashPin(pin: string): Promise<string> {
  if (!validatePin(pin)) throw new Error("PIN must be exactly 4 digits");
  return bcrypt.hash(pin, SALT_ROUNDS);
}

export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash);
}

export function isLockedOut(
  failedAttempts: number,
  lockedUntil: Date | null
): { locked: boolean; remainingMs: number } {
  if (failedAttempts < MAX_FAILED_ATTEMPTS || !lockedUntil) {
    return { locked: false, remainingMs: 0 };
  }
  const remaining = lockedUntil.getTime() - Date.now();
  if (remaining <= 0) {
    return { locked: false, remainingMs: 0 };
  }
  return { locked: true, remainingMs: remaining };
}

export function getLockoutUntil(): Date {
  return new Date(Date.now() + LOCKOUT_DURATION_MS);
}

export { MAX_FAILED_ATTEMPTS, LOCKOUT_DURATION_MS };
