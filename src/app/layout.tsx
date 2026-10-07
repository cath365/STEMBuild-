import type { Metadata } from "next";
import "./globals.css";
import "./brand.css";
import { PwaRegister } from "@/components/pwa-register";
import { ConnectivityStatus } from "@/components/connectivity-status";

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
  return <html lang="en"><body><PwaRegister /><ConnectivityStatus />{children}</body></html>;
}
