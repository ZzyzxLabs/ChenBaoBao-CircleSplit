import "./globals.css";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "./providers";
import { LifiWidgetDrawerProvider } from "./dynamic";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ChenBaoBao CircleSplit - Group Payment Management",
  description:
    "Decentralized group payment management system for splitting expenses and tracking shared costs with USDC on Sepolia testnet.",
  keywords: [
    "blockchain",
    "payments",
    "group finance",
    "USDC",
    "Sepolia",
    "DeFi",
  ],
  authors: [{ name: "ChenBaoBao Team" }],
  robots: "index, follow",
  openGraph: {
    title: "ChenBaoBao CircleSplit",
    description: "Decentralized group payment management system",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "ChenBaoBao CircleSplit",
    description: "Decentralized group payment management system",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`min-h-screen min-w-full bg-background ${geistSans.variable} ${geistMono.variable} antialiased touch-manipulation`}
      >
        <Providers>
          <LifiWidgetDrawerProvider>{children}</LifiWidgetDrawerProvider>
        </Providers>
      </body>
    </html>
  );
}
