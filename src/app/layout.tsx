import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import "./brand.css";
import "./learn.css";
import "./lab-modes.css";
import "./logo-theme.css";
import "./circuit-studio.css";
import "./workspace-focus.css";
import "./cad-workspace.css";
import "./ux-refresh.css";
import "./virtual-lab.css";
import "./design-system.css";
import { PwaRegister } from "@/components/pwa-register";
import { ConnectivityStatus } from "@/components/connectivity-status";

// Self-hosted by Next.js at build time: no request to Google from the learner's device.
const plexSans = IBM_Plex_Sans({ weight: ["400", "500", "600", "700"], subsets: ["latin"], display: "swap", variable: "--font-sans" });
const plexMono = IBM_Plex_Mono({ weight: ["400", "500"], subsets: ["latin"], display: "swap", variable: "--font-mono" });

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
  return <html lang="en" className={`${plexSans.variable} ${plexMono.variable}`}><body><PwaRegister /><ConnectivityStatus />{children}</body></html>;
}
