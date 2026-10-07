import test from "node:test";
import assert from "node:assert/strict";
import { parseLabProjectBackup } from "../../src/lib/lab3d";
import { parseRobotBuilderSnapshot, parseSavedRobotProject } from "../../src/lib/robot-save";
import { robotMounts, requiredRobotNets } from "../../src/lib/robot-circuit";

test("robot backup validates complete assembly, wiring, obstacles and threshold",()=>{
 const placements=Object.fromEntries(robotMounts.map((part,index)=>[index,{x:part.x,y:part.y,rotation:0}]));
 const builder={placements,wires:requiredRobotNets.map(([from,to])=>({from,to}))};
 const saved={version:1,builder,blocks:[{id:1,x:0,z:0,size:22}],threshold:25,updatedAt:"2026-10-08T00:00:00.000Z"};
 assert.deepEqual(parseSavedRobotProject(saved),saved);
 assert.equal(parseRobotBuilderSnapshot(builder).wires.length,requiredRobotNets.length);
 assert.throws(()=>parseSavedRobotProject({...saved,threshold:0}),/unsupported format/);
 assert.throws(()=>parseSavedRobotProject({...saved,blocks:[{id:1,x:500,z:0,size:22}]}),/invalid obstacle/);
 assert.throws(()=>parseSavedRobotProject({...saved,builder:{...builder,wires:[{from:"0:5V",to:"999:GND"}]}}),/invalid wire/);
 assert.throws(()=>parseSavedRobotProject({...saved,builder:{...builder,placements:{1:{x:Infinity,y:10,rotation:0}}}}),/invalid part/);
});

test("circuit backup restores only reviewed parts, wires and code",()=>{
 const base={version:1,slug:"led-blink",placed:["arduino","breadboard","resistor","led"],connected:["d8-resistor","resistor-led","led-ground"],code:"void setup(){}"};
 assert.deepEqual(parseLabProjectBackup(base),base);
 assert.throws(()=>parseLabProjectBackup({...base,slug:"unknown"}),/Unsupported/);
 assert.throws(()=>parseLabProjectBackup({...base,placed:["arduino","fake-part"]}),/unknown/);
 assert.throws(()=>parseLabProjectBackup({...base,placed:["arduino","breadboard","led"]}),/missing parts/);
 assert.throws(()=>parseLabProjectBackup({...base,connected:["evil-wire"]}),/unknown/);
 assert.throws(()=>parseLabProjectBackup({...base,code:"x".repeat(50001)}),/Unsupported/);
});
