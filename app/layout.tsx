import type { Metadata, Viewport } from "next";
import { Inter, Geist_Mono, Instrument_Serif, Caveat } from "next/font/google";

import "@/app/globals.css";
import { Providers } from "@/components/shared/provider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});


const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
});





export const viewport: Viewport = {
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};


export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
 
  return (
    <html
      lang="en"
      className={`${inter.variable}  ${instrumentSerif.variable} dark`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background text-foreground antialiased bg-noise">
      
        <Providers>{children}</Providers>
      
      </body>
    </html>
  );
}
