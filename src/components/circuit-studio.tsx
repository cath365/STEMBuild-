'use client';
import Image from 'next/image';
import {useEffect,useRef,useState} from 'react';
import {BreadboardWorkshop} from './breadboard-workshop';
import {checkStudio,circuitProjects,emptyStudio,exampleStudio,parseStudio,studioDelays,type StudioDocument} from '@/lib/circuit-studio';

const STORAGE='stembuild-circuit-studio-v1';
type Documents=Record<string,StudioDocument>;
function download(name:string,content:string,type:string){const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}

export function CircuitStudio({active=true}:{active?:boolean}){
 const [choice,setChoice]=useState('breadboard');
 const [documents,setDocuments]=useState<Documents>(()=>Object.fromEntries(circuitProjects.map(p=>[p.id,emptyStudio(p)])));
 const [ready,setReady]=useState(false),[saveMessage,setSaveMessage]=useState('Projects save on this device.'),[canSave,setCanSave]=useState(true);
 const [selected,setSelected]=useState(''),[first,setFirst]=useState(''),[past,setPast]=useState<StudioDocument[]>([]);
 const [running,setRunning]=useState(false),[elapsed,setElapsed]=useState(0),[pressed,setPressed]=useState(false),[notice,setNotice]=useState('');
 const board=useRef<SVGSVGElement>(null);
 const drag=useRef<{id:string;dx:number;dy:number;document:StudioDocument}|null>(null);
 const project=circuitProjects.find(p=>p.id===choice)??circuitProjects[0];
 const doc=documents[project.id],check=checkStudio(doc,project);
 useEffect(()=>{const frame=requestAnimationFrame(()=>{
  try{const raw=localStorage.getItem(STORAGE);if(raw){const saved=JSON.parse(raw);if(saved.version!==1||!saved.documents||typeof saved.documents!=='object')throw Error('Invalid save');const next:Documents={};for(const p of circuitProjects){next[p.id]=saved.documents[p.id]===undefined?emptyStudio(p):parseStudio(saved.documents[p.id],p)!;if(!next[p.id])throw Error('Invalid project');}setDocuments(next);if(saved.choice==='breadboard'||circuitProjects.some(p=>p.id===saved.choice))setChoice(saved.choice);setSaveMessage('Saved projects restored.');}}
  catch{setCanSave(false);setSaveMessage('Saved data could not be restored. It has been retained; download a backup before clearing browser storage.');}
  setReady(true);
 });return ()=>cancelAnimationFrame(frame);},[]);
 useEffect(()=>{if(!running||!active)return;const start=Date.now();const timer=setInterval(()=>setElapsed(Date.now()-start),50);return ()=>clearInterval(timer);},[running,active]);
 if(running&&!active){setRunning(false);setPressed(false);}
 function stop(){setRunning(false);setPressed(false);}
 function persist(next:Documents,nextChoice=choice){if(!ready||!canSave)return;try{localStorage.setItem(STORAGE,JSON.stringify({version:1,choice:nextChoice,documents:next}));setSaveMessage('Saved on this device.');}catch{setSaveMessage('Device save unavailable. Download a circuit backup.');}}
 function change(next:StudioDocument){stop();setFirst('');setPast(h=>[...h,doc].slice(-30));const all={...documents,[project.id]:next};setDocuments(all);persist(all);setNotice('');}
 function choose(id:string){stop();setFirst('');setSelected('');setPast([]);setNotice('');setChoice(id);persist(documents,id);}
 function connect(pin:string){if(!first){setFirst(pin);return;}if(first===pin){setFirst('');return;}if(doc.wires.some(w=>(w.a===first&&w.b===pin)||(w.b===first&&w.a===pin))){setFirst('');return;}change({...doc,wires:[...doc.wires,{a:first,b:pin}]});}
 function position(e:React.PointerEvent<SVGSVGElement>){const r=e.currentTarget.getBoundingClientRect();return {x:(e.clientX-r.left)*820/r.width,y:(e.clientY-r.top)*540/r.height};}
 function finishDrag(e:React.PointerEvent<SVGSVGElement>){if(!drag.current)return;const next=drag.current.document;drag.current=null;const all={...documents,[project.id]:next};setDocuments(all);persist(all);if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);}
 function move(dx:number,dy:number){change({...doc,placed:doc.placed.map(p=>p.id===selected?{...p,x:Math.max(0,Math.min(630,p.x+dx)),y:Math.max(0,Math.min(350,p.y+dy))}:p)});}
 function terminal(key:string){const [id,pin]=key.split(':');const part=doc.placed.find(p=>p.id===id);const def=project.parts.find(p=>p.id===id);return {x:(part?.x??0)+160,y:(part?.y??0)+30+(def?.pins.indexOf(pin)??0)*24};}
 const times=studioDelays(doc.code),duration=times.reduce((a,b)=>a+b,0)||2000;
 let phase=0;if(project.output==='traffic'){let t=elapsed%duration;while(phase<times.length-1&&t>=times[phase]){t-=times[phase];phase++;}}
 const lit=(id:string)=>running&&active&&(project.output==='blink'?elapsed%duration<(times[0]??1000):project.output==='traffic'?id===['red','yellow','green'][phase]:pressed);
 const output=!running||!active?'Preview stopped':project.output==='alarm'?(pressed?'Piezo ACTIVE (visual preview)':'Piezo inactive'):project.output==='traffic'?`${['Red','Yellow','Green'][phase]} light ON`:lit('led')?'LED ON':'LED OFF';
 const name=(key:string)=>{const [id,pin]=key.split(':');return `${project.parts.find(p=>p.id===id)?.name??id} ${pin}`;};

 return <section className="circuit-studio" aria-label="Circuit project studio">
  <header className="cs-heading"><div><p className="eyebrow">STEMBUILD / ELECTRONICS LAB</p><h2>Circuit Builder</h2><p>Select a project. Place its components, connect terminals and test the result.</p></div><span className="cs-save" role="status">{saveMessage}</span></header>
  <div className="cs-projects" aria-label="Circuit projects">
   <button aria-pressed={choice==='breadboard'} onClick={()=>choose('breadboard')}><Image src="/images/cad/breadboard.webp" alt="" width={120} height={90} unoptimized/><strong>Breadboard workshop</strong><span>Hole-level wiring · LED blink</span><small>Interactive</small></button>
   {circuitProjects.map(p=><button key={p.id} aria-pressed={choice===p.id} onClick={()=>choose(p.id)}><Image src={`/images/cad/${p.output==='alarm'?'buzzer':p.output==='button'?'button':'led'}.webp`} alt="" width={120} height={90} unoptimized/><strong>{p.name}</strong><span>{p.summary}</span><small>Beginner · Logic preview</small></button>)}
  </div>
  <div hidden={choice!=='breadboard'}><BreadboardWorkshop active={active&&choice==='breadboard'}/></div>
  {choice!=='breadboard'&&<div className="cs-workspace">
   <div className="cs-toolbar"><strong>{project.name}</strong><div><button disabled={!ready} onClick={()=>{change(emptyStudio(project));setSelected('');}}>Start empty circuit</button><button disabled={!ready} onClick={()=>change(exampleStudio(project))}>Load circuit example</button><button disabled={!past.length} onClick={()=>{const prev=past.at(-1)!;stop();setFirst('');setPast(past.slice(0,-1));const all={...documents,[project.id]:prev};setDocuments(all);persist(all);}}>Undo circuit edit</button></div></div>
   <div className="cs-layout">
    <aside className="cs-parts"><h3>01 · Components</h3><p>Add each required part. Drag a placed part to reposition it, or use the position buttons.</p>
     {project.parts.map(p=><button className="cs-part" key={p.id} disabled={!ready||doc.placed.some(c=>c.id===p.id)} onClick={()=>{change({...doc,placed:[...doc.placed,{id:p.id,x:p.x,y:p.y}]});setSelected(p.id);}}><Image src={`/images/cad/${p.kind}.webp`} alt="" width={80} height={60} unoptimized/><span>{p.name}<small>{doc.placed.some(c=>c.id===p.id)?'Placed':'Add to workbench'}</small></span></button>)}
     <h3>02 · Position</h3><label>Select part<select value={selected} onChange={e=>setSelected(e.target.value)}><option value="">Select a part</option>{doc.placed.map(p=><option key={p.id} value={p.id}>{project.parts.find(c=>c.id===p.id)?.name} ({p.id})</option>)}</select></label>
     <div className="cs-position">{[['Left',-15,0],['Right',15,0],['Up',0,-15],['Down',0,15]].map(([label,x,y])=><button key={label} disabled={!doc.placed.some(p=>p.id===selected)} onClick={()=>move(Number(x),Number(y))}>{label}</button>)}</div>
     <button disabled={!doc.placed.some(p=>p.id===selected)} onClick={()=>{change({...doc,placed:doc.placed.filter(p=>p.id!==selected),wires:doc.wires.filter(w=>!w.a.startsWith(selected+':')&&!w.b.startsWith(selected+':'))});setSelected('');}}>Remove circuit part</button>
    </aside>
    <div className="cs-workbench"><div className="cs-canvas-heading"><h3>03 · Wiring workbench</h3><span>{doc.placed.length}/{project.parts.length} parts · {doc.wires.length} wires</span><p>{first?`Now select the other terminal for ${name(first)}.`:'Tap two labelled terminals to connect a wire.'}</p></div>
     <div className="cs-canvas-scroll"><svg ref={board} viewBox="0 0 820 540" role="group" aria-label={`${project.name} circuit workbench`} onPointerMove={e=>{const moving=drag.current;if(!moving)return;const p=position(e);moving.document={...moving.document,placed:moving.document.placed.map(c=>c.id===moving.id?{...c,x:Math.max(0,Math.min(630,p.x-moving.dx)),y:Math.max(0,Math.min(350,p.y-moving.dy))}:c)};setDocuments({...documents,[project.id]:moving.document});}} onPointerUp={finishDrag} onPointerCancel={finishDrag}>
      <defs><pattern id="cs-grid" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="0.7" fill="var(--border)"/></pattern></defs><rect width="820" height="540" fill="url(#cs-grid)"/>
      {!doc.placed.length&&<text x="410" y="245" textAnchor="middle" fill="var(--muted)">Your workbench is empty.</text>}
      {doc.wires.map((w,i)=>{const a=terminal(w.a),b=terminal(w.b);return <path key={i} d={`M${a.x} ${a.y} C${a.x+60} ${a.y},${b.x+60} ${b.y},${b.x} ${b.y}`} fill="none" stroke="var(--primary)" strokeWidth="3"/>;})}
      {doc.placed.map(p=>{const def=project.parts.find(c=>c.id===p.id)!;return <g key={p.id} transform={`translate(${p.x} ${p.y})`}><rect width="150" height="150" rx="6" fill="var(--surface)" stroke={selected===p.id?'var(--primary)':'var(--border)'} strokeWidth="2"/><image href={`/images/cad/${def.kind}.webp`} x="7" y="10" width="136" height="105" style={{cursor:'grab',touchAction:'none',filter:p.id==='yellow'?'hue-rotate(55deg)':p.id==='green'?'hue-rotate(125deg)':undefined}} onPointerDown={e=>{if(!board.current)return;stop();setSelected(p.id);setPast(h=>[...h,doc].slice(-30));const r=board.current.getBoundingClientRect();drag.current={id:p.id,dx:(e.clientX-r.left)*820/r.width-p.x,dy:(e.clientY-r.top)*540/r.height-p.y,document:doc};board.current.setPointerCapture(e.pointerId);}}/><text x="75" y="133" textAnchor="middle" fontSize="12" fill="var(--text)">{def.name}</text>{['led','buzzer'].includes(def.kind)&&<g><circle cx="20" cy="20" r="8" fill={lit(p.id)?(p.id==='yellow'?'#f3ce38':p.id==='green'?'#3b986a':'#dc423d'):'#929a9f'}/><text x="34" y="25" fontSize="10" fill="var(--text)">{lit(p.id)?'ON':'OFF'}</text></g>}{def.pins.map((pin,i)=><g key={pin} role="button" tabIndex={0} aria-label={`Connect ${def.name} ${pin}`} className="cs-terminal" onClick={()=>connect(`${p.id}:${pin}`)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();connect(`${p.id}:${pin}`);}}}><circle cx="160" cy={30+i*24} r="13" fill={first===`${p.id}:${pin}`?'var(--primary)':'var(--surface)'} stroke="var(--primary)" strokeWidth="2"/><circle cx="160" cy={30+i*24} r="3" fill="var(--accent)"/><text x="180" y={34+i*24} fontSize="11" fill="var(--text)">{pin}</text></g>)}</g>;})}
     </svg></div>
     <button onClick={()=>setFirst('')} disabled={!first}>Cancel terminal selection</button>
     <ol className="cs-wires">{doc.wires.map((w,i)=><li key={i}><span>{name(w.a)} → {name(w.b)}</span><button aria-label={`Remove circuit wire ${i+1}`} onClick={()=>change({...doc,wires:doc.wires.filter((_,n)=>n!==i)})}>Remove wire {i+1}</button></li>)}</ol>
     <details><summary>Connection schedule · required wires</summary><ol>{project.wires.map((w,i)=><li key={i}>{name(w.a)} → {name(w.b)}</li>)}</ol></details>
    </div>
   </div>
   <div className="cs-test-code"><section><h3>04 · Check and test</h3><p>{check.message}</p><button onClick={()=>setNotice(check.message)}>Check circuit wiring</button><button className="btn-primary" disabled={!ready||!check.ok} onClick={()=>{setElapsed(0);setPressed(false);setRunning(true);}}>Run logic preview</button><button disabled={!running} onClick={stop}>Stop logic preview</button>{['button','alarm'].includes(project.output)&&<button aria-pressed={pressed} disabled={!running} onClick={()=>setPressed(!pressed)}>{pressed?'Release test button':'Press test button'}</button>}<p className="cs-output" aria-live="polite">{output}</p><p className="cs-notice" role="status">{notice}</p><p className="small muted">A wiring-aware logic preview, not an electrical solver or compiled firmware. No voltage, current, heat or real sound is calculated. Use a 330 Ω resistor per LED. Real sounders must be rated for the drive current; use a transistor driver for unknown or high-current devices.</p></section>
    <section><h3>05 · Arduino sketch</h3><label className="sr-only" htmlFor="cs-code">Circuit Arduino sketch</label><textarea id="cs-code" spellCheck={false} value={doc.code} onChange={e=>change({...doc,code:e.target.value})}/><button onClick={()=>download(`${project.id}.ino`,doc.code,'text/plain')}>Download circuit sketch</button><button onClick={()=>download(`${project.id}.json`,JSON.stringify({project:project.id,document:doc},null,2),'application/json')}>Download circuit backup</button><label>Import circuit backup<input type="file" accept="application/json,.json" onChange={async e=>{const file=e.target.files?.[0];e.target.value='';if(!file)return;try{if(file.size>100000)throw Error();const imported=JSON.parse(await file.text());const valid=imported.project===project.id?parseStudio(imported.document,project):null;if(!valid)throw Error();change(valid);setNotice('Circuit backup imported.');}catch{setNotice('Import rejected. Choose a valid backup for this project.');}}}/></label></section>
   </div>
  </div>}
 </section>;
}
