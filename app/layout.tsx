import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wall of Fame",
  description: "Vodacom Wall of Fame nomination and election platform"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
