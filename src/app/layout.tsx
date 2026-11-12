import type { Metadata } from "next";
import { Press_Start_2P } from "next/font/google";
import "./globals.css";

/** Pixel font for the whole site (SIL Open Font License, self-hosted by next/font). */
const pixelFont = Press_Start_2P({
  weight: "400",
  variable: "--font-pixel",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Little Knight",
  description: "A small retro jump-and-run game.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${pixelFont.variable} h-full`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
