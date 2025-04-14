import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/providers";
import { SessionRefresher } from "./components/system/SessionRefresher";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "BriefMe",
  description: "Your personal briefing app",
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
          {/* Session refresher component keeps auth tokens fresh */}
          <SessionRefresher />
          {children}
        </Providers>
      </body>
    </html>
  );
}
