import {libraryComponent} from "./cad-component-library";
export type CADPart={offset:[number,number,number];rotation:[number,number,number];visible:boolean;kind?:string};
export type CADCircuitId='blink'|'battery'|'button'|'alarm';
export type CADAssembly={version:1|2;circuit?:CADCircuitId;code?:string;parts:CADPart[];wires?:{from:number;fromPin:string;to:number;toPin:string;color:string}[]};
export const cadNames=['Chassis','Arduino Uno','L298N driver','Battery holder','HC-SR04 sensor','Wheels and caster','Geared motors'];
export function defaultAssembly():CADAssembly{return {version:2,parts:[],wires:[]};}
export function robotTemplate():CADAssembly{return {version:1,parts:cadNames.map(()=>({offset:[0,0,0],rotation:[0,0,0],visible:true}))};}
export function parseAssembly(value:unknown):CADAssembly{
 const v=value as CADAssembly;
 if(!v||![1,2].includes(v.version)||!Array.isArray(v.parts)||(v.version===1&&v.parts.length<7)||v.parts.length>100)throw Error('Use a STEMBuild robot assembly file, version 1 or 2.');
 for(const p of v.parts)if(!p||typeof p.visible!=='boolean'||![p.offset,p.rotation].every(a=>Array.isArray(a)&&a.length===3&&a.every(n=>typeof n==='number'&&Number.isFinite(n)&&Math.abs(n)<=360)))throw Error('Assembly contains invalid coordinates or rotations.');
 if(v.code!==undefined&&(typeof v.code!=="string"||v.code.length>10000))throw Error("Invalid CAD sketch.");
 if(v.circuit!==undefined&&!['blink','battery','button','alarm'].includes(v.circuit))throw Error('Unknown CAD circuit project.');
 for(let i=v.version===1?7:0;i<v.parts.length;i++)if(!libraryComponent(v.parts[i].kind??''))throw Error('Unknown library component.');
 if(v.wires!==undefined){if(!Array.isArray(v.wires)||v.wires.length>300)throw Error('Too many assembly wires.');for(const w of v.wires)if(!w||!Number.isInteger(w.from)||!Number.isInteger(w.to)||w.from<0||w.to<0||w.from>=v.parts.length||w.to>=v.parts.length||!cadPins(v.parts,w.from).includes(w.fromPin)||!cadPins(v.parts,w.to).includes(w.toPin)||!/^#[0-9a-f]{6}$/i.test(w.color)||(w.from===w.to&&w.fromPin===w.toPin))throw Error('Invalid assembly wire.');}
 return structuredClone(v);
}
export function editCADPart(a:CADAssembly,index:number,part:CADPart):CADAssembly{
 return parseAssembly({...a,parts:a.parts.map((p,i)=>i===index?part:p)});
}

const basePins=[[],['5V','GND','D4','D5','D6','D7','D8','D9'],['VS','GND','IN1','IN2','IN3','IN4','OUT1','OUT2','OUT3','OUT4'],['+','−'],['VCC','TRIG','ECHO','GND'],[],['L+','L−','R+','R−']];
export function cadPins(parts:CADPart[],i:number):string[]{return parts[i]?.kind?libraryComponent(parts[i].kind!)?.pins??[]:basePins[i]??[];}
export function cadPartName(parts:CADPart[],i:number){if(!parts[i])return "No part selected";return !parts[i]?.kind?cadNames[i]??"No part selected":`${libraryComponent(parts[i]?.kind??'')?.name??'Component'} #${parts[0]?.kind?i+1:i-6}`;}

/** Removes incident wires and reindexes retained endpoints. Legacy templates retain their slots. */
export function removeCADPart(a:CADAssembly,index:number):CADAssembly{
 if(a.version===1)throw Error('Hide template parts, or start an empty project to remove individual components.');
 return parseAssembly({...a,parts:a.parts.filter((_,i)=>i!==index),wires:(a.wires??[]).filter(w=>w.from!==index&&w.to!==index).map(w=>({...w,from:w.from>index?w.from-1:w.from,to:w.to>index?w.to-1:w.to}))});
}
