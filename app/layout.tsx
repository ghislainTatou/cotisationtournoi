import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cotisations Tournoi",
  description: "Enregistrement et suivi des cotisations du tournoi",
  applicationName: "Cotisations Tournoi",
  icons: {
    icon: "/icon-192.png",
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Cotisations",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
