"use client";
import {RobotBuilder} from '@/components/robot-builder';
import {createRobotModels} from '@/lib/robot-models';
import {useEffect,useRef,useState} from 'react';
import {collides,initialRobot,robotParts,robotSketch,stepRobot,type Obstacle} from '@/lib/robot-arena';

export function RobotArena({active=true}:{active?:boolean}){
 const [parts,setParts]=useState<string[]>([]),[wiringReady,setWiringReady]=useState(false);
 const [blocks,setBlocks]=useState<Obstacle[]>([{id:1,x:0,z:0,size:22}]);
 const [running,setRunning]=useState(false),[threshold,setThreshold]=useState(25);
 const [robot,setRobot]=useState(initialRobot),[view,setView]=useState('Top view · low-data mode');
 const [show3D,setShow3D]=useState(false),[blockX,setBlockX]=useState(40),[blockZ,setBlockZ]=useState(-30);
 const [message,setMessage]=useState('Assemble the robot, review its wiring, then start the arena.');
 const inspect=useRef<(()=>void)|null>(null);
 const mount=useRef<HTMLDivElement>(null),latest=useRef({robot,blocks,parts});
 // Preserve mounted assembly, but stop movement and free 3D resources while hidden.
 useEffect(()=>{if(!active){setRunning(false);setShow3D(false);}},[active]);
 useEffect(()=>{latest.current={robot,blocks,parts};},[robot,blocks,parts]);
 const ready=parts.length===robotParts.length&&wiringReady;
 useEffect(()=>{
  if(!running)return;
  let raf=0,last=0;
  function frame(t:number){if(last){const dt=(t-last)/1000;setRobot(s=>stepRobot(s,blocks,dt,threshold));}last=t;raf=requestAnimationFrame(frame);}
  raf=requestAnimationFrame(frame);return ()=>cancelAnimationFrame(raf);
 },[running,blocks,threshold]);
 useEffect(()=>{
  if(!show3D)return;
  let dead=false,raf=0,renderer:any,controls:any,scene:any,observer:ResizeObserver|undefined;
  const objects:any[]=[];
  async function boot(){try{
   const imp=new Function('url','return import(url)') as (url:string)=>Promise<any>;
   const [T,O]=await Promise.all([imp('https://esm.sh/three@0.180.0'),imp('https://esm.sh/three@0.180.0/examples/jsm/controls/OrbitControls.js')]);
   if(dead||!mount.current)return;
   scene=new T.Scene();scene.background=new T.Color(0xf0f4f8);
   renderer=new T.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));mount.current.replaceChildren(renderer.domElement);
   const camera=new T.PerspectiveCamera(45,1,.1,1000);camera.position.set(160,240,230);
   controls=new O.OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.minDistance=20;controls.maxDistance=450;
   inspect.current=()=>{const r=latest.current.robot;camera.position.set(r.x+28,32,r.z+38);controls.target.set(r.x,7,r.z);controls.update();};
   scene.add(new T.HemisphereLight(0xffffff,0x64748b,3));
   function box(w:number,h:number,d:number,color:number,x=0,y=0,z=0,parent=scene){const m=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshStandardMaterial({color}));m.position.set(x,y,z);parent.add(m);return m;}
   box(200,1,200,0xe1e8ef,0,-1,0);scene.add(new T.GridHelper(200,20,0x8ca2b8,0xc4d1dd));
   for(const [w,d,x,z] of [[204,3,0,-102],[204,3,0,102],[3,200,-102,0],[3,200,102,0]])box(w,10,d,0x7c8fa3,x,4,z);
   const car=new T.Group();scene.add(car);
   objects.push(...createRobotModels(T,car));
   const blockGroup=new T.Group();scene.add(blockGroup);let key='';
   function resize(){if(!mount.current)return;const {width,height}=mount.current.getBoundingClientRect();renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();}
   observer=new ResizeObserver(resize);observer.observe(mount.current);resize();setView('3D arena');
   function draw(){if(dead)return;const s=latest.current;car.position.set(s.robot.x,0,s.robot.z);car.rotation.y=s.robot.heading;
    const indices=[1,0,4,6,5,3,2];objects.forEach((o,i)=>o.visible=s.parts.includes(robotParts[indices[i]]));renderer.domElement.dataset.robotPosition=JSON.stringify([s.robot.x,s.robot.z]);
    const next=JSON.stringify(s.blocks);if(next!==key){for(const m of [...blockGroup.children]){blockGroup.remove(m);m.geometry.dispose();m.material.dispose();}for(const b of s.blocks)box(b.size,18,b.size,0xda7650,b.x,9,b.z,blockGroup);key=next;}
    controls.update();renderer.render(scene,camera);raf=requestAnimationFrame(draw);
   }draw();
  }catch{if(!dead)setView('Top view · 3D unavailable on this device');}}
  void boot();return ()=>{dead=true;inspect.current=null;cancelAnimationFrame(raf);observer?.disconnect();controls?.dispose();scene?.traverse((o:any)=>{o.geometry?.dispose();o.material?.map?.dispose();o.material?.dispose();});renderer?.dispose();renderer?.domElement?.remove();};
 },[show3D]);
 function addBlock(x:number,z:number){if(running)return;if(!Number.isFinite(x)||!Number.isFinite(z)){setMessage('Enter valid block coordinates.');return;}if(blocks.length>=20){setMessage('Maximum 20 obstacles. Remove one to add another.');return;}x=Math.max(-78,Math.min(78,x));z=Math.max(-78,Math.min(78,z));if(blocks.some(b=>Math.abs(b.x-x)<23&&Math.abs(b.z-z)<23)){setMessage('Choose a clear position for the new block.');return;}if(collides(robot.x,robot.z,[{id:0,x,z,size:22}])){setMessage('Keep blocks clear of the robot.');return;}setBlocks(b=>[...b,{id:Date.now(),x,z,size:22}]);}
 function download(){const url=URL.createObjectURL(new Blob([robotSketch(threshold)],{type:'text/plain'}));const a=document.createElement('a');a.href=url;a.download='stembuild-obstacle-robot.ino';a.click();URL.revokeObjectURL(url);}
 return <section className="robot-lab" id="robot-arena">
  <div className="eyebrow">ROBOTICS · BUILD AND TEST</div><h2>Obstacle-avoiding robot</h2>
  <p>Assemble a two-wheel Uno robot and add blocks to its test arena. This model tests the generated avoidance logic; arbitrary Arduino code execution and motor electronics are not connected to this arena yet.</p>
  <div className="robot-lab-grid"><aside className="card"><RobotBuilder disabled={running} onChange={(assembled,wired)=>{setParts(assembled);setWiringReady(wired);}}/></aside>
  <div><button className="btn" onClick={()=>{setShow3D(s=>!s);setView(show3D?"Top view · low-data mode":"Loading 3D…");}}>{show3D?"Close robot 3D":"Launch robot 3D"}</button>{show3D?<button className="btn" onClick={()=>inspect.current?.()}>Inspect robot parts</button>:null}{show3D?<div className="robot-view" ref={mount} aria-label="3D robot arena"/>:null}<p className="small muted">{view} · orbit and zoom in 3D. Place obstacles using the top view below.</p>
  <svg className="robot-map" viewBox="-100 -100 200 200" role="img" aria-label="Robot top view: click to place an obstacle" onClick={e=>{const r=e.currentTarget.getBoundingClientRect();addBlock((e.clientX-r.left)/r.width*200-100,(e.clientY-r.top)/r.height*200-100);}}>
   <rect x="-99" y="-99" width="198" height="198" fill="#edf2f7" stroke="#64748b"/>{blocks.map(b=><rect key={b.id} x={b.x-b.size/2} y={b.z-b.size/2} width={b.size} height={b.size} fill="#da7650"/>)}
   <g transform={`translate(${robot.x} ${robot.z}) rotate(${-robot.heading*180/Math.PI})`}><rect x="-8" y="-12" width="16" height="24" rx="3" fill="#167b91"/><path d={`M0 12V${Math.min(robot.distance+10,75)}`} stroke="#177c55" strokeWidth="2" strokeDasharray="3 2"/></g>
  </svg>
  <div className="inline"><label>Block X (cm)<input type="number" min="-78" max="78" value={blockX} disabled={running} onChange={e=>setBlockX(Number(e.target.value))}/></label><label>Block Z (cm)<input type="number" min="-78" max="78" value={blockZ} disabled={running} onChange={e=>setBlockZ(Number(e.target.value))}/></label></div>
  <div className="inline"><button className="btn" disabled={running} onClick={()=>addBlock(blockX,blockZ)}>Add block</button><button className="btn" disabled={running||!blocks.length} onClick={()=>setBlocks(b=>b.slice(0,-1))}>Remove last block</button><button className="btn" disabled={running} onClick={()=>setBlocks([])}>Clear blocks</button></div>
  <p role="status">{message}</p><p><strong>{robot.action}</strong> · sensor {robot.distance.toFixed(0)} cm · {blocks.length}/20 obstacles</p>
  <label>Avoidance distance: {threshold} cm<input type="range" min="15" max="50" value={threshold} disabled={running} onChange={e=>setThreshold(Number(e.target.value))}/></label>
  <div className="inline"><button className="btn btn-primary" disabled={!ready||running} onClick={()=>{setRunning(true);setMessage('Robot running. Stop to edit the arena.');}}>Start robot</button><button className="btn" onClick={()=>setRunning(false)}>Stop robot</button><button className="btn" onClick={()=>{setRunning(false);setRobot(initialRobot);setBlocks(b=>b.filter(block=>!collides(initialRobot.x,initialRobot.z,[block])));setMessage('Robot reset. Any block covering its starting position was removed.');}}>Reset robot</button></div>
  <h3>3. Take the program to your Uno</h3><p className="small muted">Changing avoidance distance updates both this preview and the exported sketch. The arena simplifies speed, traction and ultrasonic sensing; test the physical robot separately.</p><button className="btn" onClick={download}>Download robot .ino</button><details><summary>View generated Arduino code</summary><pre className="robot-code">{robotSketch(threshold)}</pre></details>
  </div></div>
 </section>;
}
