import { robotMounts, terminal, type RobotWire } from "./robot-circuit";
import type { Obstacle } from "./robot-arena";

export const ROBOT_PROJECT_KEY = "stembuild-robot-project-v1";

export type RobotPlacement = { x: number; y: number; rotation: number };
export type RobotBuilderSnapshot = {
  placements: Record<number, RobotPlacement>;
  wires: RobotWire[];
};
export type SavedRobotProject = {
  version: 1;
  builder: RobotBuilderSnapshot;
  blocks: Obstacle[];
  threshold: number;
  updatedAt: string;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const finite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

export function parseRobotBuilderSnapshot(value: unknown): RobotBuilderSnapshot {
  if (!isObject(value) || !isObject(value.placements) || !Array.isArray(value.wires) || value.wires.length > 100) {
    throw Error("Invalid robot assembly file.");
  }
  const placements: Record<number, RobotPlacement> = {};
  for (const [key, item] of Object.entries(value.placements)) {
    const index = Number(key);
    if (!/^(0|[1-9]\d*)$/.test(key) || !Number.isInteger(index) || !robotMounts[index] || !isObject(item) ||
        !finite(item.x) || !finite(item.y) || !finite(item.rotation) ||
        item.x < 0 || item.x > 400 || item.y < 0 || item.y > 300 ||
        ![0, 90, 180, 270].includes(item.rotation)) {
      throw Error("Robot assembly contains an invalid part or position.");
    }
    placements[index] = { x: item.x, y: item.y, rotation: item.rotation };
  }

  const pins = new Set(robotMounts.flatMap((part, index) => part.pins.map((pin) => terminal(index, pin))));
  const wires: RobotWire[] = value.wires.map((item: unknown) => {
    if (!isObject(item) || typeof item.from !== "string" || typeof item.to !== "string" ||
        !pins.has(item.from) || !pins.has(item.to)) {
      throw Error("Robot assembly contains an invalid wire.");
    }
    return { from: item.from, to: item.to };
  });
  return { placements, wires };
}

export function parseSavedRobotProject(value: unknown): SavedRobotProject {
  if (!isObject(value) || value.version !== 1 || !Array.isArray(value.blocks) ||
      value.blocks.length > 20 || !Number.isInteger(value.threshold) ||
      (value.threshold as number) < 15 || (value.threshold as number) > 50 ||
      typeof value.updatedAt !== "string" || !Number.isFinite(Date.parse(value.updatedAt))) {
    throw Error("Saved robot project has an unsupported format.");
  }
  const blocks: Obstacle[] = value.blocks.map((item: unknown) => {
    if (!isObject(item) || !finite(item.id) || !finite(item.x) || !finite(item.z) ||
        item.x < -78 || item.x > 78 || item.z < -78 || item.z > 78 || item.size !== 22) {
      throw Error("Saved robot project contains an invalid obstacle.");
    }
    return { id: item.id, x: item.x, z: item.z, size: 22 };
  });
  return {
    version: 1,
    builder: parseRobotBuilderSnapshot(value.builder),
    blocks,
    threshold: value.threshold as number,
    updatedAt: value.updatedAt,
  };
}
