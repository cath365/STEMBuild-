export type BreadboardPlacement = {
  x: number;
  z: number;
  holes?: string[];
};

export type BreadboardJumper = {
  id: string;
  from: string;
  to: string;
  color: "blue" | "black" | "green" | "red";
};

const ROWS = ["a","b","c","d","e","f","g","h","i","j"] as const;

export function breadboardHoleId(row: string, column: number) {
  return `bb-${row}${column}`;
}

export function parseBreadboardHole(id: string) {
  const match = /^bb-([a-j])(\d{1,2})$/.exec(id);
  if (!match) return null;
  const row = match[1] as typeof ROWS[number];
  const column = Number(match[2]);
  if (column < 1 || column > 30) return null;
  return { row, column };
}

export function breadboardNet(id: string) {
  const parsed = parseBreadboardHole(id);
  if (!parsed) return null;
  const side = ["a","b","c","d","e"].includes(parsed.row) ? "top" : "bottom";
  return `${side}-${parsed.column}`;
}

export function breadboardHoleGrid() {
  return ROWS.flatMap((row, rowIndex) =>
    Array.from({ length: 30 }, (_, index) => {
      const column = index + 1;
      return {
        id: breadboardHoleId(row, column),
        row,
        column,
        rowIndex,
        net: breadboardNet(breadboardHoleId(row, column))!,
      };
    }),
  );
}

export function validateLedBreadboardCircuit(
  placements: Record<string, BreadboardPlacement | undefined>,
  jumpers: BreadboardJumper[],
) {
  const resistor = placements.resistor?.holes;
  const led = placements.led?.holes;

  if (!resistor || resistor.length !== 2) {
    return { ok:false, message:"Place both resistor legs into two breadboard holes." };
  }
  if (!led || led.length !== 2) {
    return { ok:false, message:"Place both LED legs into two breadboard holes." };
  }

  const resistorNets = resistor.map((hole) => breadboardNet(hole));
  const ledAnodeNet = breadboardNet(led[0]);
  const ledCathodeNet = breadboardNet(led[1]);
  if (resistorNets.some((net) => !net) || !ledAnodeNet || !ledCathodeNet) {
    return { ok:false, message:"One of the component legs is not in a valid breadboard hole." };
  }
  if (resistorNets[0] === resistorNets[1]) {
    return { ok:false, message:"The resistor legs are in the same connected breadboard strip. Move one leg to a different numbered column." };
  }
  if (ledAnodeNet === ledCathodeNet) {
    return { ok:false, message:"The LED legs are in the same connected breadboard strip. Move one leg to a different numbered column." };
  }

  const d8Jumper = jumpers.find((jumper) => jumper.from === "uno-d8" || jumper.to === "uno-d8");
  const gndJumper = jumpers.find((jumper) => jumper.from === "uno-gnd" || jumper.to === "uno-gnd");
  if (!d8Jumper) return { ok:false, message:"Add a jumper wire from Arduino D8 to the breadboard." };
  if (!gndJumper) return { ok:false, message:"Add a jumper wire from Arduino GND to the breadboard." };

  const d8Hole = d8Jumper.from === "uno-d8" ? d8Jumper.to : d8Jumper.from;
  const gndHole = gndJumper.from === "uno-gnd" ? gndJumper.to : gndJumper.from;
  const d8Net = breadboardNet(d8Hole);
  const gndNet = breadboardNet(gndHole);
  if (!d8Net || !gndNet) return { ok:false, message:"Jumper wires must end in valid breadboard holes." };

  const resistorInputIndex = resistorNets.findIndex((net) => net === d8Net);
  if (resistorInputIndex < 0) {
    return { ok:false, message:"D8 is not connected to either resistor leg through the breadboard strip." };
  }
  const resistorOutputNet = resistorNets[resistorInputIndex === 0 ? 1 : 0];

  if (resistorOutputNet !== ledAnodeNet) {
    return { ok:false, message:"The resistor output and LED anode (+) are not in the same breadboard strip." };
  }
  if (ledCathodeNet !== gndNet) {
    return { ok:false, message:"The LED cathode (-) is not connected to the same breadboard strip as Arduino GND." };
  }

  return {
    ok:true,
    message:"Breadboard circuit is electrically complete: D8 → resistor → LED → GND.",
    nets:{ d8Net, resistorOutputNet, ledAnodeNet, ledCathodeNet, gndNet },
  };
}
