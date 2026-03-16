import type { Metadata, Viewport } from "next";
import { Urbanist } from "next/font/google";
import "./globals.css";

const urbanist = Urbanist({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-urbanist",
});

export const metadata: Metadata = {
  title: "Ketoy — -Driven UI for Android | Join the Waitlist",
  description:
    "The open source, server-driven UI engine for Jetpack Compose. Write K‑DSL, convert to JSON, render native UI. No Play Store approvals needed.",
  keywords:
    "Server Driven UI Android, SDUI Android, Jetpack Compose Server Driven UI, Remote Compose Android, Ketoy SDUI, Android UI cloud, waitlist",
  openGraph: {
    title: "Ketoy — Server-Driven UI for Android",
    description:
      "Update your Android app's UI from the cloud — no new build, no Play Store wait. Join the waitlist for early access.",
    url: "https://waiting.ketoy.dev",
    siteName: "Ketoy",
    images: [{ url: "https://ketoy.dev/ketoy-logo.svg" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ketoy — Server-Driven UI for Android | Waitlist",
    description:
      "SDUI for Android done right. Define Compose screens as JSON, update instantly. Join the waitlist.",
    images: ["https://ketoy.dev/ketoy-logo.svg"],
  },
  icons: {
    icon: "/ketoy-logo.svg",
    shortcut: "/ketoy-logo.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={urbanist.variable} style={{ background: "#000000" }}>
      <body className={`${urbanist.className} antialiased`}>
        {children}
      </body>
    </html>
  );
}
