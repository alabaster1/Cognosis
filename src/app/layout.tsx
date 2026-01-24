import type { Metadata } from "next";
import { Inter, Space_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: ["400"],
});

export const metadata: Metadata = {
  title: "Cognosis - Privacy-Preserving Psi Research Platform",
  description: "Conduct verified psi experiments with blockchain integrity and AI-powered analysis",
  keywords: ["psi research", "remote viewing", "precognition", "telepathy", "blockchain", "privacy"],
  authors: [{ name: "Cognosis Team" }],
  openGraph: {
    title: "Cognosis",
    description: "Privacy-preserving psi research platform",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${spaceMono.variable} ${instrumentSerif.variable} font-sans antialiased bg-[#060a0f] text-[#e0e8f0]`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
