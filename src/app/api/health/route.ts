import { NextResponse } from "next/server";
import { db } from "@/server/db";

export async function GET() {
  try {
    const userCount = await db.user.count();
    const convCount = await db.conversation.count();
    const shortcutCount = await db.shortcut.count();
    return NextResponse.json({
      status: "ok",
      db: "connected",
      users: userCount,
      conversations: convCount,
      shortcuts: shortcutCount,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { status: "error", error: err instanceof Error ? err.message : "unknown" },
      { status: 500 }
    );
  }
}
