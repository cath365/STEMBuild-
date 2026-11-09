import { basicGuides } from "@/lib/learn/guides-basics";
import { conceptGuides } from "@/lib/learn/guides-concepts";
import { motionGuides } from "@/lib/learn/guides-motion";
import { moduleGuides } from "@/lib/learn/guides-modules";
import { sensorGuides } from "@/lib/learn/guides-sensors";
import type { ComponentGuide } from "@/lib/learn/types";

export const COMPONENT_GUIDES: ComponentGuide[] = [...basicGuides, ...sensorGuides, ...motionGuides, ...moduleGuides, ...conceptGuides];

const BY_SLUG = new Map(COMPONENT_GUIDES.map((guide) => [guide.slug, guide]));

export function guideFor(slug: string) {
  return BY_SLUG.get(slug);
}
