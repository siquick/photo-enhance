import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Photo Boost — Leica Look",
  description:
    "Mobile-first photo enhancer powered by Gemini 2.5 Flash Image. Leica-inspired color science, micro-contrast, film grain.",
  metadataBase: new URL("https://photo-enhance-nine.vercel.app"),
  openGraph: {
    title: "Photo Boost — Leica Look",
    description:
      "Mobile-first photo enhancer powered by Gemini 2.5 Flash Image. Leica-inspired color science, micro-contrast, film grain.",
    type: "website",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "Photo Boost — Leica Look",
    description:
      "Mobile-first photo enhancer powered by Gemini 2.5 Flash Image. Leica-inspired color science, micro-contrast, film grain.",
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
