import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SignJWT } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.PMS_JWT_SECRET ?? "pms-dev-secret-change-in-production"
);

const TOKEN_EXPIRY_HOURS = 24;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { apiKey } = body;

    if (!apiKey) {
      return NextResponse.json(
        { error: "apiKey is required" },
        { status: 400 }
      );
    }

    // Validate API key
    const device = await prisma.lodgeDevice.findUnique({
      where: { apiKey },
    });

    if (!device || !device.isActive) {
      return NextResponse.json(
        { error: "Invalid or inactive API key" },
        { status: 401 }
      );
    }

    // Update lastSyncAt
    await prisma.lodgeDevice.update({
      where: { id: device.id },
      data: { lastSyncAt: new Date() },
    });

    // Generate JWT token
    const expiresAt = new Date(
      Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000
    );

    const token = await new SignJWT({
      lodgeId: device.lodgeId,
      deviceId: device.id,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime(expiresAt)
      .sign(JWT_SECRET);

    return NextResponse.json({
      lodgeId: device.lodgeId,
      token,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("POST /api/pms/auth error:", error);
    return NextResponse.json(
      { error: "Failed to authenticate device" },
      { status: 500 }
    );
  }
}
