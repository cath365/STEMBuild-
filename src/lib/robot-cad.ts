export type CADPart={offset:[number,number,number];rotation:[number,number,number];visible:boolean};
export type CADAssembly={version:1;parts:CADPart[]};
export const cadNames=['Chassis','Arduino Uno','L298N driver','Battery holder','HC-SR04 sensor','Wheels and caster','Geared motors'];
export function defaultAssembly():CADAssembly{return {version:1,parts:cadNames.map(()=>({offset:[0,0,0],rotation:[0,0,0],visible:true}))};}
export function parseAssembly(value:unknown):CADAssembly{
 const v=value as CADAssembly;
 if(!v||v.version!==1||!Array.isArray(v.parts)||v.parts.length!==7)throw Error('Use a STEMBuild robot assembly file, version 1.');
 for(const p of v.parts)if(!p||typeof p.visible!=='boolean'||![p.offset,p.rotation].every(a=>Array.isArray(a)&&a.length===3&&a.every(n=>typeof n==='number'&&Number.isFinite(n)&&Math.abs(n)<=360)))throw Error('Assembly contains invalid coordinates or rotations.');
 return structuredClone(v);
}
export function editCADPart(a:CADAssembly,index:number,part:CADPart):CADAssembly{
 return parseAssembly({...a,parts:a.parts.map((p,i)=>i===index?part:p)});
}
