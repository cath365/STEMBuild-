import test from "node:test";
import assert from "node:assert/strict";
import {
 addBoardWire, canPlaceComponent, closestBreadboardHole, createBreadboard,
 demoBreadboard, evaluateBreadboard, parseBreadboard,
} from "../../src/lib/breadboard-workshop";

test("known good breadboard path runs and survives validated backup import", () => {
 const demo = demoBreadboard();
 assert.equal(evaluateBreadboard(demo).ready,true);
 assert.deepEqual(parseBreadboard(JSON.parse(JSON.stringify(demo))),demo);
 assert.equal(parseBreadboard(demo).wires.length,3);
});

test("open paths and LED polarity errors never report a successful circuit", () => {
 const demo=demoBreadboard();
 assert.equal(evaluateBreadboard({ ...demo,wires:demo.wires.slice(0,2) }).ready,false);
 assert.equal(evaluateBreadboard({ ...demo,led:{a:demo.led!.b,b:demo.led!.a} }).ready,false);
 assert.equal(evaluateBreadboard({ ...demo,led:{a:"E6",b:"F11"} }).ready,false);
 assert.equal(evaluateBreadboard({ ...demo,resistor:{a:"A6",b:"B6"} }).ready,false);
 assert.equal(evaluateBreadboard({ ...demo,wires:[...demo.wires,{id:"bad",from:"D8",to:"GND"}] }).ready,false);
});

test("breadboard rows share five-hole groups but the central trench is separate",()=>{
 const demo=demoBreadboard();
 assert.equal(evaluateBreadboard(demo).ready,true);
 const wrongBridge={...demo,wires:[demo.wires[0],{id:"miswire",from:"A7",to:"A11"},demo.wires[2]]};
 assert.equal(evaluateBreadboard(wrongBridge).ready,false);
 // The first and last hole in a top or bottom five-hole group are connected.
 const alternative={...demo,wires:[{id:"one",from:"D8",to:"D6"},{id:"two",from:"G6",to:"E11"},{id:"three",from:"I11",to:"GND"}]};
 assert.equal(evaluateBreadboard(alternative).ready,true);
});

test("parts and jumper leads each occupy one physical hole",()=>{
 const doc=createBreadboard();
 assert.equal(canPlaceComponent(doc,"led","E6","F6"),null);
 assert.equal(canPlaceComponent(doc,"led","A6","C6"),null);
 const placed={...doc,led:{a:"E6",b:"F6"}};
 assert.match(canPlaceComponent(placed,"resistor","E6","F7")??"",/already contains/);
 assert.throws(()=>addBoardWire(placed,"E6","GND"),/occupied/);
 assert.throws(()=>addBoardWire(placed,"A7","A7"),/different/);
 const wired=addBoardWire(placed,"D8","A6");
 assert.equal(wired.wires.length,1);
 assert.throws(()=>addBoardWire(wired,"D8","A8"),/occupied/);
});

test("snap positions, file format and conflicting leads are validated",()=>{
 assert.equal(closestBreadboardHole(200,149),"A1");
 assert.equal(closestBreadboardHole(100,100),null);
 assert.throws(()=>parseBreadboard({...demoBreadboard(),led:{a:"E6",b:"F6"}}),/share one hole/);
 assert.throws(()=>parseBreadboard({...demoBreadboard(),wires:[{id:"bad",from:"unknown",to:"A6"}]}),/Invalid or duplicate/);
 assert.throws(()=>parseBreadboard({...demoBreadboard(),code:"x".repeat(50_001)}),/Unsupported/);
});
