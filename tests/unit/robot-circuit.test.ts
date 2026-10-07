import test from 'node:test';
import assert from 'node:assert/strict';
import {requiredRobotNets,validateRobotCircuit} from '../../src/lib/robot-circuit';
const complete=()=>requiredRobotNets.map(([from,to])=>({from,to}));
test('complete robot circuit passes independent of wire direction',()=>{
 assert.equal(validateRobotCircuit(complete()).ok,true);
 assert.equal(validateRobotCircuit(complete().map(w=>({from:w.to,to:w.from}))).ok,true);
});
test('a missing common ground or swapped motor control pin blocks running',()=>{
 const ws=complete();ws.pop();assert.equal(validateRobotCircuit(ws).ok,false);
 const swapped=complete();swapped[4]={from:'0:D5',to:'4:IN1'};assert.ok(validateRobotCircuit(swapped).errors.length);
});
test('shorts and motor power connected to Uno 5V are rejected even with every required wire',()=>{
 for(const w of [{from:'0:5V',to:'0:GND'},{from:'6:+',to:'6:−'},{from:'6:+',to:'0:5V'}]){
 const check=validateRobotCircuit([...complete(),w]);assert.equal(check.ok,false);assert.ok(check.errors.some(e=>/Short circuit|separate/.test(e)));
 }
});
test('ground continuity may use intermediate ground terminals, unknown pins reject',()=>{
 const ws=complete().filter(w=>!(w.from==='0:GND'&&w.to==='4:GND'));
 ws.push({from:'5:GND',to:'6:−'});assert.equal(validateRobotCircuit(ws).ok,true);
 assert.equal(validateRobotCircuit([...ws,{from:'bogus',to:'0:GND'}]).ok,false);
});
