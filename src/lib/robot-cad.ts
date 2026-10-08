import {libraryComponent} from "./cad-component-library";
export type CADPart={offset:[number,number,number];rotation:[number,number,number];visible:boolean;kind?:string};
export type CADAssembly={version:1;parts:CADPart[];wires?:{from:number;fromPin:string;to:number;toPin:string;color:string}[]};
export const cadNames=['Chassis','Arduino Uno','L298N driver','Battery holder','HC-SR04 sensor','Wheels and caster','Geared motors'];
export function defaultAssembly():CADAssembly{return {version:1,parts:cadNames.map(()=>({offset:[0,0,0],rotation:[0,0,0],visible:true}))};}
export function parseAssembly(value:unknown):CADAssembly{
 const v=value as CADAssembly;
 if(!v||v.version!==1||!Array.isArray(v.parts)||v.parts.length<7||v.parts.length>100)throw Error('Use a STEMBuild robot assembly file, version 1.');
 for(const p of v.parts)if(!p||typeof p.visible!=='boolean'||![p.offset,p.rotation].every(a=>Array.isArray(a)&&a.length===3&&a.every(n=>typeof n==='number'&&Number.isFinite(n)&&Math.abs(n)<=360)))throw Error('Assembly contains invalid coordinates or rotations.');
 for(let i=7;i<v.parts.length;i++)if(!libraryComponent(v.parts[i].kind??''))throw Error('Unknown library component.');
 if(v.wires!==undefined){if(!Array.isArray(v.wires)||v.wires.length>300)throw Error('Too many assembly wires.');for(const w of v.wires)if(!w||!Number.isInteger(w.from)||!Number.isInteger(w.to)||w.from<0||w.to<0||w.from>=v.parts.length||w.to>=v.parts.length||!cadPins(v.parts,w.from).includes(w.fromPin)||!cadPins(v.parts,w.to).includes(w.toPin)||!/^#[0-9a-f]{6}$/i.test(w.color)||(w.from===w.to&&w.fromPin===w.toPin))throw Error('Invalid assembly wire.');}
 return structuredClone(v);
}
export function editCADPart(a:CADAssembly,index:number,part:CADPart):CADAssembly{
 return parseAssembly({...a,parts:a.parts.map((p,i)=>i===index?part:p)});
}

const basePins=[[],['5V','GND','D4','D5','D6','D7','D8','D9'],['VS','GND','IN1','IN2','IN3','IN4','OUT1','OUT2','OUT3','OUT4'],['+','−'],['VCC','TRIG','ECHO','GND'],[],['L+','L−','R+','R−']];
export function cadPins(parts:CADPart[],i:number):string[]{return i<7?basePins[i]:libraryComponent(parts[i]?.kind??'')?.pins??[];}
export function cadPartName(parts:CADPart[],i:number){return i<7?cadNames[i]:`${libraryComponent(parts[i]?.kind??'')?.name??'Component'} #${i-6}`;}
