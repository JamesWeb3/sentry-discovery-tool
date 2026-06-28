import type { Metadata } from "next";
import { Geist, Instrument_Serif } from "next/font/google";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sentry · Free Knowledge Graph Audit",
  description:
    "Map where your business context actually lives in two minutes. A free, interactive knowledge graph of your tools and departments, by Sentry AI.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`h-full ${geist.variable} ${instrumentSerif.variable}`}>
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
