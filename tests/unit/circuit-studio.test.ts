import {test} from 'node:test';
import assert from 'node:assert/strict';
import {circuitProjects,checkStudio,emptyStudio,exampleStudio,parseStudio} from '../../src/lib/circuit-studio';
for(const p of circuitProjects){
 test(`${p.name}: correct nets run, reversed wire directions run, opens do not`,()=>{
  const doc=exampleStudio(p);assert.equal(checkStudio(doc,p).ok,true);assert.equal(checkStudio({...doc,wires:doc.wires.map(w=>({a:w.b,b:w.a}))},p).ok,true);assert.equal(checkStudio({...doc,wires:doc.wires.slice(1)},p).ok,false);assert.equal(checkStudio(emptyStudio(p),p).ok,false);
 });
 test(`${p.name}: backups are bounded and arbitrary firmware is blocked`,()=>{
  const d=exampleStudio(p);assert.deepEqual(parseStudio(d,p),d);assert.equal(parseStudio({...d,placed:[...d.placed,d.placed[0]]},p),null);assert.equal(parseStudio({...d,placed:d.placed.map(c=>({...c,x:Infinity}))},p),null);assert.equal(parseStudio({...d,wires:[{a:'unknown:5V',b:'uno:GND'}]},p),null);assert.equal(checkStudio({...d,code:d.code+'void fake() {}'},p).ok,false);
 });
}
test('LED preview rejects shorts, reversed LED and bypassed resistor; numeric delays are allowed',()=>{
 const p=circuitProjects[0],d=exampleStudio(p);
 assert.equal(checkStudio({...d,wires:[...d.wires,{a:'uno:D8',b:'uno:GND'}]},p).ok,false);
 assert.equal(checkStudio({...d,wires:[...d.wires,{a:'resistor:Lead 1',b:'resistor:Lead 2'}]},p).ok,false);
 assert.equal(checkStudio({...d,wires:d.wires.map(w=>({a:w.a,b:w.b==='led:Anode +'?'led:Cathode −':w.b}))},p).ok,false);
 assert.equal(checkStudio({...d,code:d.code.replaceAll('delay(1000)','delay(500)')},p).ok,true);
 assert.equal(checkStudio({...d,code:d.code.replaceAll('delay(1000)','delay(1)')},p).ok,false);
});
