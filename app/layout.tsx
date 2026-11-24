import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cotisations Tournoi",
  description: "Enregistrement et suivi des cotisations du tournoi",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
