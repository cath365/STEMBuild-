"use client";
/* eslint-disable react-hooks/immutability -- Three.js objects are imperative scene resources owned by refs, not React state. */

import { useEffect, useRef, useState } from "react";
import type { Lab3DProject } from "@/lib/lab3d";

type Props = {
  project: Lab3DProject;
  placed: string[];
  connected: string[];
  ledOn: boolean;
  pendingTerminal: string | null;
  onTerminalSelect: (terminalId: string) => void;
  onUseLightweight: () => void;
};

type RemoteModule = Record<string, any>;

function remoteImport(url: string): Promise<RemoteModule> {
  const importer = new Function("url", "return import(url)") as (url: string) => Promise<RemoteModule>;
  return importer(url);
}

const THREE_URL = "https://esm.sh/three@0.180.0";
const GLTF_URL = "https://esm.sh/three@0.180.0/examples/jsm/loaders/GLTFLoader.js";
const ORBIT_URL = "https://esm.sh/three@0.180.0/examples/jsm/controls/OrbitControls.js";

const MODEL_LAYOUT: Record<string, { path?: string; position: [number, number, number]; scale?: number }> = {
  arduino: { path:"/models/arduino-uno-r3.gltf", position:[-46, 1.5, 0], scale:0.82 },
  breadboard: { path:"/models/breadboard-830.gltf", position:[36, 3.8, 0], scale:0.78 },
  resistor: { position:[25, 10, 0] },
  led: { position:[51, 9, -6] },
  button: { position:[15, 9, -15] },
};

const TERMINAL_POINTS: Record<string, [number, number, number]> = {
  "uno-d8":[-38, 9, -17],
  "uno-d2":[-47, 9, -17],
  "uno-gnd":[-29, 9, 19],
  "r-in":[18, 13, 0],
  "r-out":[32, 13, 0],
  "led-a":[48, 13, -6],
  "led-k":[54, 13, -6],
  "button-sig":[10, 13, -15],
  "button-gnd":[20, 13, -15],
};

function disposeObject(object: any) {
  object?.traverse?.((child: any) => {
    child.geometry?.dispose?.();
    if (Array.isArray(child.material)) child.material.forEach((material: any) => material.dispose?.());
    else child.material?.dispose?.();
  });
}

