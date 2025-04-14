import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/providers";

// Load Inter font with Latin subset for consistent typography across the app
const inter = Inter({ subsets: ["latin"] });

// Define metadata for SEO and browser tab information
export const metadata: Metadata = {
  title: "BriefMe",
  description: "Your personal briefing app",
};

/**
 * Root layout component that wraps all pages
 * Provides:
 * - Global font styling with Inter
 * - App providers (auth, theme, etc.)
 * - HTML lang attribute for accessibility
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
