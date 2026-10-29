import type { Metadata, Viewport } from "next";
import { Inter, Geist_Mono, Instrument_Serif, Caveat, Instrument_Sans } from "next/font/google";

import "@/app/globals.css";
import { Providers } from "@/components/shared/provider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});


const instrumentSerif = Instrument_Sans({
  variable: "--font-instrument-sans",
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
      data-scroll-behavior="smooth"
      className={`${inter.variable}  ${instrumentSerif.variable} dark`}
      suppressHydrationWarning
    >
      <body className="min-h-screen h bg-background text-foreground antialiased bg-noise">
      
        <Providers>{children}</Providers>
      
      </body>
    </html>
  );
}
