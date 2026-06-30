import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import packageJson from "../../package.json";

const appVersion = packageJson.version;
const appTitle = `Wasteland v${appVersion}`;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: appTitle,
  description: "Survive the wasteland — explore, build, and manage your survivors.",
  openGraph: {
    title: appTitle,
    description: "Survive the wasteland — explore, build, and manage your survivors.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: appTitle,
    description: "Survive the wasteland — explore, build, and manage your survivors.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
