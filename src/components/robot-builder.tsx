"use client";
import {useState} from 'react';
import Image from 'next/image';
import type { RobotBuilderSnapshot, RobotPlacement } from '@/lib/robot-save';
import {robotMounts,requiredRobotNets,terminal,terminalLabel,validateRobotCircuit,type RobotWire} from '@/lib/robot-circuit';
type Placement=RobotPlacement;
const hardware=['uno','chassis','motor','wheel','l298n','hcsr04','battery'];
const picture=(i:number)=>i===1?'/illustrations/robot-chassis.svg':`/images/cad/${hardware[i]}.webp`;
export function RobotBuilder({disabled,onChange,initial}:{disabled:boolean;onChange:(parts:string[],ready:boolean,snapshot:RobotBuilderSnapshot)=>void;initial?:RobotBuilderSnapshot}){
 const [placements,setPlacements]=useState<Record<number,Placement>>(()=>initial?.placements??{});
 const [wires,setWires]=useState<RobotWire[]>(()=>initial?.wires??[]),[pending,setPending]=useState<string|null>(null);
 const [selected,setSelected]=useState(0),[message,setMessage]=useState('Choose a part and tap its mounting zone, or drag it from the tray.');
 const [drag,setDrag]=useState<number|null>(null);
 const mounted=(ps:Record<number,Placement>)=>robotMounts.filter((m,i)=>ps[i]&&Math.hypot(ps[i].x-m.x,ps[i].y-m.y)<1&&ps[i].rotation===0).map(m=>m.name);
 function update(ps:Record<number,Placement>,ws:RobotWire[]){setPlacements(ps);setWires(ws);const parts=mounted(ps);onChange(parts,validateRobotCircuit(ws).ok,{placements:ps,wires:ws});}
 function place(i:number,x:number,y:number){if(disabled)return;const m=robotMounts[i];const snap=Math.hypot(x-m.x,y-m.y)<35;const ps={...placements,[i]:{x:snap?m.x:Math.max(30,Math.min(370,x)),y:snap?m.y:Math.max(25,Math.min(270,y)),rotation:placements[i]?.rotation??0}};update(ps,wires);setMessage(snap?`${m.name} attached to its mounting zone.`:'Part placed. Move it onto its matching mounting zone.');}
 function point(e:{clientX:number;clientY:number},svg:SVGSVGElement){const m=svg.getScreenCTM();if(!m)return {x:0,y:0};const p=new DOMPoint(e.clientX,e.clientY).matrixTransform(m.inverse());return {x:p.x,y:p.y};}
 function connect(id:string){if(disabled)return;if(!pending){setPending(id);return;}if(id===pending){setPending(null);return;}if(!wires.some(w=>(w.from===pending&&w.to===id)||(w.from===id&&w.to===pending))){update(placements,[...wires,{from:pending,to:id}]);setMessage('Wire added. Check the circuit feedback below.');}setPending(null);}
 const circuit=validateRobotCircuit(wires),parts=mounted(placements);
 return <div className="robot-builder"><h3>1. Assemble the robot</h3><p className="small muted">Select a part, then tap its labelled mounting zone. Drag placed parts to reposition them. Correct placements snap into place; the sensor must face forward.</p>
 <div className="rb-editor"><div className="rb-controls"> <div className="robot-tray">{robotMounts.map((m,i)=><button className={selected===i?'btn active':'btn'} type="button" key={m.name} disabled={disabled} draggable={!disabled} onDragStart={e=>e.dataTransfer.setData('text/plain',String(i))} onClick={()=>setSelected(i)} aria-pressed={selected===i}><Image src={picture(i)} alt="" width={80} height={60} unoptimized/><span>{m.name}</span></button>)}</div>
<div className="rb-wiring"><h3>2. Connect terminals</h3><p className="small muted">Select two pin buttons to create a connection. ENA/ENB are enabled in this fixed-speed driver model. Uno uses a separate regulated supply; this model checks the supported wiring topology, not battery ratings.</p>
 {robotMounts.map((m,i)=>placements[i]&&m.pins.length?<div key={m.name}><strong>{m.name}</strong><div className="robot-pins">{m.pins.map(pin=><button className="btn" key={pin} disabled={disabled} aria-pressed={pending===terminal(i,pin)} onClick={()=>connect(terminal(i,pin))} aria-label={`${m.name} ${pin}`}>{pin}</button>)}</div></div>:null)}
 <p>{pending?`Connect ${terminalLabel(pending)} to another terminal.`:'Select the first terminal.'}</p>
 <ul className="robot-wire-list">{wires.map((w,i)=><li key={`${w.from}-${w.to}`}>{terminalLabel(w.from)} → {terminalLabel(w.to)} <button disabled={disabled} onClick={()=>update(placements,wires.filter((_,n)=>n!==i))} aria-label={`Remove wire ${i+1}`}>Remove</button></li>)}</ul>
 <div role="status">{circuit.errors.map(e=><p className="notice" key={e}>{e}</p>)}{circuit.ok?<p>Supported wiring topology passes ✓</p>:<p>{circuit.missing.length}/{requiredRobotNets.length} required paths missing</p>}</div>
 <details><summary>Required pin map</summary>{requiredRobotNets.map(([a,b])=><p className="small" key={a+b}>{terminalLabel(a)} → {terminalLabel(b)}</p>)}</details>
</div></div><div className="rb-stage"> <svg className="robot-assembly" viewBox="0 0 400 300" aria-label="Robot assembly workspace" onPointerUp={e=>{if(drag!==null){const p=point(e,e.currentTarget);place(drag,p.x,p.y);setDrag(null);}}} onPointerCancel={()=>setDrag(null)} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const raw=e.dataTransfer.getData('text/plain');if(!raw)return;const i=Number(raw);if(!Number.isInteger(i)||i<0||i>=robotMounts.length)return;const p=point(e,e.currentTarget);place(i,p.x,p.y);}}>
 <rect width="400" height="300" fill="#edf3f8" rx="12"/><image href="/illustrations/robot-chassis.svg" x="100" y="30" width="200" height="240" opacity=".2"/>
 {robotMounts.map((m,i)=><g key={m.name}><rect x={m.x-34} y={m.y-19} width="68" height="38" rx="5" fill="none" stroke="#879eb2" strokeDasharray="4 3" onClick={()=>place(selected,m.x,m.y)}/><text x={m.x} y={m.y+30} textAnchor="middle" fontSize="9" fill="#334155" pointerEvents="none">{m.name}</text></g>)}
 {wires.map((w,i)=>{const a=placements[Number(w.from.split(':')[0])],b=placements[Number(w.to.split(':')[0])];return a&&b?<path key={i} d={`M${a.x} ${a.y} Q200 ${20+i*8} ${b.x} ${b.y}`} fill="none" stroke={circuit.errors.length?'#c85040':'#297aad'} strokeWidth="2" pointerEvents="none"/>:null;})}
 {Object.entries(placements).map(([key,p])=>{const i=Number(key);return <g key={key} transform={`translate(${p.x} ${p.y}) rotate(${p.rotation})`} onPointerDown={e=>{if(disabled)return;e.stopPropagation();e.currentTarget.ownerSVGElement?.setPointerCapture(e.pointerId);setSelected(i);setDrag(i);}}><rect x="-38" y="-29" width="76" height="58" rx="5" fill="var(--surface)" stroke={parts.includes(robotMounts[i].name)?'var(--brand-teal)':'var(--brand-orange)'} strokeWidth="2"/><image href={picture(i)} x="-36" y="-27" width="72" height="54" pointerEvents="none"/>{(i===2||i===3)&&<text x="29" y="24" fontSize="9" fill="var(--text)" pointerEvents="none">×2</text>}</g>;})}
 </svg>
 <div className="inline"><button className="btn" disabled={disabled} onClick={()=>place(selected,robotMounts[selected].x,robotMounts[selected].y)}>Attach selected part</button><button className="btn" disabled={disabled||!placements[selected]} onClick={()=>update({...placements,[selected]:{...placements[selected],rotation:(placements[selected].rotation+90)%360}},wires)}>Rotate selected part</button><button className="btn" disabled={disabled||!placements[selected]} onClick={()=>{const ps={...placements};delete ps[selected];update(ps,wires.filter(w=>!w.from.startsWith(`${selected}:`)&&!w.to.startsWith(`${selected}:`)));setPending(null);}}>Remove selected part</button></div>
 <p role="status">{message}</p><p>{parts.length}/7 parts correctly mounted</p></div></div>
 </div>;
}
