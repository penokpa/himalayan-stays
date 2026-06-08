import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export interface PromoApplyResult {
  ok: true;
  code: { id: string; code: string; discountPct: number };
  discountNpr: number;
  finalNpr: number;
}

export interface PromoApplyError {
  ok: false;
  error: string;
}

/**
 * Validate a promo code against a cart total. Returns either the discount + final price
 * or a friendly error reason. Does NOT increment used_count — that's the caller's job
 * within the booking creation transaction.
 */
export async function evaluatePromo(
  rawCode: string,
  totalNpr: number
): Promise<PromoApplyResult | PromoApplyError> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return { ok: false, error: "Enter a code" };

  const promo = await prisma.discountCode.findUnique({
    where: { code },
  });
  if (!promo) return { ok: false, error: "Code not found" };
  if (!promo.isActive) return { ok: false, error: "Code is inactive" };

  const now = new Date();
  if (promo.validFrom && now < promo.validFrom) {
    return { ok: false, error: `Code not valid until ${promo.validFrom.toISOString().slice(0, 10)}` };
  }
  if (promo.validUntil && now > promo.validUntil) {
    return { ok: false, error: "Code has expired" };
  }
  if (promo.maxUses !== null && promo.usedCount >= promo.maxUses) {
    return { ok: false, error: "Code has reached its usage limit" };
  }
  const minAmount = promo.minAmountNpr ? Number(promo.minAmountNpr) : 0;
  if (totalNpr < minAmount) {
    return {
      ok: false,
      error: `Minimum NPR ${minAmount.toLocaleString()} required for this code`,
    };
  }

  const pct = Number(promo.discountPct);
  const discountNpr = Math.round((totalNpr * pct) / 100);
  return {
    ok: true,
    code: { id: promo.id, code: promo.code, discountPct: pct },
    discountNpr,
    finalNpr: totalNpr - discountNpr,
  };
}

/**
 * Atomic increment of used_count. Returns true if the code was successfully consumed,
 * false if it was already at max_uses (race condition guard).
 */
export async function consumePromo(
  codeId: string,
  tx: Prisma.TransactionClient
): Promise<boolean> {
  const promo = await tx.discountCode.findUnique({
    where: { id: codeId },
    select: { maxUses: true, usedCount: true },
  });
  if (!promo) return false;
  if (promo.maxUses !== null && promo.usedCount >= promo.maxUses) return false;
  await tx.discountCode.update({
    where: { id: codeId },
    data: { usedCount: { increment: 1 } },
  });
  return true;
}
