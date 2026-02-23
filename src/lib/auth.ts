import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/server/db";
import { verifyPin, isLockedOut, getLockoutUntil, MAX_FAILED_ATTEMPTS } from "@/lib/pin";
import type { Role } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: Role;
      branchId: string | null;
      image?: string | null;
    };
  }
  interface User {
    role: Role;
    branchId: string | null;
  }
}

declare module "next-auth" {
  interface JWT {
    id: string;
    role: Role;
    branchId: string | null;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        identifier: { label: "Staff ID", type: "text" },
        pin: { label: "PIN", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.identifier || !credentials?.pin) return null;

        const identifier = (credentials.identifier as string).trim().toLowerCase();
        const pin = credentials.pin as string;

        if (!/^\d{4}$/.test(pin)) return null;

        const user = await db.user.findUnique({
          where: { identifier },
        });

        if (!user || !user.isActive) return null;

        // Check lockout
        const lockout = isLockedOut(user.failedAttempts, user.lockedUntil);
        if (lockout.locked) return null;

        // If lockout expired, reset counter before checking PIN
        if (user.failedAttempts >= MAX_FAILED_ATTEMPTS && !lockout.locked) {
          await db.user.update({
            where: { id: user.id },
            data: { failedAttempts: 0, lockedUntil: null },
          });
        }

        const isValid = await verifyPin(pin, user.pinHash);

        if (!isValid) {
          const attempts = (user.failedAttempts >= MAX_FAILED_ATTEMPTS ? 0 : user.failedAttempts) + 1;
          const update: { failedAttempts: number; lockedUntil?: Date } = { failedAttempts: attempts };
          if (attempts >= MAX_FAILED_ATTEMPTS) {
            update.lockedUntil = getLockoutUntil();
          }
          await db.user.update({ where: { id: user.id }, data: update });

          // Audit: failed login
          await db.auditLog.create({
            data: {
              actorId: user.id,
              action: "auth.login_failed",
              entityType: "User",
              entityId: user.id,
              newState: { failedAttempts: attempts, locked: attempts >= MAX_FAILED_ATTEMPTS },
              branchId: user.branchId,
            },
          });

          return null;
        }

        // Success — reset lockout, update lastLoginAt
        await db.user.update({
          where: { id: user.id },
          data: { failedAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
        });

        // Audit: successful login
        await db.auditLog.create({
          data: {
            actorId: user.id,
            action: "auth.login_success",
            entityType: "User",
            entityId: user.id,
            branchId: user.branchId,
          },
        });

        return {
          id: user.id,
          email: user.email || user.identifier,
          name: user.name,
          role: user.role,
          branchId: user.branchId,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = user.role;
        token.branchId = user.branchId;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as Role;
      session.user.branchId = token.branchId as string | null;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
});
