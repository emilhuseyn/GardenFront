import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { buildThemeInitScript } from "@/lib/utils/themes";

export const metadata: Metadata = {
  title: "KinderGarden - Uşaq Bağçası İdarəetmə Sistemi",
  description: "Bağçanızı ağıllı idarə edin",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="az" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: buildThemeInitScript() }} />
      </head>
      <body className="antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
