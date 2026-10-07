import type { Metadata } from "next";
import { Archivo_Black } from "next/font/google";
import "./globals.css";
import "./brand.css";
import "./learn.css";
import "./lab-modes.css";
import { PwaRegister } from "@/components/pwa-register";
import { ConnectivityStatus } from "@/components/connectivity-status";

// The bold display type is self-hosted by Next.js and used only for editorial headings.
const posterDisplay = Archivo_Black({ weight: "400", subsets: ["latin"], display: "swap", variable: "--font-stembuild-display" });

export const metadata: Metadata = {
  title: { default: "STEMBuild: Robotics & IoT", template: "%s | STEMBuild" },
  description: "Practical robotics, electronics and IoT learning with measurable hands-on assessment.",
  applicationName: "STEMBuild",
  icons: {
    icon: [
      { url: "/brand/stembuild-icon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/stembuild-icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/brand/stembuild-icon-192x192.png", sizes: "192x192", type: "image/png" }],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={posterDisplay.variable}><body><PwaRegister /><ConnectivityStatus />{children}</body></html>;
}
