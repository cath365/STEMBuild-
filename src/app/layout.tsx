import type { Metadata } from "next";
import "./globals.css";
import { PwaRegister } from "@/components/pwa-register";
import { ConnectivityStatus } from "@/components/connectivity-status";

export const metadata: Metadata = {
  title: { default: "STEMBuild: Robotics & IoT", template: "%s | STEMBuild" },
  description: "Practical robotics, electronics and IoT learning with measurable hands-on assessment.",
  applicationName: "STEMBuild",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><PwaRegister /><ConnectivityStatus />{children}</body></html>;
}
