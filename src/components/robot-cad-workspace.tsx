"use client";
import {useCallback,useEffect,useRef,useState} from 'react';
import Image from 'next/image';
import {createRobotModels} from '@/lib/robot-models';
import {cadLibrary,createLibraryModel} from "@/lib/cad-component-library";
import {cadPartName,cadPins,cadNames,defaultAssembly,robotTemplate,removeCADPart,editCADPart,parseAssembly,type CADAssembly} from '@/lib/robot-cad';

import {checkCADCircuit} from '@/lib/cad-circuit-test';
import {defaultLedSketch} from '@/lib/lab3d';
import {cadTerminalPosition} from '@/lib/cad-terminals';

export function RobotCADWorkspace({active=true}:{active?:boolean}){
 const [history,setHistory]=useState<{past:CADAssembly[];current:CADAssembly;future:CADAssembly[]}>({past:[],current:defaultAssembly(),future:[]});
 const assembly=history.current;
 const [selectedRaw,setSelected]=useState(0),[enabled,setEnabled]=useState(false),[mode,setMode]=useState<'translate'|'rotate'>('translate');
 const selected=Math.max(0,Math.min(selectedRaw,history.current.parts.length-1));
 const [running,setRunning]=useState(false),[ledOn,setLedOn]=useState(false);
 const circuit=checkCADCircuit(history.current);
 useEffect(()=>{if(!running||!active||!circuit.ready)return;let timer:ReturnType<typeof setTimeout>;let on=true;const tick=()=>{setLedOn(on);timer=setTimeout(()=>{on=!on;tick();},Math.max(50,on?circuit.sketch.highDelayMs:circuit.sketch.lowDelayMs));};timer=setTimeout(tick,0);return ()=>clearTimeout(timer);},[running,active,circuit.ready,circuit.sketch.highDelayMs,circuit.sketch.lowDelayMs]);
 const [wireMode,setWireMode]=useState(false),[wireColor,setWireColor]=useState('#297aad');
 const [search,setSearch]=useState(''),[wireStart,setWireStart]=useState<{index:number;pin:string}|null>(null);
 const pendingTerminal=useRef<{index:number;pin:string}|null>(null);
 const chooseTerminal=useCallback((value:{index:number;pin:string}|null)=>{pendingTerminal.current=value;setWireStart(value);},[]);
 // The edits remain in React state when another workspace is selected.
 // Unmount the active WebGL renderer to avoid wasting GPU/battery on phones.
 useEffect(()=>{const timer=setTimeout(()=>{if(!active){setEnabled(false);setRunning(false);setLedOn(false);}},0);return ()=>clearTimeout(timer);},[active]);

 const [status,setStatus]=useState('Launch 3D to edit the assembly directly.'),[snap,setSnap]=useState(true);
 const mount=useRef<HTMLDivElement>(null),latest=useRef({assembly:history.current,selected,mode,snap,ledOn:false,wireMode:false,wireStart:null as {index:number;pin:string}|null});
 const commitRef=useRef<(a:CADAssembly)=>void>(()=>{}),selectRef=useRef(setSelected);
 const terminalAction=useRef<(index:number,pin:string,reset?:boolean)=>void>(()=>{});
 const cameraAction=useRef<((view:string)=>void)|null>(null);
 const [fit,setFit]=useState('Contact check not run.'),[dimensions,setDimensions]=useState('Launch 3D to measure the rendered part.');
 const fitAction=useRef<(()=>void)|null>(null);

 const [restored,setRestored]=useState(false),[autosaveAllowed,setAutosaveAllowed]=useState(true);
 const [autosaveStatus,setAutosaveStatus]=useState('Checking for saved CAD work…');
 // Auto-restore from the last edit; retain the older manual-save slot unchanged
 // so Save assembly / Load assembly continue to work as snapshots.
 useEffect(()=>{
  const timer=setTimeout(()=>{
  try{
   const raw=localStorage.getItem('stembuild-robot-cad-autosave-v1')??localStorage.getItem('stembuild-robot-cad-v1');
   if(raw){
    setHistory({past:[],current:parseAssembly(JSON.parse(raw)),future:[]});
    setAutosaveStatus('Your last CAD assembly was restored.');
   }else setAutosaveStatus('Autosave enabled for CAD edits.');
  }catch{
   setAutosaveAllowed(false);
   setAutosaveStatus('Could not restore the saved CAD file. Existing data has been kept; import a backup.');
  }
  setRestored(true);
  },0);return ()=>clearTimeout(timer);
 },[]);
 useEffect(()=>{
  if(!restored||!autosaveAllowed)return;
  const timer=setTimeout(()=>{
  try{
   localStorage.setItem('stembuild-robot-cad-autosave-v1',JSON.stringify(history.current));
   setAutosaveStatus('CAD changes saved automatically on this device.');
  }catch{
   setAutosaveAllowed(false);
   setAutosaveStatus('Browser storage is unavailable. Export an assembly backup.');
  }
  },100);return ()=>clearTimeout(timer);
 },[history,restored,autosaveAllowed]);

 const persist=useCallback((a:CADAssembly)=>{if(!restored||!autosaveAllowed)return;try{localStorage.setItem('stembuild-robot-cad-autosave-v1',JSON.stringify(a));setAutosaveStatus('CAD changes saved automatically on this device.');}catch{setAutosaveAllowed(false);setAutosaveStatus('Browser storage is unavailable. Export an assembly backup.');}},[restored,autosaveAllowed]);
 function stopTest(){setRunning(false);setLedOn(false);}
 const commit=useCallback((a:CADAssembly)=>{pendingTerminal.current=null;setRunning(false);setLedOn(false);setWireStart(null);persist(a);setHistory(h=>({past:[...h.past,h.current].slice(-50),current:a,future:[]}));},[persist]);
 const connectTerminal=useCallback((index:number,pin:string)=>{
  const start=pendingTerminal.current;
  if(!assembly.parts[index]?.visible||!cadPins(assembly.parts,index).includes(pin))return;
  setSelected(index);
  if(start&&(!assembly.parts[start.index]?.visible||!cadPins(assembly.parts,start.index).includes(start.pin))){chooseTerminal(null);setStatus('Choose a new wire endpoint.');return;}
  if(!start){chooseTerminal({index,pin});setStatus(`Choose a second terminal to connect ${cadPartName(assembly.parts,index)} ${pin}.`);return;}
  if(start.index===index&&start.pin===pin){chooseTerminal(null);return;}
  const ws=assembly.wires??[];
  if(ws.length>=300){setStatus('This assembly supports up to 300 wires.');return;}
  const duplicate=ws.some(w=>(w.from===start.index&&w.fromPin===start.pin&&w.to===index&&w.toPin===pin)||(w.to===start.index&&w.toPin===start.pin&&w.from===index&&w.fromPin===pin));
  if(!duplicate){commit(parseAssembly({...assembly,wires:[...ws,{from:start.index,fromPin:start.pin,to:index,toPin:pin,color:wireColor}]}));setStatus('Cable connected. Check your circuit, then run the supported preview.');}else setStatus('These terminals already have a cable.');
  chooseTerminal(null);
 },[assembly,wireColor,commit,chooseTerminal]);
 function connectPin(pin:string){connectTerminal(selected,pin);}

 useEffect(()=>{latest.current={assembly:history.current,selected,mode,snap,ledOn:running&&active&&ledOn,wireMode,wireStart};terminalAction.current=(index,pin,reset)=>{if(reset)chooseTerminal(null);connectTerminal(index,pin);};commitRef.current=commit;selectRef.current=setSelected;},[history,selected,mode,snap,running,active,ledOn,commit,wireMode,wireStart,wireColor,connectTerminal,chooseTerminal]);
 useEffect(()=>{
  if(!enabled)return;let dead=false,raf=0,renderer:any,scene:any,orbit:any,gizmo:any,observer:ResizeObserver|undefined;
  let down:{x:number;y:number}|null=null;let dragging=false;
  async function boot(){try{
   const imp=new Function('url','return import(url)') as (url:string)=>Promise<any>;
   const [T,O,C]=await Promise.all([imp('https://esm.sh/three@0.180.0'),imp('https://esm.sh/three@0.180.0/examples/jsm/controls/OrbitControls.js'),imp('https://esm.sh/three@0.180.0/examples/jsm/controls/TransformControls.js')]);
   if(dead||!mount.current)return;
   scene=new T.Scene();scene.background=new T.Color(0xeaf0f5);
   renderer=new T.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));mount.current.replaceChildren(renderer.domElement);
   const camera=new T.PerspectiveCamera(42,1,.1,500);camera.position.set(35,35,45);
   orbit=new O.OrbitControls(camera,renderer.domElement);orbit.target.set(0,6,0);orbit.enableDamping=true;orbit.minDistance=2;orbit.maxDistance=160;
   scene.add(new T.HemisphereLight(0xffffff,0x687c91,3));scene.add(new T.GridHelper(60,60,0x718ca3,0xbdccd8));scene.add(new T.AxesHelper(18));
   const car=new T.Group();scene.add(car);let objects:any[]=[];let bases:any[]=[];let assemblyVersion=0;const wireGroup=new T.Group();scene.add(wireGroup);let wireKey="";const terminals=new T.Group();scene.add(terminals);let terminalKey='';
   let draggedPin:{index:number;pin:string}|null=null;
   const preview=new T.Line(new T.BufferGeometry(),new T.LineBasicMaterial({color:0x297aad}));preview.visible=false;scene.add(preview);
   function terminalPoint(index:number,pin:string){return objects[index].localToWorld(new T.Vector3(...cadTerminalPosition(latest.current.assembly.parts,index,pin)));}
   function dispose(o:any){o.traverse((m:any)=>{m.geometry?.dispose();m.material?.map?.dispose();m.material?.dispose();});}
   gizmo=new C.TransformControls(camera,renderer.domElement);gizmo.setSpace('world');scene.add(gizmo.getHelper());
   gizmo.addEventListener('dragging-changed',(e:any)=>{dragging=e.value;orbit.enabled=!e.value;});
   gizmo.addEventListener('mouseUp',()=>{const l=latest.current,o=objects[l.selected];if(!o)return;const part={...l.assembly.parts[l.selected],offset:[o.position.x-bases[l.selected].x,o.position.y-bases[l.selected].y,o.position.z-bases[l.selected].z] as [number,number,number],rotation:[o.rotation.x*180/Math.PI,o.rotation.y*180/Math.PI,o.rotation.z*180/Math.PI] as [number,number,number]};try{commitRef.current(editCADPart(l.assembly,l.selected,part));}catch{setStatus('Move exceeds the supported assembly range.');}});
   const ray=new T.Raycaster();
   function hitTerminal(e:PointerEvent){const r=renderer.domElement.getBoundingClientRect();ray.setFromCamera(new T.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),camera);return latest.current.wireMode?ray.intersectObjects(terminals.children).find((h:any)=>h.object.visible)?.object.userData:null;}
   renderer.domElement.addEventListener('pointerdown',(e:PointerEvent)=>{if(e.button!==0)return;down={x:e.clientX,y:e.clientY};const pin=hitTerminal(e);if(pin){draggedPin=pin;orbit.enabled=false;renderer.domElement.setPointerCapture(e.pointerId);}});
   renderer.domElement.addEventListener('pointermove',(e:PointerEvent)=>{const pin=hitTerminal(e);renderer.domElement.title=pin?`${cadPartName(latest.current.assembly.parts,pin.index)} · ${pin.pin}`:'';renderer.domElement.style.cursor=pin?'crosshair':latest.current.wireMode?'default':'grab';if(!draggedPin)return;const a=terminalPoint(draggedPin.index,draggedPin.pin);const b=pin?terminalPoint(pin.index,pin.pin):ray.ray.at(a.distanceTo(camera.position),new T.Vector3());const mid=a.clone().add(b).multiplyScalar(.5);mid.y+=2;preview.geometry.dispose();preview.geometry=new T.BufferGeometry().setFromPoints(new T.QuadraticBezierCurve3(a,mid,b).getPoints(24));preview.visible=true;});
   function endDrag(){draggedPin=null;preview.visible=false;orbit.enabled=true;down=null;}
   renderer.domElement.addEventListener('pointercancel',endDrag);
   renderer.domElement.addEventListener('pointerup',(e:PointerEvent)=>{
    const pin=hitTerminal(e);const moved=down&&Math.hypot(e.clientX-down.x,e.clientY-down.y)>4;
    if(draggedPin){const from=draggedPin;if(moved&&pin&&(pin.index!==from.index||pin.pin!==from.pin)){terminalAction.current(from.index,from.pin,true);terminalAction.current(pin.index,pin.pin);}else if(!moved&&pin)terminalAction.current(pin.index,pin.pin);else setStatus('Cable cancelled. Drop on another terminal marker to connect.');endDrag();if(renderer.domElement.hasPointerCapture(e.pointerId))renderer.domElement.releasePointerCapture(e.pointerId);return;}
    if(!down||moved||gizmo.axis){down=null;return;}const hits=ray.intersectObjects(objects,true).filter((h:any)=>h.object.isMesh);for(const h of hits){let p=h.object;while(p&&p.parent!==car)p=p.parent;const i=objects.indexOf(p);if(i>=0&&objects[i].visible){selectRef.current(i);break;}}down=null;
   });
   cameraAction.current=(view)=>{camera.up.set(0,1,0);if(view==='Selected'||view==='Fit assembly'){scene.updateMatrixWorld(true);const box=new T.Box3();for(const [i,o] of objects.entries())if(o.visible&&(view==='Fit assembly'||i===latest.current.selected))box.union(new T.Box3().setFromObject(o));if(!box.isEmpty()){const target=box.getCenter(new T.Vector3());const size=box.getSize(new T.Vector3());const distance=Math.max(3,Math.max(size.x/camera.aspect,size.y,size.z)*1.8);orbit.target.copy(target);camera.position.copy(target).add(new T.Vector3(0,distance*.8,distance));orbit.update();}return;}if(view==='Top'){camera.position.set(0,65,0);camera.up.set(0,0,-1);}else if(view==='Front')camera.position.set(0,8,65);else if(view==='Side')camera.position.set(65,8,0);else camera.position.set(35,35,45);orbit.target.set(0,6,0);orbit.update();};
   fitAction.current=()=>{scene.updateMatrixWorld(true);const boxes=objects.map((o:any)=>new T.Box3().setFromObject(o));const pairs:string[]=[];const indices=latest.current.assembly.version===1?[1,2,3,4]:objects.map((_,i)=>i);for(const i of indices)for(const j of indices)if(j>i&&objects[i]?.visible&&objects[j]?.visible&&boxes[i].intersectsBox(boxes[j]))pairs.push(`${cadPartName(latest.current.assembly.parts,i)} / ${cadPartName(latest.current.assembly.parts,j)}`);setFit(pairs.length?`Possible electronics overlap: ${pairs.join('; ')}`:'No electronics bounding-box overlaps detected.');};
   function resize(){if(!mount.current)return;const r=mount.current.getBoundingClientRect();renderer.setSize(r.width,r.height);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();}observer=new ResizeObserver(resize);observer.observe(mount.current);resize();setStatus('3D assembly ready. Select a part and drag an axis handle.');
   let dimensionKey='';let fitCount=-1;
   function draw(){if(dead)return;const l=latest.current;
    if(assemblyVersion!==l.assembly.version){for(const o of objects){car.remove(o);dispose(o);}objects=[];bases=[];assemblyVersion=l.assembly.version;if(assemblyVersion===1){objects=createRobotModels(T,car);bases=objects.map(o=>o.position.clone());}}
    for(let i=assemblyVersion===1?7:0;i<Math.max(objects.length,l.assembly.parts.length);i++){const kind=l.assembly.parts[i]?.kind;if(objects[i]?.userData.catalogKind!==kind){if(objects[i]){car.remove(objects[i]);dispose(objects[i]);}if(kind){const o=createLibraryModel(T,kind);o.userData.catalogKind=kind;car.add(o);objects[i]=o;bases[i]=new T.Vector3();}}}objects.length=l.assembly.parts.length;bases.length=l.assembly.parts.length;
    objects.forEach((o:any,i:number)=>{const p=l.assembly.parts[i];o.visible=p.visible;if(!(dragging&&i===l.selected)){o.position.copy(bases[i]).add(new T.Vector3(...p.offset));o.rotation.set(...p.rotation.map(n=>n*Math.PI/180));}});
    if(fitCount!==objects.length){fitCount=objects.length;cameraAction.current?.('Fit assembly');}
    if(!l.wireMode&&objects[l.selected]?.visible){if(gizmo.object!==objects[l.selected])gizmo.attach(objects[l.selected]);}else gizmo.detach();gizmo.setMode(l.mode);gizmo.setTranslationSnap(l.snap?.5:null);gizmo.setRotationSnap(l.snap?Math.PI/12:null);
    const wk=JSON.stringify([l.assembly.parts,l.assembly.wires]);if(wk!==wireKey&&!dragging){for(const o of [...wireGroup.children]){wireGroup.remove(o);dispose(o);}car.updateMatrixWorld(true);for(const w of l.assembly.wires??[]){if(!objects[w.from].visible||!objects[w.to].visible)continue;const a=terminalPoint(w.from,w.fromPin),b=terminalPoint(w.to,w.toPin);const mid=a.clone().add(b).multiplyScalar(.5);mid.y+=3;const curve=new T.QuadraticBezierCurve3(a,mid,b);wireGroup.add(new T.Mesh(new T.TubeGeometry(curve,16,.06,5,false),new T.MeshStandardMaterial({color:w.color})));}wireKey=wk;}
    const tk=JSON.stringify(l.assembly.parts.map(p=>p.kind??'template'));if(tk!==terminalKey){for(const o of [...terminals.children]){terminals.remove(o);dispose(o);}l.assembly.parts.forEach((_,index)=>cadPins(l.assembly.parts,index).forEach(pin=>{const marker=new T.Mesh(new T.SphereGeometry(.16,10,8),new T.MeshBasicMaterial({color:0x168b9c,depthTest:false}));marker.userData={index,pin};marker.renderOrder=10;terminals.add(marker);}));terminalKey=tk;}
    car.updateMatrixWorld(true);for(const marker of terminals.children){const {index,pin}=marker.userData;marker.visible=l.wireMode&&!!objects[index]?.visible;if(marker.visible){marker.position.copy(terminalPoint(index,pin));const pending=l.wireStart?.index===index&&l.wireStart?.pin===pin;marker.material.color.setHex(pending?0xf5b437:0x168b9c);marker.scale.setScalar(pending?1.5:1);}}
    const dk=JSON.stringify([l.selected,l.assembly.parts[l.selected]]);if(objects[l.selected]&&dk!==dimensionKey&&!dragging){scene.updateMatrixWorld(true);const bounds=new T.Box3();objects[l.selected].traverse((m:any)=>{if(m.isMesh){m.geometry.computeBoundingBox();bounds.union(m.geometry.boundingBox.clone().applyMatrix4(m.matrixWorld));}});const size=bounds.getSize(new T.Vector3());setDimensions(`Rendered bounds: ${size.x.toFixed(2)} × ${size.y.toFixed(2)} × ${size.z.toFixed(2)} cm (X × Y × Z).`);dimensionKey=dk;}
    renderer.domElement.dataset.cadPosition=JSON.stringify(objects[l.selected]?.position.toArray()??[]);renderer.domElement.dataset.cadSelection=cadPartName(l.assembly.parts,l.selected);renderer.domElement.dataset.cadOffset=JSON.stringify(l.assembly.parts[l.selected]?.offset??[]);objects.forEach((o,i)=>{if(l.assembly.parts[i]?.kind==='led')o.traverse((m:any)=>{if(m.material?.emissive&&m.material.color?.getHex()===0xc43b43){m.material.emissive.setHex(l.ledOn?0x8f160d:0);}});});renderer.domElement.dataset.cadLed=l.ledOn?'on':'off';renderer.domElement.dataset.cadWires=String(l.assembly.wires?.length??0);renderer.domElement.dataset.cadTerminals=String(terminals.children.filter((m:any)=>m.visible).length);orbit.update();renderer.render(scene,camera);raf=requestAnimationFrame(draw);
   }draw();
  }catch{if(!dead)setStatus('3D could not load. Coordinate editing and assembly export remain available.');}}
  void boot();return ()=>{dead=true;cancelAnimationFrame(raf);observer?.disconnect();gizmo?.dispose();orbit?.dispose();cameraAction.current=null;fitAction.current=null;scene?.traverse((o:any)=>{o.geometry?.dispose();o.material?.map?.dispose();o.material?.dispose();});renderer?.dispose();renderer?.domElement?.remove();};
 },[enabled]);
 const part=history.current.parts[selected];

 function nudgeSelected(axis:number,amount:number){
  if(!part)return;
  const offset=[...part.offset] as [number,number,number];
  const value=Math.round((offset[axis]+amount)*100)/100;
  if(value<-360||value>360){setStatus('This part exceeds the supported movement range.');return;}
  offset[axis]=value;
  commit(editCADPart(history.current,selected,{...part,offset}));
  setStatus(`${cadPartName(history.current.parts,selected)} moved ${amount>0?"+":""}${amount} cm on ${["X","Y","Z"][axis]}.`);
 }
 function save(){try{localStorage.setItem('stembuild-robot-cad-v1',JSON.stringify(history.current));setStatus('Assembly saved on this device.');}catch{setStatus('Device saving unavailable. Export the assembly instead.');}}
 function load(){try{const raw=localStorage.getItem('stembuild-robot-cad-v1');if(!raw)throw Error('No assembly saved on this device.');commit(parseAssembly(JSON.parse(raw)));setStatus('Saved assembly loaded.');}catch(e){setStatus(e instanceof Error?e.message:'Cannot load this assembly.');}}
 function exportFile(){const url=URL.createObjectURL(new Blob([JSON.stringify(history.current,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='stembuild-robot-assembly.json';a.click();URL.revokeObjectURL(url);}
 return <section className="robot-cad card" id="robot-cad"><div className="eyebrow">ROBOTICS CAD · ASSEMBLY EDITOR</div><h2>Design your robot in 3D</h2><p>Start from an empty table. Add components, move and rotate them in centimetres, connect labelled terminals and check supported circuits. The robot template is optional.</p><p className="small muted" role="status">{autosaveStatus} Work is restored after restarting in this browser. Export an assembly backup to keep it if browser data is cleared.</p>
 <div className="cad-project-toolbar inline"><button className="btn" onClick={()=>{commit(defaultAssembly());setSelected(0);setStatus("Empty project ready. Add your first component from the library. Previous work can be restored with Undo.");}}>New empty project</button><button className="btn" onClick={()=>{commit(robotTemplate());setSelected(1);setStatus("Optional robot template loaded. Undo restores your previous project.");}}>Load robot template</button><button className="btn" onClick={()=>{commit(parseAssembly({version:2,code:defaultLedSketch,parts:[{kind:'uno',offset:[-6,0,0],rotation:[0,0,0],visible:true},{kind:'resistor',offset:[0,0,0],rotation:[0,0,0],visible:true},{kind:'led',offset:[4,0,0],rotation:[0,0,0],visible:true}],wires:[{from:0,fromPin:'D8',to:1,toPin:'Lead 1',color:'#297aad'},{from:1,fromPin:'Lead 2',to:2,toPin:'Anode +',color:'#168b9c'},{from:2,fromPin:'Cathode −',to:0,toPin:'GND',color:'#16334f'}]}));setSelected(0);setStatus('Working LED example loaded. Run circuit preview to test it. Undo restores your previous project.');}}>Load LED circuit example</button></div> <div className="cad-workspace-layout"><aside className="cad-library-panel"><h3>Component library</h3><label>Search components<input value={search} onChange={e=>setSearch(e.target.value)}/></label><p className="small muted">{cadLibrary.length} component types · repeatable instances · recognisable hardware models. Blink testing supports Uno + red LED + 330 Ω resistor. Other parts are design-only.</p><div className="cad-library">{cadLibrary.filter(c=>`${c.name} ${c.category}`.toLowerCase().includes(search.toLowerCase())).map(c=><button className="btn" key={c.id} disabled={history.current.parts.length>=100} onClick={()=>{const index=history.current.parts.length;commit(parseAssembly({...history.current,parts:[...history.current.parts,{kind:c.id,offset:[(index%4)*7,0,Math.floor(index/4)*7],rotation:[0,0,0],visible:true}]}));setSelected(index);}} aria-label={`Add ${c.name}`}><Image src={`/images/cad/${c.id}.webp`} alt="" width={120} height={90} unoptimized loading="lazy"/>{c.name}<small>{c.category}</small></button>)}</div><h3>Assembly tree ({history.current.parts.length}/100)</h3>{history.current.parts.map((_,i)=>{const name=cadPartName(history.current.parts,i);return<button className="btn" key={name} aria-pressed={selected===i} onClick={()=>setSelected(i)}>{name}</button>;})}<p className="small muted">Uno PCB footprint: 6.86 × 5.34 cm. Other parts represent generic kit variants. Coordinate offsets are relative to the reference mounting pose.</p></aside><div className="cad-stage-panel"><div className="inline"><button className="btn btn-primary" onClick={()=>setEnabled(v=>!v)}>{enabled?'Close CAD view':'Launch CAD workspace'}</button><button className="btn" aria-pressed={wireMode} onClick={()=>{setWireMode(v=>!v);chooseTerminal(null);}}>Wire mode</button>{['Top','Front','Side','Perspective','Selected','Fit assembly'].map(v=><button className="btn" key={v} disabled={!enabled} onClick={()=>cameraAction.current?.(v)}>{v==='Selected'?'Zoom selected':v==='Fit assembly'?v:`${v} view`}</button>)}</div>
 {enabled?<div className="robot-cad-canvas" ref={mount} aria-label="3D CAD assembly workspace"/>:<div className="cad-launch-placeholder"><strong>Your 3D workbench</strong><p>Add components on the left, launch the CAD workspace, then choose Wire mode to connect terminals.</p></div>}<p role="status">{status}</p>
<details className="cad-properties" open><summary>Selected component · position and rotation</summary>{part?<><h3>{cadPartName(history.current.parts,selected)}</h3><p className="small muted">{dimensions}</p>
 <div className="inline"><button className="btn" aria-pressed={mode==='translate'} onClick={()=>setMode('translate')}>Move</button><button className="btn" aria-pressed={mode==='rotate'} onClick={()=>setMode('rotate')}>Rotate</button><label><input type="checkbox" checked={snap} onChange={e=>setSnap(e.target.checked)}/> Grid snap: 0.5 cm / 15°</label></div>
 {(['offset','rotation'] as const).map(field=><div className="inline" key={field}>{['X','Y','Z'].map((axis,i)=><label key={axis}>{axis} {field==='offset'?'offset (cm)':'rotation (°)'}<input type="number" min="-360" max="360" step={field==='offset'?.5:15} value={part[field][i]} onChange={e=>{const n=Number(e.target.value);if(!Number.isFinite(n)||Math.abs(n)>360)return;const a=[...part[field]] as [number,number,number];a[i]=n;commit(editCADPart(history.current,selected,{...part,[field]:a}));}}/></label>)}</div>)}
 <div className="cad-nudge" role="group" aria-label="Move selected CAD part in half centimetre steps">
  <strong>Fine-position selected part</strong>
  <p className="small muted">Adjust by 0.5 cm. Every movement can be undone and is saved automatically.</p>
  <div className="cad-nudge-controls">
   {(["X","Y","Z"] as const).map((axis,i)=><div key={axis}><span>{axis} axis</span>
     <button type="button" className="btn" aria-label={`Nudge ${axis} minus 0.5 cm`} onClick={()=>nudgeSelected(i,-.5)}>− 0.5</button>
     <button type="button" className="btn" aria-label={`Nudge ${axis} plus 0.5 cm`} onClick={()=>nudgeSelected(i,.5)}>+ 0.5</button>
   </div>)}
  </div>
 </div>
 <div className="inline"><button className="btn" disabled={history.current.version!==2} onClick={()=>{commit(removeCADPart(history.current,selected));setSelected(Math.max(0,selected-1));}}>Remove selected component</button><button className="btn" onClick={()=>commit(editCADPart(history.current,selected,{...part,offset:[0,0,0],rotation:[0,0,0],visible:true}))}>Snap to reference mount</button><button className="btn" onClick={()=>commit(editCADPart(history.current,selected,{...part,visible:!part.visible}))}>{part.visible?'Hide selected part':'Show selected part'}</button></div></>:<p>Your table is empty. Choose a component from the library to start building.</p>}</details></div><aside className="cad-wiring-panel">
 <div className="cad-wire-tools"><h3>Connect cables</h3><p className="small muted">Choose a component and tap two named terminals, or turn on Wire mode to drag between terminal markers in 3D.</p><label className="cad-part-picker">Component to wire<select aria-label="CAD wiring component" value={part?selected:''} onChange={e=>setSelected(Number(e.target.value))}><option value="" disabled>Select a component</option>{history.current.parts.map((p,i)=><option key={i} value={i} disabled={!p.visible}>{cadPartName(history.current.parts,i)}</option>)}</select></label><label>Cable colour<select aria-label="CAD cable colour" value={wireColor} onChange={e=>setWireColor(e.target.value)}><option value="#297aad">Blue</option><option value="#168b9c">Teal</option><option value="#b56a21">Orange</option><option value="#16334f">Navy</option></select></label><div className="robot-pins">{cadPins(history.current.parts,selected).map(pin=><button disabled={!part?.visible} className="btn" key={pin} aria-pressed={wireStart?.index===selected&&wireStart.pin===pin} onClick={()=>connectPin(pin)}>{pin}</button>)}</div><p>{wireStart?`Wire from ${cadPartName(history.current.parts,wireStart.index)} ${wireStart.pin}`:'Choose a first terminal.'}</p><button className="btn" onClick={()=>chooseTerminal(null)}>Cancel wire</button><ul className="robot-wire-list">{(history.current.wires??[]).map((w,i)=><li key={i}>{cadPartName(history.current.parts,w.from)} {w.fromPin} → {cadPartName(history.current.parts,w.to)} {w.toPin}<button onClick={()=>commit({...history.current,wires:history.current.wires?.filter((_,n)=>n!==i)})}>Remove CAD wire {i+1}</button></li>)}</ul>
 </div><div className="cad-test card"><h3>Test your circuit</h3><p>Supported now: one Uno, one red LED and one 330 Ω resistor, wired directly in series on D8. This preview checks connections and blinks the LED; it does not execute arbitrary firmware or calculate voltage/current.</p><p role="status">{circuit.message}</p><details className="cad-code"><summary>Arduino sketch</summary><label>CAD Arduino sketch<textarea aria-label="CAD Arduino sketch" value={history.current.code??defaultLedSketch} maxLength={10000} onChange={e=>commit({...history.current,code:e.target.value})}/></label></details><div className="inline"><button className="btn" onClick={()=>{stopTest();setStatus(circuit.message);}}>Check circuit</button><button className="btn btn-primary" disabled={!circuit.ready||!active} onClick={()=>{setRunning(true);setStatus('Supported blink preview running.');}}>Run circuit preview</button><button className="btn" onClick={stopTest}>Stop circuit preview</button></div><p aria-live="polite">LED {running&&active&&ledOn?'ON':'OFF'} · {running&&active?'preview running':'preview stopped'}</p><p className="small muted">The resistor model represents 330 Ω for this test. Verify actual resistance and wiring before transferring to hardware. Changing the assembly stops the preview.</p></div>
 </aside></div><details className="cad-project-details" open><summary>Save, undo and assembly checks</summary> <div className="inline"><button className="btn" disabled={!history.past.length} onClick={()=>{stopTest();chooseTerminal(null);const next={past:history.past.slice(0,-1),current:history.past.at(-1)!,future:[history.current,...history.future]};persist(next.current);setHistory(next);}}>Undo CAD edit</button><button className="btn" disabled={!history.future.length} onClick={()=>{stopTest();chooseTerminal(null);const next={past:[...history.past,history.current],current:history.future[0],future:history.future.slice(1)};persist(next.current);setHistory(next);}}>Redo CAD edit</button><button className="btn" onClick={save}>Save assembly</button><button className="btn" onClick={load}>Load assembly</button><button className="btn" onClick={exportFile}>Export assembly</button><label className="btn">Import assembly<input type="file" accept="application/json,.json" onChange={async e=>{const f=e.target.files?.[0];if(!f)return;try{if(f.size>100000)throw Error('Assembly file is too large.');commit(parseAssembly(JSON.parse(await f.text())));setStatus('Assembly imported.');}catch(err){setStatus(err instanceof Error?err.message:'Import failed.');}e.target.value='';}}/></label></div>
<button className="btn" disabled={!enabled} onClick={()=>fitAction.current?.()}>Check electronics overlap</button><p role="status">{fit}</p><p className="small muted">Overlap checks use bounding boxes for visible parts (the legacy robot template checks its four electronics modules). Mounting holes, shafts, fasteners, cable routing and manufacturing tolerances are not validated yet. Export is a STEMBuild assembly file, not DWG or STEP.</p></details>
 </section>;
}
