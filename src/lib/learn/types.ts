import type { PartType } from "@/lib/studio/parts";

/** How a component's power pin is fed. "logic" means the board's own logic voltage (5 V or 3.3 V). */
export type Supply = "logic" | "5v" | "3v3" | "external";

export type PinRole =
  | "vcc" | "gnd"
  | "digital" | "pwm" | "analog" | "servo"
  | "sda" | "scl" | "mosi" | "miso" | "sck" | "cs"
  /** The module's serial output (goes to the board's RX) and input (from the board's TX). */
  | "tx" | "rx"
  /** Goes somewhere other than the board: a motor, a battery, the load being switched. */
  | "ext"
  | "nc";

export type GuidePin = {
  id: string;
  label: string;
  role: PinRole;
  /** Part placed in series on this wire, e.g. "220 Ω resistor". */
  via?: string;
  /** Destination for ext pins (and vcc pins with an external supply). Tokens: {5V} {3V3} {GND} {LOGIC}. */
  to?: string;
  supply?: Supply;
  note?: string;
  /** Extra note only on 3.3 V boards / only on 5 V boards. */
  note3v3?: string;
  note5v?: string;
  /** Output that swings to the part's supply: needs bringing down when that is 5 V and the board is 3.3 V. */
  out5v?: "divider" | "shifter";
  /** Input that must not see more than 3.3 V: needs protecting when the board is 5 V. */
  max3v3?: "divider" | "shifter";
};

export type CheckQuestion = { question: string; options: string[]; answer: number; why: string };

export type ComponentGuide = {
  slug: string;
  /** One sentence that captures the idea. */
  idea: string;
  howItWorks: string[];
  facts: [string, string][];
  supply: Supply;
  pins: GuidePin[];
  code?: { arduino?: string; micropython?: string };
  libs?: { arduino?: string[]; esp32?: string[]; micropython?: string };
  expected?: string;
  mistakes: string[];
  check: CheckQuestion;
  inIndustry: string;
  /** Maker Studio part this maps to, with guide pin id → studio pin id. */
  studio?: { type: PartType; pins: Record<string, string>; props?: Record<string, string | number | boolean> };
  /** Guides to read alongside this one. */
  related?: string[];
};
