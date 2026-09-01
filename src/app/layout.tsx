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

const title = "Vigil";
const description =
  "A real-time driver drowsiness and attention monitor that runs entirely in your browser - webcam and inference never leave your device.";
const url = "https://vigil-delta-two.vercel.app";

export const metadata: Metadata = {
  title,
  description,
  metadataBase: new URL(url),
  openGraph: { title, description, url, siteName: title, type: "website" },
  twitter: { card: "summary", title, description },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
