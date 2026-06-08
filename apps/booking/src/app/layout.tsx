import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { cookies } from "next/headers";
import "./global.css";
import Providers from "@/components/Providers";
import Navbar from "@/components/Navbar";
import CompareBar from "@/components/CompareBar";
import { THEME_COOKIE, parseTheme } from "@/lib/theme";

const NO_FLASH_SCRIPT = `(function(){try{var m=document.cookie.match(/(?:^|; )hs-theme=([^;]+)/);var t=m?decodeURIComponent(m[1]):'system';var d=t==='dark'||(t==='system'&&window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);}catch(e){}})();`;

const inter = Inter({ subsets: ["latin"] });

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const SITE_NAME = "Himalayan Stays";
const DEFAULT_DESC =
  "Book teahouse treks across Nepal's Himalayas. Multi-lodge itineraries for Everest Base Camp, Annapurna, and beyond.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Himalayan Stays — Multi-Lodge Trek Booking",
    template: "%s | Himalayan Stays",
  },
  description: DEFAULT_DESC,
  applicationName: SITE_NAME,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: "Himalayan Stays — Multi-Lodge Trek Booking",
    description: DEFAULT_DESC,
    url: SITE_URL,
    images: [
      {
        url: "https://picsum.photos/seed/himalayan-stays-og/1200/630",
        width: 1200,
        height: 630,
        alt: "Himalayan Stays — book teahouse treks across Nepal",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Himalayan Stays — Multi-Lodge Trek Booking",
    description: DEFAULT_DESC,
    images: ["https://picsum.photos/seed/himalayan-stays-og/1200/630"],
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const c = await cookies();
  const theme = parseTheme(c.get(THEME_COOKIE)?.value);
  const initialDarkClass = theme === "dark" ? "dark" : "";
  return (
    <html lang="en" className={initialDarkClass} suppressHydrationWarning>
      <head>
        <script
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: NO_FLASH_SCRIPT }}
        />
      </head>
      <body className={`${inter.className} bg-stone-50 text-stone-900 dark:bg-stone-950 dark:text-stone-100`}>
        <Providers>
          <Navbar />
          {children}
          <CompareBar />
        </Providers>
      </body>
    </html>
  );
}
