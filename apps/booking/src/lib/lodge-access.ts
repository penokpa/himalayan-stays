import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type LodgeAccessResult =
  | { ok: true; userId: string; role: "ADMIN" | "LODGE_OWNER" }
  | { ok: false; status: 401 | 403 | 404; error: string };

/**
 * Resolve whether the current session can manage a lodge.
 * - ADMIN can manage any lodge.
 * - LODGE_OWNER can manage only lodges where lodge.ownerId === their userId.
 * - Anyone else gets 403.
 */
export async function checkLodgeAccess(lodgeId: string): Promise<LodgeAccessResult> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }
  const role = session.user.role as string;
  const userId = session.user.id as string;

  if (role === "ADMIN") {
    return { ok: true, userId, role: "ADMIN" };
  }
  if (role !== "LODGE_OWNER") {
    return { ok: false, status: 403, error: "Forbidden" };
  }

  const lodge = await prisma.lodge.findUnique({
    where: { id: lodgeId },
    select: { ownerId: true },
  });
  if (!lodge) {
    return { ok: false, status: 404, error: "Lodge not found" };
  }
  if (lodge.ownerId !== userId) {
    return { ok: false, status: 403, error: "You don't own this lodge" };
  }
  return { ok: true, userId, role: "LODGE_OWNER" };
}
