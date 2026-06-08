import { prisma } from "@/lib/prisma";

export interface ChecklistItem {
  key: "details" | "rooms" | "photos" | "publish";
  label: string;
  done: boolean;
}

export interface LodgeProgress {
  lodgeId: string;
  lodgeName: string;
  lodgeSlug: string;
  isActive: boolean;
  items: ChecklistItem[];
  completedCount: number;
  totalCount: number;
  isComplete: boolean;
  /** /owner/lodges/[id] */
  manageUrl: string;
}

/** Compute the per-lodge setup checklist for a single lodge. */
export async function getLodgeProgress(lodgeId: string): Promise<LodgeProgress | null> {
  const lodge = await prisma.lodge.findUnique({
    where: { id: lodgeId },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      photos: true,
      isActive: true,
      _count: { select: { rooms: { where: { isActive: true } } } },
    },
  });
  if (!lodge) return null;

  const hasDescription = !!lodge.description && lodge.description.trim().length >= 20;
  const hasRoom = lodge._count.rooms > 0;
  const hasPhoto = lodge.photos.length > 0;

  const items: ChecklistItem[] = [
    {
      key: "details",
      label: "Add a description",
      done: hasDescription,
    },
    {
      key: "rooms",
      label: "Add at least one room",
      done: hasRoom,
    },
    {
      key: "photos",
      label: "Upload at least one photo",
      done: hasPhoto,
    },
    {
      key: "publish",
      label: "Publish (toggle Active in Lodge details)",
      done: lodge.isActive,
    },
  ];
  const completedCount = items.filter((i) => i.done).length;

  return {
    lodgeId: lodge.id,
    lodgeName: lodge.name,
    lodgeSlug: lodge.slug,
    isActive: lodge.isActive,
    items,
    completedCount,
    totalCount: items.length,
    isComplete: completedCount === items.length,
    manageUrl: `/owner/lodges/${lodge.id}`,
  };
}

/** All lodge progress entries for an owner, filtered to incomplete unless includeComplete. */
export async function getOwnerProgress(
  userId: string,
  includeComplete = false
): Promise<LodgeProgress[]> {
  const lodges = await prisma.lodge.findMany({
    where: { ownerId: userId },
    select: { id: true },
    orderBy: { createdAt: "desc" },
  });
  const all = await Promise.all(lodges.map((l) => getLodgeProgress(l.id)));
  const filtered = all.filter((p): p is LodgeProgress => !!p);
  return includeComplete ? filtered : filtered.filter((p) => !p.isComplete);
}
