import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultAssembly,editCADPart,parseAssembly} from '../../src/lib/robot-cad';
test('CAD edits preserve other parts and do not mutate undo snapshots',()=>{
 const before=defaultAssembly();const after=editCADPart(before,1,{offset:[3,2,1],rotation:[0,90,0],visible:true});
 assert.deepEqual(before.parts[1].offset,[0,0,0]);assert.deepEqual(after.parts[1].offset,[3,2,1]);assert.deepEqual(after.parts[0],before.parts[0]);
});
test('CAD import rejects incompatible, malformed and unbounded assemblies',()=>{
 assert.throws(()=>parseAssembly({version:2,parts:[]}));const a=defaultAssembly();a.parts[0].offset[0]=Infinity;assert.throws(()=>parseAssembly(a));a.parts[0].offset[0]=1000;assert.throws(()=>parseAssembly(a));
 assert.deepEqual(parseAssembly(defaultAssembly()),defaultAssembly());
});

test('CAD supports repeated library components and validates saved wire endpoints',()=>{
 const a=defaultAssembly();a.parts.push({kind:'led',offset:[1,0,0],rotation:[0,0,0],visible:true},{kind:'led',offset:[2,0,0],rotation:[0,0,0],visible:true});
 a.wires=[{from:7,fromPin:'Anode +',to:8,toPin:'Cathode −',color:'#297aad'}];assert.equal(parseAssembly(a).parts.length,9);
 a.wires[0].toPin='unknown';assert.throws(()=>parseAssembly(a));a.wires=[];a.parts[7].kind='unknown';assert.throws(()=>parseAssembly(a));
});

test('expanded catalogue types survive assembly import with their terminal labels',async()=>{
 const {cadLibrary}=await import('../../src/lib/cad-component-library');
 assert.equal(new Set(cadLibrary.map(c=>c.id)).size,cadLibrary.length);
 const a=defaultAssembly();a.wires=[];
 for(const c of cadLibrary){
  assert.ok(c.size.every(n=>Number.isFinite(n)&&n>0));
  const index=a.parts.length;a.parts.push({kind:c.id,offset:[index,0,0],rotation:[0,0,0],visible:true});
  if(c.pins.length)a.wires!.push({from:1,fromPin:'GND',to:index,toPin:c.pins[0],color:'#297aad'});
 }
 const restored=parseAssembly(JSON.parse(JSON.stringify(a)));
 assert.deepEqual(restored,a);
});
