import boards from "./hardware-images.json";

export type ComponentVisual = {
  slug: string;
  src: string;
  alt: string;
  caption: string;
  credit: string;
  license: string;
  licenseUrl: string;
  sourceUrl: string;
  kind: "photo";
  verified: true;
  local?: boolean;
};

const boardVisuals: ComponentVisual[] = boards.map((board) => ({
  slug: board.id,
  src: board.image,
  alt: board.model,
  caption: `Real example of ${board.name}. Board revisions and clones may look different.`,
  credit: board.artist,
  license: board.license,
  licenseUrl: board.licenseUrl,
  sourceUrl: board.source,
  kind: "photo",
  verified: true,
  local: true,
}));

const commonsVisuals: ComponentVisual[] = [
  {
    slug: "breadboard",
    src: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Electronics-White-Breadboard.jpg?width=1200",
    alt: "Real white solderless electronics breadboard",
    caption: "Real solderless breadboard. Notice the centre gap, terminal rows and long power rails.",
    credit: "Evan-Amos",
    license: "Public domain",
    licenseUrl: "https://creativecommons.org/publicdomain/mark/1.0/",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Electronics-White-Breadboard.jpg",
    kind: "photo",
    verified: true,
  },
  {
    slug: "jumper-wires",
    src: "https://commons.wikimedia.org/wiki/Special:Redirect/file/A_few_Jumper_Wires.jpg?width=1200",
    alt: "Real jumper wires used for breadboard electronics",
    caption: "Real jumper wires. Connector type and length vary, so match the ends to your board and module.",
    credit: "oomlout",
    license: "CC BY-SA 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/2.0/",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:A_few_Jumper_Wires.jpg",
    kind: "photo",
    verified: true,
  },
  {
    slug: "led",
    src: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Electronic-Component-Red-LED.jpg?width=1200",
    alt: "Real red through-hole light emitting diode",
    caption: "Real through-hole LED. Lead length can help identify polarity, but always verify the actual part.",
    credit: "Evan-Amos",
    license: "Public domain",
    licenseUrl: "https://creativecommons.org/publicdomain/mark/1.0/",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Electronic-Component-Red-LED.jpg",
    kind: "photo",
    verified: true,
  },
  {
    slug: "resistor-330",
    src: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Resistor.jpg?width=1200",
    alt: "Real 330 ohm through-hole resistor with colour bands",
    caption: "Real 330 Ω resistor example. This photograph shows a 330 Ω, 5% resistor; colour bands and body size can vary.",
    credit: "Nunikasi",
    license: "CC BY-SA 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Resistor.jpg",
    kind: "photo",
    verified: true,
  },
  {
    slug: "push-button",
    src: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Push_button_switch.jpg?width=1200",
    alt: "Real push button switch electronic component",
    caption: "Real push-button switch example. Tactile breadboard buttons can look different and may have internally paired legs.",
    credit: "Achalshanth",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Push_button_switch.jpg",
    kind: "photo",
    verified: true,
  },
  {
    slug: "dht11-dht22",
    src: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Dht11_term_and_humidity_sensor.jpg?width=1200",
    alt: "Real DHT11 digital temperature and humidity sensor",
    caption: "Real DHT11 sensor. A DHT22 and breakout-module versions look different, so verify the exact sensor and pin labels.",
    credit: "Crackopl",
    license: "CC BY-SA 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Dht11_term_and_humidity_sensor.jpg",
    kind: "photo",
    verified: true,
  },
  {
    slug: "hc-sr04",
    src: "https://commons.wikimedia.org/wiki/Special:Redirect/file/SparkFun_HC-SR04_Ultrasonic-Sensor_13959-01a.jpg?width=1200",
    alt: "Real HC-SR04 ultrasonic distance sensor module",
    caption: "Real HC-SR04 ultrasonic sensor. The familiar two circular transducers help learners recognise the module.",
    credit: "SparkFun",
    license: "CC BY 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by/2.0/",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:SparkFun_HC-SR04_Ultrasonic-Sensor_13959-01a.jpg",
    kind: "photo",
    verified: true,
  },
  {
    slug: "servo",
    src: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Micro_servo.jpg?width=1200",
    alt: "Real small hobby micro servo motor",
    caption: "Real hobby micro servo example. Wire colours and connector order can vary by manufacturer.",
    credit: "oomlout",
    license: "CC BY-SA 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/2.0/",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Micro_servo.jpg",
    kind: "photo",
    verified: true,
  },
  {
    slug: "dc-motor",
    src: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Gear_motor.jpg?width=1200",
    alt: "Real DC gear motor",
    caption: "Real gear motor example. Classroom robot motors may use different gearboxes, shafts and voltage ratings.",
    credit: "Jzest",
    license: "CC BY-SA 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Gear_motor.jpg",
    kind: "photo",
    verified: true,
  },
];

export const componentVisuals = [...boardVisuals, ...commonsVisuals];

export function componentVisualFor(slug: string) {
  return componentVisuals.find((visual) => visual.slug === slug);
}
