import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { validatePin, validateIdentifier, hashPin } from "@/lib/pin";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { identifier, name, pin, confirmPin } = body;

    // Validate required fields
    if (!identifier || !name || !pin || !confirmPin) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    // Validate identifier format
    const cleanId = identifier.trim().toLowerCase();
    if (!validateIdentifier(cleanId)) {
      return NextResponse.json(
        { error: "Identifier must be 2-30 characters (letters, numbers, dots, hyphens, underscores)" },
        { status: 400 }
      );
    }

    // Validate name
    const cleanName = name.trim();
    if (cleanName.length < 2 || cleanName.length > 100) {
      return NextResponse.json(
        { error: "Name must be 2-100 characters" },
        { status: 400 }
      );
    }

    // Validate PIN format
    if (!validatePin(pin)) {
      return NextResponse.json(
        { error: "PIN must be exactly 4 digits" },
        { status: 400 }
      );
    }

    // Confirm PIN match
    if (pin !== confirmPin) {
      return NextResponse.json(
        { error: "PINs do not match" },
        { status: 400 }
      );
    }

    // Check if identifier already taken
    const existing = await db.user.findUnique({
      where: { identifier: cleanId },
    });
    if (existing) {
      return NextResponse.json(
        { error: "This identifier is already in use" },
        { status: 409 }
      );
    }

    // Hash PIN and create user
    const pinHash = await hashPin(pin);
    const user = await db.user.create({
      data: {
        identifier: cleanId,
        name: cleanName,
        pinHash,
      },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        actorId: user.id,
        action: "auth.signup",
        entityType: "User",
        entityId: user.id,
        newState: { identifier: cleanId, role: user.role },
      },
    });

    return NextResponse.json(
      { success: true, identifier: cleanId },
      { status: 201 }
    );
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
