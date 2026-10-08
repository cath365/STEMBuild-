"use client";
import {useEffect,useRef,useState} from 'react';
import {createRobotModels} from '@/lib/robot-models';
import {cadLibrary,createLibraryModel} from "@/lib/cad-component-library";
import {cadPartName,cadPins,cadNames,defaultAssembly,editCADPart,parseAssembly,type CADAssembly} from '@/lib/robot-cad';

export function RobotCADWorkspace({active=true}:{active?:boolean}){
 const [history,setHistory]=useState<{past:CADAssembly[];current:CADAssembly;future:CADAssembly[]}>({past:[],current:defaultAssembly(),future:[]});
 const [selectedRaw,setSelected]=useState(1),[enabled,setEnabled]=useState(false),[mode,setMode]=useState<'translate'|'rotate'>('translate');
 const selected=Math.min(selectedRaw,history.current.parts.length-1);
 const [search,setSearch]=useState(''),[wireStart,setWireStart]=useState<{index:number;pin:string}|null>(null);
 // The edits remain in React state when another workspace is selected.
 // Unmount the active WebGL renderer to avoid wasting GPU/battery on phones.
 useEffect(()=>{const timer=setTimeout(()=>{if(!active)setEnabled(false);},0);return ()=>clearTimeout(timer);},[active]);

 const [status,setStatus]=useState('Launch 3D to edit the assembly directly.'),[snap,setSnap]=useState(true);
 const mount=useRef<HTMLDivElement>(null),latest=useRef({assembly:history.current,selected,mode,snap});
 const commitRef=useRef<(a:CADAssembly)=>void>(()=>{}),selectRef=useRef(setSelected);
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

 function commit(a:CADAssembly){setHistory(h=>({past:[...h.past,h.current].slice(-50),current:a,future:[]}));}
 useEffect(()=>{latest.current={assembly:history.current,selected,mode,snap};commitRef.current=commit;selectRef.current=setSelected;},[history,selected,mode,snap]);
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
   orbit=new O.OrbitControls(camera,renderer.domElement);orbit.target.set(0,6,0);orbit.enableDamping=true;orbit.minDistance=10;orbit.maxDistance=160;
   scene.add(new T.HemisphereLight(0xffffff,0x687c91,3));scene.add(new T.GridHelper(60,60,0x718ca3,0xbdccd8));scene.add(new T.AxesHelper(18));
   const car=new T.Group();scene.add(car);const objects=createRobotModels(T,car);const bases=objects.map(o=>o.position.clone());const wireGroup=new T.Group();scene.add(wireGroup);let wireKey="";
   function dispose(o:any){o.traverse((m:any)=>{m.geometry?.dispose();m.material?.map?.dispose();m.material?.dispose();});}
   gizmo=new C.TransformControls(camera,renderer.domElement);gizmo.setSpace('world');scene.add(gizmo.getHelper());
   gizmo.addEventListener('dragging-changed',(e:any)=>{dragging=e.value;orbit.enabled=!e.value;});
   gizmo.addEventListener('mouseUp',()=>{const l=latest.current,o=objects[l.selected];const part={...l.assembly.parts[l.selected],offset:[o.position.x-bases[l.selected].x,o.position.y-bases[l.selected].y,o.position.z-bases[l.selected].z] as [number,number,number],rotation:[o.rotation.x*180/Math.PI,o.rotation.y*180/Math.PI,o.rotation.z*180/Math.PI] as [number,number,number]};try{commitRef.current(editCADPart(l.assembly,l.selected,part));}catch{setStatus('Move exceeds the supported assembly range.');}});
   const ray=new T.Raycaster();
   renderer.domElement.addEventListener('pointerdown',(e:PointerEvent)=>{down={x:e.clientX,y:e.clientY};});
   renderer.domElement.addEventListener('pointerup',(e:PointerEvent)=>{if(!down||Math.hypot(e.clientX-down.x,e.clientY-down.y)>4||gizmo.axis)return;const r=renderer.domElement.getBoundingClientRect();ray.setFromCamera(new T.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),camera);const hits=ray.intersectObjects(objects,true).filter((h:any)=>h.object.isMesh);for(const h of hits){let p=h.object;while(p&&p.parent!==car)p=p.parent;const i=objects.indexOf(p);if(i>=0&&objects[i].visible){selectRef.current(i);break;}}down=null;});
   cameraAction.current=(view)=>{camera.up.set(0,1,0);if(view==='Top'){camera.position.set(0,65,0);camera.up.set(0,0,-1);}else if(view==='Front')camera.position.set(0,8,65);else if(view==='Side')camera.position.set(65,8,0);else camera.position.set(35,35,45);orbit.target.set(0,6,0);orbit.update();};
   fitAction.current=()=>{scene.updateMatrixWorld(true);const boxes=objects.map((o:any)=>{const b=new T.Box3();o.traverse((m:any)=>{if(m.isMesh){m.geometry.computeBoundingBox();b.union(m.geometry.boundingBox.clone().applyMatrix4(m.matrixWorld));}});return b;});const pairs:string[]=[];for(const i of [1,2,3,4])for(const j of [1,2,3,4])if(j>i&&objects[i].visible&&objects[j].visible&&boxes[i].intersectsBox(boxes[j]))pairs.push(`${cadNames[i]} / ${cadNames[j]}`);setFit(pairs.length?`Possible electronics overlap: ${pairs.join('; ')}`:'No electronics bounding-box overlaps detected.');};
   function resize(){if(!mount.current)return;const r=mount.current.getBoundingClientRect();renderer.setSize(r.width,r.height);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();}observer=new ResizeObserver(resize);observer.observe(mount.current);resize();setStatus('3D assembly ready. Select a part and drag an axis handle.');
   let dimensionKey='';
   function draw(){if(dead)return;const l=latest.current;
    for(let i=7;i<Math.max(objects.length,l.assembly.parts.length);i++){const kind=l.assembly.parts[i]?.kind;if(objects[i]?.userData.catalogKind!==kind){if(objects[i]){car.remove(objects[i]);dispose(objects[i]);}if(kind){const o=createLibraryModel(T,kind);o.userData.catalogKind=kind;car.add(o);objects[i]=o;bases[i]=new T.Vector3();}}}objects.length=l.assembly.parts.length;bases.length=l.assembly.parts.length;
    objects.forEach((o:any,i:number)=>{const p=l.assembly.parts[i];o.visible=p.visible;if(!(dragging&&i===l.selected)){o.position.copy(bases[i]).add(new T.Vector3(...p.offset));o.rotation.set(...p.rotation.map(n=>n*Math.PI/180));}});
    if(objects[l.selected].visible){if(gizmo.object!==objects[l.selected])gizmo.attach(objects[l.selected]);}else gizmo.detach();gizmo.setMode(l.mode);gizmo.setTranslationSnap(l.snap?.5:null);gizmo.setRotationSnap(l.snap?Math.PI/12:null);
    const wk=JSON.stringify([l.assembly.parts,l.assembly.wires]);if(wk!==wireKey&&!dragging){for(const o of [...wireGroup.children]){wireGroup.remove(o);dispose(o);}car.updateMatrixWorld(true);for(const w of l.assembly.wires??[]){if(!objects[w.from].visible||!objects[w.to].visible)continue;const a=objects[w.from].getWorldPosition(new T.Vector3()),b=objects[w.to].getWorldPosition(new T.Vector3());a.y+=1;b.y+=1;const mid=a.clone().add(b).multiplyScalar(.5);mid.y+=3;const curve=new T.QuadraticBezierCurve3(a,mid,b);wireGroup.add(new T.Mesh(new T.TubeGeometry(curve,16,.06,5,false),new T.MeshStandardMaterial({color:w.color})));}wireKey=wk;}
    const dk=JSON.stringify([l.selected,l.assembly.parts[l.selected]]);if(dk!==dimensionKey&&!dragging){scene.updateMatrixWorld(true);const bounds=new T.Box3();objects[l.selected].traverse((m:any)=>{if(m.isMesh){m.geometry.computeBoundingBox();bounds.union(m.geometry.boundingBox.clone().applyMatrix4(m.matrixWorld));}});const size=bounds.getSize(new T.Vector3());setDimensions(`Rendered bounds: ${size.x.toFixed(2)} × ${size.y.toFixed(2)} × ${size.z.toFixed(2)} cm (X × Y × Z).`);dimensionKey=dk;}
    renderer.domElement.dataset.cadPosition=JSON.stringify(objects[l.selected].position.toArray());renderer.domElement.dataset.cadSelection=cadPartName(l.assembly.parts,l.selected);renderer.domElement.dataset.cadOffset=JSON.stringify(l.assembly.parts[l.selected].offset);orbit.update();renderer.render(scene,camera);raf=requestAnimationFrame(draw);
   }draw();
  }catch{if(!dead)setStatus('3D could not load. Coordinate editing and assembly export remain available.');}}
  void boot();return ()=>{dead=true;cancelAnimationFrame(raf);observer?.disconnect();gizmo?.dispose();orbit?.dispose();cameraAction.current=null;fitAction.current=null;scene?.traverse((o:any)=>{o.geometry?.dispose();o.material?.map?.dispose();o.material?.dispose();});renderer?.dispose();renderer?.domElement?.remove();};
 },[enabled]);
 const part=history.current.parts[selected];
 function connectPin(pin:string){if(wireStart&&!history.current.parts[wireStart.index]){setWireStart(null);setStatus("Choose a new wire endpoint after undoing a component addition.");return;}if(!wireStart){setWireStart({index:selected,pin});return;}if(wireStart.index===selected&&wireStart.pin===pin){setWireStart(null);return;}const ws=history.current.wires??[];if(ws.length>=300){setStatus('This assembly supports up to 300 wires.');return;}if(!ws.some(w=>(w.from===wireStart.index&&w.fromPin===wireStart.pin&&w.to===selected&&w.toPin===pin)||(w.to===wireStart.index&&w.toPin===wireStart.pin&&w.from===selected&&w.fromPin===pin)))commit(parseAssembly({...history.current,wires:[...ws,{from:wireStart.index,fromPin:wireStart.pin,to:selected,toPin:pin,color:'#297aad'}]}));setWireStart(null);}

 function nudgeSelected(axis:number,amount:number){
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
 return <section className="robot-cad card" id="robot-cad"><div className="eyebrow">ROBOTICS CAD · ASSEMBLY EDITOR</div><h2>Design your robot in 3D</h2><p>Move and rotate kit components in centimetres. This editor changes the mechanical layout; the obstacle arena remains a separate control test.</p><p className="small muted" role="status">{autosaveStatus} Work is restored after restarting in this browser. Export an assembly backup to keep it if browser data is cleared.</p>
 <div className="inline"><button className="btn btn-primary" onClick={()=>setEnabled(v=>!v)}>{enabled?'Close CAD view':'Launch CAD workspace'}</button>{['Top','Front','Side','Perspective'].map(v=><button className="btn" key={v} disabled={!enabled} onClick={()=>cameraAction.current?.(v)}>{v} view</button>)}</div>
 {enabled?<div className="robot-cad-canvas" ref={mount} aria-label="3D CAD assembly workspace"/>:null}<p role="status">{status}</p>
 <div className="robot-cad-grid"><div><h3>Component library</h3><label>Search components<input value={search} onChange={e=>setSearch(e.target.value)}/></label><p className="small muted">22 component types · repeatable instances · layout models. New library parts are not electrically simulated.</p><div className="cad-library">{cadLibrary.filter(c=>`${c.name} ${c.category}`.toLowerCase().includes(search.toLowerCase())).map(c=><button className="btn" key={c.id} disabled={history.current.parts.length>=100} onClick={()=>{const index=history.current.parts.length;commit(parseAssembly({...history.current,parts:[...history.current.parts,{kind:c.id,offset:[12+(index-7)%3*6,0,Math.floor((index-7)/3)*7],rotation:[0,0,0],visible:true}]}));setSelected(index);}} aria-label={`Add ${c.name}`}>{c.name}<small>{c.category}</small></button>)}</div><h3>Assembly tree ({history.current.parts.length}/100)</h3>{history.current.parts.map((_,i)=>{const name=cadPartName(history.current.parts,i);return<button className="btn" key={name} aria-pressed={selected===i} onClick={()=>setSelected(i)}>{name}</button>;})}<p className="small muted">Uno PCB footprint: 6.86 × 5.34 cm. Other parts represent generic kit variants. Coordinate offsets are relative to the reference mounting pose.</p></div><div><h3>{cadPartName(history.current.parts,selected)}</h3><p className="small muted">{dimensions}</p>
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
 <div className="inline"><button className="btn" onClick={()=>commit(editCADPart(history.current,selected,{...part,offset:[0,0,0],rotation:[0,0,0],visible:true}))}>Snap to reference mount</button><button className="btn" onClick={()=>commit(editCADPart(history.current,selected,{...part,visible:!part.visible}))}>{part.visible?'Hide selected part':'Show selected part'}</button></div></div></div>
 <h3>Assembly wires</h3><p className="small muted">Select a pin, choose another component in the assembly tree, then select its pin. Routes connect model origins; pin labels identify the endpoints. These layout wires are not electrical validation.</p><div className="robot-pins">{cadPins(history.current.parts,selected).map(pin=><button className="btn" key={pin} aria-pressed={wireStart?.index===selected&&wireStart.pin===pin} onClick={()=>connectPin(pin)}>{pin}</button>)}</div><p>{wireStart?`Wire from ${cadPartName(history.current.parts,wireStart.index)} ${wireStart.pin}`:'Choose a first terminal.'}</p><button className="btn" onClick={()=>setWireStart(null)}>Cancel wire</button><ul className="robot-wire-list">{(history.current.wires??[]).map((w,i)=><li key={i}>{cadPartName(history.current.parts,w.from)} {w.fromPin} → {cadPartName(history.current.parts,w.to)} {w.toPin}<button onClick={()=>commit({...history.current,wires:history.current.wires?.filter((_,n)=>n!==i)})}>Remove CAD wire {i+1}</button></li>)}</ul>
 <div className="inline"><button className="btn" disabled={!history.past.length} onClick={()=>setHistory(h=>({past:h.past.slice(0,-1),current:h.past.at(-1)!,future:[h.current,...h.future]}))}>Undo CAD edit</button><button className="btn" disabled={!history.future.length} onClick={()=>setHistory(h=>({past:[...h.past,h.current],current:h.future[0],future:h.future.slice(1)}))}>Redo CAD edit</button><button className="btn" onClick={save}>Save assembly</button><button className="btn" onClick={load}>Load assembly</button><button className="btn" onClick={exportFile}>Export assembly</button><label className="btn">Import assembly<input type="file" accept="application/json,.json" onChange={async e=>{const f=e.target.files?.[0];if(!f)return;try{if(f.size>100000)throw Error('Assembly file is too large.');commit(parseAssembly(JSON.parse(await f.text())));setStatus('Assembly imported.');}catch(err){setStatus(err instanceof Error?err.message:'Import failed.');}e.target.value='';}}/></label></div>
 <button className="btn" disabled={!enabled} onClick={()=>fitAction.current?.()}>Check electronics overlap</button><p role="status">{fit}</p><p className="small muted">Overlap checks use bounding boxes for the Uno, driver, battery holder and sensor. Mounting holes, shafts, fasteners, cable routing and manufacturing tolerances are not validated yet. Export is a STEMBuild assembly file, not DWG or STEP.</p>
 </section>;
}
