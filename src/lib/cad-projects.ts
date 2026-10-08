import {circuitProjects} from './circuit-studio';
import {defaultLedSketch} from './lab3d';
import {parseAssembly,type CADAssembly,type CADCircuitId} from './robot-cad';

export const cadCircuitProjects=circuitProjects.filter(p=>p.id!=='traffic');
export function cadProject(id:CADCircuitId){return cadCircuitProjects.find(p=>p.id===id)!;}
export function cadCircuitId(a:CADAssembly):CADCircuitId{
 if(a.circuit)return a.circuit;
 if(a.parts.some(p=>p.kind==='battery'))return 'battery';
 if(a.parts.some(p=>p.kind==='buzzer'))return 'alarm';
 if(a.parts.some(p=>p.kind==='button'))return 'button';
 return 'blink';
}
export function cadCircuitExample(id:CADCircuitId,wired=true):CADAssembly{
 const p=cadProject(id);
 const parts=p.parts.map((part,i)=>({kind:part.kind,offset:[i===3?0:i*6-6,0,i===3?6:0] as [number,number,number],rotation:[0,0,0] as [number,number,number],visible:true}));
 const endpoint=(key:string)=>{const [partId,pin]=key.split(':');return {index:p.parts.findIndex(part=>part.id===partId),pin};};
 return parseAssembly({version:2,circuit:id,code:id==='blink'?defaultLedSketch:p.code,parts:wired?parts:[],wires:wired?p.wires.map(w=>{const a=endpoint(w.a),b=endpoint(w.b);return {from:a.index,fromPin:a.pin,to:b.index,toPin:b.pin,color:'#297aad'};}):[]});
}
