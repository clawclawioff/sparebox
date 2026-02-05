import type { Metadata } from "next";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sparebox - Turn spare hardware into AI infrastructure",
  description:
    "A peer-to-peer marketplace connecting idle computers with people who want to run AI agents. Hosts earn passive income. Users get simple deployment.",
  openGraph: {
    title: "Sparebox",
    description: "Turn spare hardware into AI infrastructure",
    url: "https://sparebox.dev",
    siteName: "Sparebox",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sparebox",
    description: "Turn spare hardware into AI infrastructure",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
