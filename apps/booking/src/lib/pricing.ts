import { prisma } from "@/lib/prisma";
import { Season } from "@prisma/client";

export interface NightPrice {
  date: Date;
  priceNpr: number;
  season: Season | "BASE";
}

export interface RoomQuote {
  roomId: string;
  totalNpr: number;
  nights: NightPrice[];
}

function eachNight(checkIn: Date, checkOut: Date): Date[] {
  // Iterate in UTC so the cursor lands on the same instant Prisma uses for
  // `@db.Date` fields (`seasonPricing.startDate`/`endDate`). Mixing local and
  // UTC midnight here under-charges the first night of every season in
  // timezones ahead of UTC (e.g. Asia/Kathmandu = UTC+5:45).
  const nights: Date[] = [];
  const cursor = new Date(checkIn);
  cursor.setUTCHours(0, 0, 0, 0);
  const end = new Date(checkOut);
  end.setUTCHours(0, 0, 0, 0);
  while (cursor < end) {
    nights.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return nights;
}

const SEASON_PRIORITY: Record<Season, number> = {
  FESTIVAL: 4,
  PEAK: 3,
  SHOULDER: 2,
  OFF: 1,
};

export async function quoteRoom(
  roomId: string,
  checkIn: Date,
  checkOut: Date
): Promise<RoomQuote> {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    select: { basePriceNpr: true },
  });
  if (!room) throw new Error(`Room ${roomId} not found`);

  const basePrice = room.basePriceNpr.toNumber();
  const seasonRows = await prisma.seasonPricing.findMany({
    where: {
      roomId,
      startDate: { lt: checkOut },
      endDate: { gte: checkIn },
    },
    select: { season: true, startDate: true, endDate: true, priceNpr: true },
  });

  const nights = eachNight(checkIn, checkOut).map((date) => {
    const matches = seasonRows.filter(
      (r) => date >= r.startDate && date <= r.endDate
    );
    if (matches.length === 0) {
      return { date, priceNpr: basePrice, season: "BASE" as const };
    }
    const winner = matches.reduce((best, r) =>
      SEASON_PRIORITY[r.season] > SEASON_PRIORITY[best.season] ? r : best
    );
    return {
      date,
      priceNpr: winner.priceNpr.toNumber(),
      season: winner.season,
    };
  });

  const totalNpr = nights.reduce((sum, n) => sum + n.priceNpr, 0);
  return { roomId, totalNpr, nights };
}
