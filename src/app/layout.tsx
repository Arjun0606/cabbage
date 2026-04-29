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
  title: "Cabbge — Be the brand AI recommends",
  description:
    "5-engine AI visibility scoring (ChatGPT, Gemini, Perplexity, Claude, Grok), mention tracking on Reddit / HN / YouTube / X, per-engine playbook, articles, and a personalized cold-outreach kit. Built for indie SaaS, Shopify operators, and small marketing teams.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-zinc-950">{children}</body>
    </html>
  );
}
