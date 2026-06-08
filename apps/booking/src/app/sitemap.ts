import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { TREK_ROUTES } from "@/lib/trek-routes";

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lodges = await prisma.lodge.findMany({
    where: { isActive: true },
    select: { slug: true, updatedAt: true },
  });

  const now = new Date();

  return [
    {
      url: `${SITE_URL}/`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/treks`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    ...TREK_ROUTES.map((r) => ({
      url: `${SITE_URL}/treks/${r.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...lodges.map((l) => ({
      url: `${SITE_URL}/lodge/${l.slug}`,
      lastModified: l.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
