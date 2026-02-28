import type { Metadata } from "next";
import "./globals.css";
import SpacetimeProvider from "@/components/SpacetimeProvider";

export const metadata: Metadata = {
  title: "Netrunner Clash — Cyberpunk Card Game",
  description: "Um card game PvP por turnos com temática cyberpunk. Construído com Next.js e SpacetimeDB.",
  keywords: ["card game", "cyberpunk", "pvp", "multiplayer", "netrunner"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>
        <SpacetimeProvider>
          {children}
        </SpacetimeProvider>
      </body>
    </html>
  );
}
