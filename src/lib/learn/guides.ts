import { basicGuides } from "@/lib/learn/guides-basics";
import { conceptGuides } from "@/lib/learn/guides-concepts";
import { motionGuides } from "@/lib/learn/guides-motion";
import { moduleGuides } from "@/lib/learn/guides-modules";
import { sensorGuides } from "@/lib/learn/guides-sensors";
import type { ComponentGuide } from "@/lib/learn/types";

// Maker Studio parts whose pin ids match the guide's pin ids one-to-one.
const SAME_PINS: Record<string, ComponentGuide["studio"]> = {
  "ir-obstacle": { type: "ir-obstacle", pins: { vcc: "vcc", gnd: "gnd", out: "out" } },
  "line-sensor": { type: "line-sensor", pins: { vcc: "vcc", gnd: "gnd", do: "do" } },
  "flame-sensor": { type: "flame-sensor", pins: { vcc: "vcc", gnd: "gnd", do: "do" } },
  "sound-sensor": { type: "sound-sensor", pins: { vcc: "vcc", gnd: "gnd", do: "do" } },
  "hall-sensor": { type: "hall-sensor", pins: { vcc: "vcc", gnd: "gnd", s: "s" } },
  "soil-moisture": { type: "soil-moisture", pins: { vcc: "vcc", gnd: "gnd", aout: "aout" } },
  "gas-sensor": { type: "gas-sensor", pins: { vcc: "vcc", gnd: "gnd", ao: "ao" } },
  joystick: { type: "joystick", pins: { gnd: "gnd", vcc: "vcc", vrx: "vrx", vry: "vry", sw: "sw" } },
  "relay-module": { type: "relay", pins: { vcc: "vcc", gnd: "gnd", in: "in" } },
  "vibration-motor": { type: "vibration-motor", pins: { in: "in", vcc: "vcc", gnd: "gnd" } },
};

export const COMPONENT_GUIDES: ComponentGuide[] = [...basicGuides, ...sensorGuides, ...motionGuides, ...moduleGuides, ...conceptGuides]
  .map((guide) => (SAME_PINS[guide.slug] && !guide.studio ? { ...guide, studio: SAME_PINS[guide.slug] } : guide));

const BY_SLUG = new Map(COMPONENT_GUIDES.map((guide) => [guide.slug, guide]));

export function guideFor(slug: string) {
  return BY_SLUG.get(slug);
}
