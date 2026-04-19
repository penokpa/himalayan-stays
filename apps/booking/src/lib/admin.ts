import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/**
 * Checks that the request comes from an authenticated admin user.
 * Returns NextResponse with 401/403 on failure, or null on success.
 */
export async function requireAdmin(): Promise<NextResponse | null> {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as { role?: string }).role;

  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return null;
}
