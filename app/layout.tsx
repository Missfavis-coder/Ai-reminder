
import type { Metadata, Viewport } from "next";
import { Inter, Instrument_Sans } from "next/font/google";

import "@/app/globals.css";
import { Providers } from "@/components/shared/provider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),

  title: {
    default: "AI Reminder — Your AI-Powered Productivity Assistant",
    template: "%s | AI Reminder",
  },

  description:
    "AI Reminder helps you stay focused, track your development activity, manage work sessions, and receive intelligent reminders while you work.",

  applicationName: "AI Reminder",
  generator: "Next.js",

  keywords: [
    "AI Reminder",
    "AI productivity assistant",
    "developer productivity",
    "smart reminders",
    "coding activity tracker",
    "workspace monitoring",
    "work session tracker",
    "productivity automation",
  ],

  authors: [{ name: "AI Reminder" }],
  creator: "AI Reminder",
  publisher: "AI Reminder",
  category: "productivity",

  alternates: {
    canonical: "/",
  },

  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "AI Reminder",
    title: "AI Reminder — Your AI-Powered Productivity Assistant",
    description:
      "Stay focused, track your development activity, and receive intelligent reminders while you work.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "AI Reminder — Your AI-Powered Productivity Assistant",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "AI Reminder — Your AI-Powered Productivity Assistant",
    description:
      "Stay focused and manage your work sessions with intelligent AI-powered reminders.",
    images: ["/opengraph-image"],
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
    },
  },

  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },

  referrer: "strict-origin-when-cross-origin",
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${inter.variable} ${instrumentSans.variable} dark`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background text-foreground antialiased bg-noise">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
