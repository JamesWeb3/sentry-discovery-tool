import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en" className="h-full">
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
