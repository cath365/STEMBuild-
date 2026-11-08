import type { Metadata } from "next";
import localFont from "next/font/local";
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

// IBM Plex (SIL Open Font License, see ./fonts/OFL.txt), committed to the repo so builds never
// depend on Google Fonts and learners never request third-party font files.
const plexSans = localFont({
  src: [
    { path: "./fonts/ibm-plex-sans-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/ibm-plex-sans-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./fonts/ibm-plex-sans-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "./fonts/ibm-plex-sans-latin-700-normal.woff2", weight: "700", style: "normal" },
  ],
  display: "swap",
  variable: "--font-sans",
});
const plexMono = localFont({
  src: [
    { path: "./fonts/ibm-plex-mono-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/ibm-plex-mono-latin-500-normal.woff2", weight: "500", style: "normal" },
  ],
  display: "swap",
  variable: "--font-mono",
});

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
