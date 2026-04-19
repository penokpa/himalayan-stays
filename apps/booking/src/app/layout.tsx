import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./global.css";
import Providers from "@/components/Providers";
import Navbar from "@/components/Navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Himalayan Stays — Multi-Lodge Trek Booking",
  description:
    "Book multi-lodge trek itineraries across Nepal's mountain lodges. Plan your EBC, Annapurna, and beyond.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <Navbar />
          {children}
        </Providers>
      </body>
    </html>
  );
}
