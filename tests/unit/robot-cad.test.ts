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
