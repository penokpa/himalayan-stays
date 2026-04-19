import { TrekRoute } from "@prisma/client";

export const TREK_ROUTES: {
  key: TrekRoute;
  name: string;
  slug: string;
  description: string;
  gradient: string;
}[] = [
  {
    key: "EBC",
    name: "Everest Base Camp",
    slug: "ebc",
    description:
      "Trek to the foot of the world's highest peak through Sherpa villages and dramatic Himalayan landscapes.",
    gradient: "from-sky-600 to-indigo-700",
  },
  {
    key: "ABC",
    name: "Annapurna Base Camp",
    slug: "abc",
    description:
      "Journey into the heart of the Annapurna Sanctuary, surrounded by towering peaks and pristine glaciers.",
    gradient: "from-orange-500 to-rose-600",
  },
  {
    key: "LANGTANG",
    name: "Langtang Valley",
    slug: "langtang",
    description:
      "Explore the beautiful Langtang Valley, known as the valley of glaciers, close to Kathmandu.",
    gradient: "from-emerald-500 to-teal-700",
  },
  {
    key: "MANASLU",
    name: "Manaslu Circuit",
    slug: "manaslu",
    description:
      "A remote and less-crowded circuit around the world's eighth highest mountain with rich cultural diversity.",
    gradient: "from-violet-500 to-purple-700",
  },
  {
    key: "UPPER_MUSTANG",
    name: "Upper Mustang",
    slug: "upper-mustang",
    description:
      "Discover the ancient kingdom of Lo, a rain-shadow desert with stunning eroded cliffs and Tibetan culture.",
    gradient: "from-amber-500 to-red-600",
  },
];

export const SLUG_TO_ROUTE: Record<string, { key: TrekRoute; name: string }> =
  Object.fromEntries(
    TREK_ROUTES.map((r) => [r.slug, { key: r.key, name: r.name }])
  );
