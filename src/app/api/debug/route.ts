import { NextResponse } from "next/server";
import { db } from "@/server/db";

export async function GET() {
  const checks: Record<string, unknown> = {};

  // Check 1: ENV vars
  checks.hasDbUrl = !!process.env.DATABASE_URL;
  checks.dbUrlPrefix = process.env.DATABASE_URL?.substring(0, 30) + "...";
  checks.hasAuthSecret = !!process.env.AUTH_SECRET;
  checks.hasAuthTrustHost = !!process.env.AUTH_TRUST_HOST;
  checks.nodeEnv = process.env.NODE_ENV;

  // Check 2: DB connection
  try {
    const count = await db.user.count();
    checks.dbConnection = "OK";
    checks.userCount = count;
  } catch (e) {
    checks.dbConnection = "FAILED";
    checks.dbError = e instanceof Error ? e.message : String(e);
  }

  return NextResponse.json(checks);
}
