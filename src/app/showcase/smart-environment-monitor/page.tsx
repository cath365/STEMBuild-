import type { Metadata } from "next";
import { PublicHeader } from "@/components/public-header";
import { PublicFooter } from "@/components/public-footer";
import { MonitorShowcase } from "@/components/monitor-showcase";

export const metadata: Metadata = { title: "Smart Environment Monitor · Sample lesson", description: "Try a public STEMBuild lesson: Arduino Uno or ESP32 wiring, DHT22 code, readings, troubleshooting and practical assessment." };

export default function ShowcasePage() {
  return <><PublicHeader /><MonitorShowcase /><PublicFooter /></>;
}
