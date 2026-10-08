import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultAssembly,type CADAssembly} from '../../src/lib/robot-cad';
import {checkCADCircuit} from '../../src/lib/cad-circuit-test';
import {cadCircuitExample} from '../../src/lib/cad-projects';
import {parseAssembly} from '../../src/lib/robot-cad';
function circuit():CADAssembly{const a=defaultAssembly();for(const kind of ['uno','resistor','led'])a.parts.push({kind,offset:[0,0,0],rotation:[0,0,0],visible:true});a.wires=[{from:0,fromPin:'D8',to:1,toPin:'Lead 1',color:'#297aad'},{from:1,fromPin:'Lead 2',to:2,toPin:'Anode +',color:'#297aad'},{from:2,fromPin:'Cathode −',to:0,toPin:'GND',color:'#297aad'}];return a;}
test('direct CAD blink accepts connected series path and reversed wire direction',()=>{const a=circuit();assert.equal(checkCADCircuit(a).ready,true);a.wires=a.wires!.map(w=>({...w,from:w.to,fromPin:w.toPin,to:w.from,toPin:w.fromPin}));assert.equal(checkCADCircuit(a).ready,true);});
test('CAD blink blocks open paths, reversed LEDs, shorts, resistor bypass and unsupported firmware',()=>{for(const change of [(a:CADAssembly)=>a.wires!.pop(),(a:CADAssembly)=>{a.wires![1].toPin='Cathode −';a.wires![2].fromPin='Anode +';},(a:CADAssembly)=>a.wires!.push({from:0,fromPin:'D8',to:0,toPin:'GND',color:'#297aad'}),(a:CADAssembly)=>a.wires!.push({from:1,fromPin:'Lead 1',to:1,toPin:'Lead 2',color:'#297aad'}),(a:CADAssembly)=>{a.code='void loop(){}';},(a:CADAssembly)=>a.parts.push({kind:'motor',offset:[0,0,0],rotation:[0,0,0],visible:true})]){const a=circuit();change(a);assert.equal(checkCADCircuit(a).ready,false);}});

for(const kind of ['battery','button','alarm'] as const){
 test(`CAD ${kind}: example runs in either wire direction; missing parts, open paths and extras block`,()=>{
  const a=cadCircuitExample(kind);assert.equal(checkCADCircuit(a).ready,true);assert.equal(checkCADCircuit(parseAssembly(JSON.parse(JSON.stringify(a)))).kind,kind);
  a.wires=a.wires!.map(w=>({...w,from:w.to,fromPin:w.toPin,to:w.from,toPin:w.fromPin}));assert.equal(checkCADCircuit(a).ready,true);
  a.wires.pop();assert.equal(checkCADCircuit(a).ready,false);
  const hidden=cadCircuitExample(kind);hidden.parts[0].visible=false;assert.equal(checkCADCircuit(hidden).ready,false);
  const extra=cadCircuitExample(kind);extra.parts.push({kind:'motor',offset:[0,0,0],rotation:[0,0,0],visible:true});assert.equal(checkCADCircuit(extra).ready,false);
 });
}
test('CAD battery blocks power short, LED reversal and resistor bypass; resistor leads are interchangeable',()=>{
 for(const fault of ['short','polarity','bypass']){const a=cadCircuitExample('battery');if(fault==='short')a.wires!.push({from:0,fromPin:'+',to:0,toPin:'−',color:'#297aad'});if(fault==='polarity'){a.wires![1].toPin='Cathode −';a.wires![2].fromPin='Anode +';}if(fault==='bypass')a.wires!.push({from:1,fromPin:'Lead 1',to:1,toPin:'Lead 2',color:'#297aad'});assert.equal(checkCADCircuit(a).ready,false);}
 const a=cadCircuitExample('battery');a.wires![0].toPin='Lead 2';a.wires![1].fromPin='Lead 1';assert.equal(checkCADCircuit(a).ready,true);a.code='Personal battery wiring notes';assert.equal(checkCADCircuit(a).ready,true);
});
test('CAD button and alarm require D2 switch return and reject output shorts or changed firmware',()=>{
 for(const kind of ['button','alarm'] as const){const a=cadCircuitExample(kind);const switchIndex=a.parts.findIndex(p=>p.kind==='button');for(const w of a.wires!){if(w.from===switchIndex)w.fromPin=w.fromPin==='A'?'B':'A';if(w.to===switchIndex)w.toPin=w.toPin==='A'?'B':'A';}assert.equal(checkCADCircuit(a).ready,true);a.wires!.push({from:0,fromPin:'D8',to:0,toPin:'GND',color:'#297aad'});assert.equal(checkCADCircuit(a).ready,false);const b=cadCircuitExample(kind);b.code='void loop(){}';assert.equal(checkCADCircuit(b).ready,false);}
});
test('CAD project tags persist in backups and unknown tags are rejected',()=>{const a=cadCircuitExample('alarm',false);assert.equal(parseAssembly(a).circuit,'alarm');assert.throws(()=>parseAssembly({...a,circuit:'motor-magic'}));});
