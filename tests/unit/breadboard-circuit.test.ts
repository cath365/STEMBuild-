import test from "node:test";
import assert from "node:assert/strict";
import {
  breadboardNet,
  validateLedBreadboardCircuit,
  type BreadboardJumper,
  type BreadboardPlacement,
} from "../../src/lib/breadboard-circuit";

test("breadboard top-half holes in one numbered column share a net", () => {
  assert.equal(breadboardNet("bb-a5"), "top-5");
  assert.equal(breadboardNet("bb-e5"), "top-5");
  assert.notEqual(breadboardNet("bb-e5"), breadboardNet("bb-e6"));
  assert.notEqual(breadboardNet("bb-e5"), breadboardNet("bb-f5"));
});

test("valid LED breadboard circuit follows D8 through resistor and LED to GND", () => {
  const placements: Record<string, BreadboardPlacement> = {
    resistor: { x:0, z:0, holes:["bb-e5","bb-e8"] },
    led: { x:0, z:0, holes:["bb-d8","bb-d9"] },
  };
  const jumpers: BreadboardJumper[] = [
    { id:"d8-a5", from:"uno-d8", to:"bb-a5", color:"blue" },
    { id:"gnd-a9", from:"uno-gnd", to:"bb-a9", color:"black" },
  ];
  assert.equal(validateLedBreadboardCircuit(placements,jumpers).ok,true);
});

test("LED legs in one breadboard strip are rejected", () => {
  const placements: Record<string, BreadboardPlacement> = {
    resistor: { x:0, z:0, holes:["bb-e5","bb-e8"] },
    led: { x:0, z:0, holes:["bb-a8","bb-e8"] },
  };
  const jumpers: BreadboardJumper[] = [
    { id:"d8-a5", from:"uno-d8", to:"bb-a5", color:"blue" },
    { id:"gnd-a9", from:"uno-gnd", to:"bb-a9", color:"black" },
  ];
  const result=validateLedBreadboardCircuit(placements,jumpers);
  assert.equal(result.ok,false);
  assert.match(result.message,/same connected breadboard strip/i);
});

test("wrong D8 breadboard row is rejected", () => {
  const placements: Record<string, BreadboardPlacement> = {
    resistor: { x:0, z:0, holes:["bb-e5","bb-e8"] },
    led: { x:0, z:0, holes:["bb-d8","bb-d9"] },
  };
  const jumpers: BreadboardJumper[] = [
    { id:"d8-a4", from:"uno-d8", to:"bb-a4", color:"blue" },
    { id:"gnd-a9", from:"uno-gnd", to:"bb-a9", color:"black" },
  ];
  const result=validateLedBreadboardCircuit(placements,jumpers);
  assert.equal(result.ok,false);
  assert.match(result.message,/D8 is not connected/i);
});