export function Stem3DWebGLWorkbench({
  project,
  placed,
  connected,
  ledOn,
  pendingTerminal,
  onTerminalSelect,
  onUseLightweight,
}: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const callbackRef = useRef(onTerminalSelect);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const sceneState = useRef<{
    THREE: any;
    scene: any;
    camera: any;
    renderer: any;
    controls: any;
    partGroup: any;
    wireGroup: any;
    terminalGroup: any;
    partObjects: Map<string, any>;
    terminalObjects: Map<string, any>;
    ledMaterial: any;
    raf: number;
    resize?: ResizeObserver;
    pointerHandler?: (event: PointerEvent) => void;
  } | null>(null);

  useEffect(() => { callbackRef.current = onTerminalSelect; }, [onTerminalSelect]);

  useEffect(() => {
    let cancelled = false;

    function cleanupScene() {
      const state = sceneState.current;
      if (!state) return;
      cancelAnimationFrame(state.raf);
      state.resize?.disconnect();
      if (state.pointerHandler) state.renderer.domElement.removeEventListener("pointerdown", state.pointerHandler);
      state.controls?.dispose?.();
      disposeObject(state.scene);
      state.renderer?.dispose?.();
      state.renderer?.domElement?.remove?.();
      sceneState.current = null;
    }

    async function boot() {
      try {
        setStatus("loading");
        const [THREE, gltfModule, orbitModule] = await Promise.all([
          remoteImport(THREE_URL),
          remoteImport(GLTF_URL),
          remoteImport(ORBIT_URL),
        ]);
        if (cancelled || !mountRef.current) return;

        const mount = mountRef.current;
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf1f5f8);

        const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 1000);
        camera.position.set(0, 125, 155);

        const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:false });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
        renderer.shadowMap.enabled = true;
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        mount.replaceChildren(renderer.domElement);

        const controls = new orbitModule.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.target.set(0, 4, 0);
        controls.minDistance = 80;
        controls.maxDistance = 260;
        controls.maxPolarAngle = Math.PI * 0.49;

        scene.add(new THREE.HemisphereLight(0xffffff, 0x607080, 2.0));
        const key = new THREE.DirectionalLight(0xffffff, 2.6);
        key.position.set(-70, 140, 90);
        key.castShadow = true;
        scene.add(key);

        const floor = new THREE.Mesh(
          new THREE.PlaneGeometry(210, 135),
          new THREE.MeshStandardMaterial({ color:0xe8eef2, roughness:0.9, metalness:0 }),
        );
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        floor.position.y = -0.5;
        scene.add(floor);

        const grid = new THREE.GridHelper(200, 20, 0xa8bac8, 0xd2dde5);
        grid.position.y = 0.05;
        scene.add(grid);

        const partGroup = new THREE.Group();
        const wireGroup = new THREE.Group();
        const terminalGroup = new THREE.Group();
        scene.add(partGroup, wireGroup, terminalGroup);

        const loader = new gltfModule.GLTFLoader();
        const partObjects = new Map<string, any>();
        const terminalObjects = new Map<string, any>();
        // Own resources before awaiting models so closing a loading view releases them.
        const state = {THREE, scene, camera, renderer, controls, partGroup, wireGroup, terminalGroup, partObjects, terminalObjects, ledMaterial:null as any, raf:0, resize:undefined as ResizeObserver | undefined, pointerHandler:undefined as ((event:PointerEvent)=>void) | undefined};
        sceneState.current = state;
        let ledMaterial: any = null;

        function createResistor() {
          const group = new THREE.Group();
          const bodyMaterial = new THREE.MeshStandardMaterial({color:0xd3b780,roughness:.65});
          const metal = new THREE.MeshStandardMaterial({color:0xaaaaaa,metalness:.55,roughness:.35});
          const body = new THREE.Mesh(new THREE.CylinderGeometry(1.15,1.15,6.3,24), bodyMaterial);
          body.rotation.z = Math.PI/2;
          group.add(body);
          for (const x of [-8.6,8.6]) {
            const lead = new THREE.Mesh(new THREE.CylinderGeometry(.25,.25,11,12),metal);
            lead.rotation.z=Math.PI/2; lead.position.x=x; group.add(lead);
          }
          const colors=[0xff8c00,0xff8c00,0x783c14,0xd2aa00];
          [-1.8,-.6,.6,2].forEach((x,index)=>{
            const band=new THREE.Mesh(new THREE.CylinderGeometry(1.2,1.2,.45,24),new THREE.MeshStandardMaterial({color:colors[index]}));
            band.rotation.z=Math.PI/2; band.position.x=x; group.add(band);
          });
          return group;
        }

        function createLed() {
          const group = new THREE.Group();
          ledMaterial = new THREE.MeshStandardMaterial({
            color:0xbb2020, transparent:true, opacity:.88, roughness:.25,
            emissive:0x220000, emissiveIntensity:.3,
          });
          const body = new THREE.Mesh(new THREE.CylinderGeometry(2.5,2.5,5,28),ledMaterial);
          body.position.y=2.5;
          const dome = new THREE.Mesh(new THREE.SphereGeometry(2.5,28,16,0,Math.PI*2,0,Math.PI/2),ledMaterial);
          dome.position.y=5;
          const metal=new THREE.MeshStandardMaterial({color:0xaaaaaa,metalness:.65});
          const a=new THREE.Mesh(new THREE.CylinderGeometry(.3,.3,18,10),metal); a.position.set(-.9,-9,0);
          const k=new THREE.Mesh(new THREE.CylinderGeometry(.3,.3,14,10),metal); k.position.set(.9,-7,0);
          group.add(body,dome,a,k);
          return group;
        }

        function createButton() {
          const group = new THREE.Group();
          const base=new THREE.Mesh(new THREE.BoxGeometry(6,3.5,6),new THREE.MeshStandardMaterial({color:0x303030}));
          base.position.y=1.75;
          const cap=new THREE.Mesh(new THREE.CylinderGeometry(1.6,1.6,2.5,20),new THREE.MeshStandardMaterial({color:0xbebebe,metalness:.25}));
          cap.position.y=4.7;
          group.add(base,cap);
          return group;
        }

        for (const part of project.parts) {
          const layout = MODEL_LAYOUT[part.id];
          if (!layout) continue;
          let object: any;
          if (layout.path) {
            const gltf = await loader.loadAsync(layout.path);
            object = gltf.scene;
            if (cancelled) { disposeObject(object); return; }
            // Trimesh exports our models with Z as physical up; convert to Three's Y-up.
            object.rotation.x = -Math.PI/2;
            object.scale.setScalar(layout.scale ?? 1);
          } else if (part.id === "resistor") object = createResistor();
          else if (part.id === "led") object = createLed();
          else if (part.id === "button") object = createButton();
          else object = new THREE.Mesh(new THREE.BoxGeometry(10,5,10),new THREE.MeshStandardMaterial({color:0x8899aa}));

          object.position.set(...layout.position);
          object.visible = false;
          object.name = part.id;
          object.traverse?.((child:any)=>{ if (child.isMesh) { child.castShadow=true; child.receiveShadow=true; } });
          partGroup.add(object);
          partObjects.set(part.id,object);
        }

        state.ledMaterial = ledMaterial;
        for (const terminal of project.terminals) {
          const point = TERMINAL_POINTS[terminal.id];
          if (!point) continue;
          const material = new THREE.MeshStandardMaterial({color:0x0b6bdc,emissive:0x001a3d,emissiveIntensity:.8});
          const sphere = new THREE.Mesh(new THREE.SphereGeometry(2.2,18,14),material);
          sphere.position.set(...point);
          sphere.userData.terminalId=terminal.id;
          sphere.userData.partId=terminal.partId;
          sphere.visible=false;
          terminalGroup.add(sphere);
          terminalObjects.set(terminal.id,sphere);
        }

        const raycaster=new THREE.Raycaster();
        const pointer=new THREE.Vector2();
        const pointerHandler=(event:PointerEvent)=>{
          const rect=renderer.domElement.getBoundingClientRect();
          pointer.x=((event.clientX-rect.left)/rect.width)*2-1;
          pointer.y=-((event.clientY-rect.top)/rect.height)*2+1;
          raycaster.setFromCamera(pointer,camera);
          const hit=raycaster.intersectObjects([...terminalObjects.values()].filter((item:any)=>item.visible),false)[0];
          if(hit?.object?.userData?.terminalId) callbackRef.current(hit.object.userData.terminalId);
        };
        renderer.domElement.addEventListener("pointerdown",pointerHandler);
        state.pointerHandler = pointerHandler;

        const resize = new ResizeObserver(()=>{
          const width=Math.max(1,mount.clientWidth);
          const height=Math.max(340,mount.clientHeight);
          camera.aspect=width/height;
          camera.updateProjectionMatrix();
          renderer.setSize(width,height,false);
        });
        resize.observe(mount);
        state.resize = resize;

        const animate=()=>{
          if (cancelled) return;
          controls.update();
          renderer.render(scene,camera);
          state.raf=requestAnimationFrame(animate);
        };
        animate();
        setStatus("ready");
      } catch (cause) {
        if (!cancelled) {
          cleanupScene();
          setStatus("error");
          setError(cause instanceof Error ? cause.message : String(cause));
        }
      }
    }
    boot();

    return ()=>{
      cancelled=true;
      cleanupScene();
    };
  }, [project]);

  useEffect(()=>{
    const state=sceneState.current;
    if(!state)return;
    for(const [id,object] of state.partObjects) object.visible=placed.includes(id);
    for(const [,sphere] of state.terminalObjects) sphere.visible=placed.includes(sphere.userData.partId);
  },[placed,status]);

  useEffect(()=>{
    const state=sceneState.current;
    if(!state)return;
    const {THREE,wireGroup}=state;
    while(wireGroup.children.length){
      const child=wireGroup.children[0];
      wireGroup.remove(child);
      disposeObject(child);
    }
    for(const wire of project.connections){
      if(!connected.includes(wire.id))continue;
      const a=TERMINAL_POINTS[wire.fromTerminal];
      const b=TERMINAL_POINTS[wire.toTerminal];
      if(!a||!b)continue;
      const start=new THREE.Vector3(...a);
      const end=new THREE.Vector3(...b);
      const mid=start.clone().lerp(end,.5); mid.y+=18;
      const curve=new THREE.CatmullRomCurve3([start,mid,end]);
      const geometry=new THREE.TubeGeometry(curve,32,.65,8,false);
      const color=wire.wireClass==="wire-red"?0xe44444:wire.wireClass==="wire-black"?0x252a2e:wire.wireClass==="wire-green"?0x2f9b60:0x2979ff;
      const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color,roughness:.55}));
      wireGroup.add(mesh);
    }
  },[connected,project,status]);

  useEffect(()=>{
    const material=sceneState.current?.ledMaterial;
    if(!material)return;
    material.emissive?.setHex?.(ledOn?0xff1515:0x220000);
    material.emissiveIntensity=ledOn?3.2:.25;
    material.color?.setHex?.(ledOn?0xff3030:0xbb2020);
  },[ledOn,status]);

  useEffect(()=>{
    const state=sceneState.current;
    if(!state)return;
    for(const [id,sphere] of state.terminalObjects){
      const selected=id===pendingTerminal;
      sphere.material.color.setHex(selected?0x00a7ff:0x0b6bdc);
      sphere.material.emissive.setHex(selected?0x0063a3:0x001a3d);
      sphere.scale.setScalar(selected?1.45:1);
    }
  },[pendingTerminal,status]);

  return <div className="lab3d-webgl-shell">
    <div className="lab3d-webgl-head">
      <div><span className="badge badge-green">TRUE WEBGL</span><strong>Dimensioned 3D workbench</strong></div>
      <span className="small muted">Drag to orbit · pinch/scroll to zoom · tap blue pin nodes to wire</span>
    </div>
    <div className="lab3d-webgl-canvas" aria-label="3D component scene">
      <div className="lab3d-renderer-mount" ref={mountRef} />
      {status==="loading"?<div className="lab3d-webgl-overlay">Loading WebGL engine and CAD models…</div>:null}
      {status==="error"?<div className="lab3d-webgl-overlay error"><strong>WebGL mode could not load.</strong><span>{error}</span><span>Your assembly and code are kept. Continue in the lightweight view.</span><button type="button" className="btn" onClick={onUseLightweight}>Return to lightweight view</button></div>:null}
    </div>
    {status === "ready" ? <div className="inline">
      <button type="button" className="btn" onClick={()=>{const state=sceneState.current;if(state){state.camera.position.set(0,125,155);state.controls.target.set(0,4,0);state.controls.update();}}}>Reset camera</button>
      <span className="small muted">{placed.length} parts visible · {connected.length} wires</span>
    </div> : null}
    <div className="lab3d-pin-controls" role="group" aria-label="Component terminals">
      {project.terminals.filter(t=>placed.includes(t.partId)).map(t=><button key={t.id} type="button" className="btn" aria-pressed={pendingTerminal===t.id} onClick={()=>onTerminalSelect(t.id)}>{project.parts.find(p=>p.id===t.partId)?.label}: {t.label}</button>)}
    </div>
    <div className="small muted">Arduino Uno model uses the official 68.6 × 53.4 mm board footprint. Generic component geometry is dimensioned for learning and may differ from a specific manufacturer or clone.</div>
  </div>;
}
