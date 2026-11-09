// Builds a ready-wired Maker Studio project from a component guide's Arduino Uno wiring and code,
// so "Try it" opens exactly the circuit the guide describes.
import { BOARD_BY_ID } from "@/lib/learn/boards";
import type { ComponentGuide } from "@/lib/learn/types";
import { codeFor, wiringFor } from "@/lib/learn/wiring";
import type { PlacedPart, StudioDoc, StudioWire } from "@/lib/studio/circuit";

const GROUNDS = ["GND_T", "GND_B1", "GND_B2"];
const SIGNAL_COLOURS = ["blue", "green", "orange", "yellow"];

function resistorOhms(via: string) {
  const match = /(\d+(?:\.\d+)?)\s*(k?)Ω resistor/.exec(via);
  return match ? Number(match[1]) * (match[2] ? 1000 : 1) : null;
}

export function studioDocFor(guide: ComponentGuide): StudioDoc | null {
  if (!guide.studio) return null;
  const uno = BOARD_BY_ID.uno;
  const wiring = wiringFor(guide, uno);
  const code = codeFor(guide, uno, wiring, "arduino");
  if (!code) return null;
  const main: PlacedPart = { id: "p1", type: guide.studio.type, x: 640, y: 90, props: { ...(guide.studio.props ?? {}) } };
  const parts: PlacedPart[] = [main];
  const wires: StudioWire[] = [];
  let grounds = 0, signals = 0;
  for (const row of wiring.rows) {
    const studioPin = guide.studio.pins[row.pinId];
    if (!studioPin || !row.boardPin) continue;
    const unoPin = row.boardPin === uno.gnd ? GROUNDS[grounds++ % GROUNDS.length] : row.boardPin;
    const colour = row.role === "vcc" ? "red" : row.role === "gnd" ? "black" : SIGNAL_COLOURS[signals++ % SIGNAL_COLOURS.length];
    const ohms = row.via ? resistorOhms(row.via) : null;
    if (ohms) {
      const resistor: PlacedPart = { id: `r${parts.length}`, type: "resistor", x: 480, y: 210 + (parts.length - 1) * 50, props: { ohms } };
      parts.push(resistor);
      wires.push({ id: `w${wires.length + 1}`, a: `uno:${unoPin}`, b: `${resistor.id}:a`, colour });
      wires.push({ id: `w${wires.length + 1}`, a: `${resistor.id}:b`, b: `${main.id}:${studioPin}`, colour });
    } else {
      wires.push({ id: `w${wires.length + 1}`, a: `uno:${unoPin}`, b: `${main.id}:${studioPin}`, colour });
    }
  }
  return { version: 1, parts, wires, code };
}
