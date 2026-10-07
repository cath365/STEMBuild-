"use client";

import { useEffect, useRef, useState } from "react";
import type { Lab3DProject } from "@/lib/lab3d";
import {
  breadboardHoleGrid,
  type BreadboardJumper,
  type BreadboardPlacement,
} from "@/lib/breadboard-circuit";

type Props = {
  project: Lab3DProject;
  placed: string[];
  connected: string[];
  ledOn: boolean;
  pendingTerminal: string | null;
  onTerminalSelect: (terminalId: string) => void;
  physicalPlacements?: Record<string, BreadboardPlacement | undefined>;
  physicalJumpers?: BreadboardJumper[];
  onPhysicalPlacementChange?: (partId: string, placement: BreadboardPlacement) => void;
  onPhysicalJumpersChange?: (jumpers: BreadboardJumper[]) => void;
  onWorkbenchMessage?: (message: string) => void;
};

type RemoteModule = Record<string, any>;

function remoteImport(url: string): Promise<RemoteModule> {
  const importer = new Function("url", "return import(url)") as (url: string) => Promise<RemoteModule>;
  return importer(url);
}

const THREE_URL = "https://esm.sh/three@0.180.0";
const GLTF_URL = "https://esm.sh/three@0.180.0/examples/jsm/loaders/GLTFLoader.js";
const ORBIT_URL = "https://esm.sh/three@0.180.0/examples/jsm/controls/OrbitControls.js";

const MODEL_LAYOUT: Record<string, { path?: string; position: [number, number, number]; scale?: number; y: number }> = {
  arduino: { path:"/models/arduino-uno-r3.gltf", position:[-48, 1.5, 0], scale:0.82, y:1.5 },
  breadboard: { path:"/models/breadboard-830.gltf", position:[35, 3.8, 0], scale:0.78, y:3.8 },
  resistor: { position:[-8, 11, 46], y:11 },
  led: { position:[15, 12, 46], y:12 },
  button: { position:[36, 9, 46], y:9 },
};

const ARDUINO_TERMINALS: Record<string, [number, number, number]> = {
  "uno-d8":[9, 8, -20],
  "uno-d2":[-2, 8, -20],
  "uno-gnd":[17, 8, 20],
};

const BREADBOARD_TOP_Y = 4.2;
const breadboardHoles = breadboardHoleGrid();

function holeLocalPosition(holeId: string): [number, number, number] | null {
  const hole = breadboardHoles.find((item) => item.id === holeId);
  if (!hole) return null;
  const x = -36.83 + (hole.column - 1) * 2.54;
  const topRows = ["a","b","c","d","e"];
  const bottomRows = ["f","g","h","i","j"];
  const topIndex = topRows.indexOf(hole.row);
  const bottomIndex = bottomRows.indexOf(hole.row);
  const z = topIndex >= 0 ? -14 + topIndex * 2.54 : 3.84 + bottomIndex * 2.54;
  return [x, BREADBOARD_TOP_Y, z];
}

function disposeObject(object: any) {
  object?.traverse?.((child: any) => {
    child.geometry?.dispose?.();
    if (Array.isArray(child.material)) child.material.forEach((material: any) => material.dispose?.());
    else child.material?.dispose?.();
  });
}

function findPartId(object: any) {
  let current = object;
  while (current) {
    if (current.userData?.partId) return current.userData.partId as string;
    current = current.parent;
  }
  return null;
}

function colorForJumper(color: BreadboardJumper["color"]) {
  if (color === "black") return 0x252a2e;
  if (color === "red") return 0xe44444;
  if (color === "green") return 0x2f9b60;
  return 0x2979ff;
}

export function Stem3DWebGLWorkbench({
  project,
  placed,
  connected,
  ledOn,
  pendingTerminal,
  onTerminalSelect,
  physicalPlacements = {},
  physicalJumpers = [],
  onPhysicalPlacementChange,
  onPhysicalJumpersChange,
  onWorkbenchMessage,
}: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const callbackRef = useRef(onTerminalSelect);
  const placementCallbackRef = useRef(onPhysicalPlacementChange);
  const jumperCallbackRef = useRef(onPhysicalJumpersChange);
  const messageCallbackRef = useRef(onWorkbenchMessage);
  const placementRef = useRef(physicalPlacements);
  const jumperRef = useRef(physicalJumpers);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [physicalPendingNode, setPhysicalPendingNode] = useState<string | null>(null);
  const physicalPendingNodeRef = useRef<string | null>(null);

  const sceneState = useRef<{
    THREE: any;
    scene: any;
    camera: any;
    renderer: any;
    controls: any;
    floor: any;
    partGroup: any;
    wireGroup: any;
    physicalWireGroup: any;
    terminalGroup: any;
    holeGroup: any;
    partObjects: Map<string, any>;
    terminalObjects: Map<string, any>;
    holeObjects: Map<string, any>;
    ledMaterial: any;
    raycaster: any;
    pointer: any;
    drag?: { partId: string; object: any; offsetX: number; offsetZ: number };
    raf: number;
    resize?: ResizeObserver;
    pointerDown?: (event: PointerEvent) => void;
    pointerMove?: (event: PointerEvent) => void;
    pointerUp?: (event: PointerEvent) => void;
  } | null>(null);

  useEffect(() => { callbackRef.current = onTerminalSelect; }, [onTerminalSelect]);
  useEffect(() => { placementCallbackRef.current = onPhysicalPlacementChange; }, [onPhysicalPlacementChange]);
  useEffect(() => { jumperCallbackRef.current = onPhysicalJumpersChange; }, [onPhysicalJumpersChange]);
  useEffect(() => { messageCallbackRef.current = onWorkbenchMessage; }, [onWorkbenchMessage]);
  useEffect(() => { placementRef.current = physicalPlacements; }, [physicalPlacements]);
  useEffect(() => { jumperRef.current = physicalJumpers; }, [physicalJumpers]);
  useEffect(() => { physicalPendingNodeRef.current = physicalPendingNode; }, [physicalPendingNode]);

  useEffect(() => {
    let cancelled = false;

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
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
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
        floor.userData.workbenchFloor = true;
        scene.add(floor);

        const grid = new THREE.GridHelper(200, 20, 0xa8bac8, 0xd2dde5);
        grid.position.y = 0.05;
        scene.add(grid);

        const partGroup = new THREE.Group();
        const wireGroup = new THREE.Group();
        const physicalWireGroup = new THREE.Group();
        const terminalGroup = new THREE.Group();
        const holeGroup = new THREE.Group();
        scene.add(partGroup, wireGroup, physicalWireGroup, terminalGroup, holeGroup);

        const loader = new gltfModule.GLTFLoader();
        const partObjects = new Map<string, any>();
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
          const wrapper = new THREE.Group();
          wrapper.name = part.id;
          wrapper.userData.partId = part.id;

          let model: any;
          if (layout.path) {
            const gltf = await loader.loadAsync(layout.path);
            model = gltf.scene;
            model.rotation.x = -Math.PI/2;
            model.scale.setScalar(layout.scale ?? 1);
          } else if (part.id === "resistor") model = createResistor();
          else if (part.id === "led") model = createLed();
          else if (part.id === "button") model = createButton();
          else model = new THREE.Mesh(new THREE.BoxGeometry(10,5,10),new THREE.MeshStandardMaterial({color:0x8899aa}));

          model.traverse?.((child:any)=>{
            child.userData.partId = part.id;
            if (child.isMesh) { child.castShadow=true; child.receiveShadow=true; }
          });
          wrapper.add(model);

          const saved = physicalPlacements[part.id];
          wrapper.position.set(saved?.x ?? layout.position[0], layout.y, saved?.z ?? layout.position[2]);
          wrapper.visible = placed.includes(part.id);
          partGroup.add(wrapper);
          partObjects.set(part.id,wrapper);
        }

        const terminalObjects = new Map<string, any>();
        const arduino = partObjects.get("arduino");
        if (arduino) {
          for (const terminal of project.terminals.filter((item)=>item.partId==="arduino")) {
            const point = ARDUINO_TERMINALS[terminal.id];
            if (!point) continue;
            const material = new THREE.MeshStandardMaterial({color:0x0b6bdc,emissive:0x001a3d,emissiveIntensity:.8});
            const sphere = new THREE.Mesh(new THREE.SphereGeometry(2.2,18,14),material);
            sphere.position.set(...point);
            sphere.userData.nodeId=terminal.id;
            sphere.userData.partId="arduino";
            sphere.userData.nodeType="arduino";
            sphere.visible=placed.includes("arduino");
            arduino.add(sphere);
            terminalObjects.set(terminal.id,sphere);
          }
        }

        const holeObjects = new Map<string, any>();
        const breadboard = partObjects.get("breadboard");
        if (breadboard) {
          for (const hole of breadboardHoles) {
            const point = holeLocalPosition(hole.id);
            if (!point) continue;
            const material = new THREE.MeshStandardMaterial({
              color:0x27313a,
              metalness:.2,
              roughness:.7,
              emissive:0x000000,
            });
            const marker = new THREE.Mesh(new THREE.CylinderGeometry(.72,.72,.5,12),material);
            marker.rotation.x = Math.PI/2;
            marker.position.set(...point);
            marker.userData.nodeId=hole.id;
            marker.userData.partId="breadboard";
            marker.userData.nodeType="breadboard-hole";
            marker.visible=placed.includes("breadboard");
            breadboard.add(marker);
            holeObjects.set(hole.id,marker);
          }
        }

        const raycaster=new THREE.Raycaster();
        const pointer=new THREE.Vector2();

        function setPointer(event: PointerEvent) {
          const rect=renderer.domElement.getBoundingClientRect();
          pointer.x=((event.clientX-rect.left)/rect.width)*2-1;
          pointer.y=-((event.clientY-rect.top)/rect.height)*2+1;
          raycaster.setFromCamera(pointer,camera);
        }

        function worldPointForNode(nodeId: string) {
          const object = terminalObjects.get(nodeId) ?? holeObjects.get(nodeId);
          if (!object) return null;
          return object.getWorldPosition(new THREE.Vector3());
        }

        function rebuildPhysicalWires() {
          while(physicalWireGroup.children.length){
            const child=physicalWireGroup.children.pop();
            if(child)disposeObject(child);
          }
          for (const jumper of jumperRef.current) {
            const start=worldPointForNode(jumper.from);
            const end=worldPointForNode(jumper.to);
            if(!start||!end)continue;
            const mid=start.clone().lerp(end,.5);
            mid.y=Math.max(start.y,end.y)+18;
            const curve=new THREE.CatmullRomCurve3([start,mid,end]);
            const geometry=new THREE.TubeGeometry(curve,32,.65,8,false);
            const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:colorForJumper(jumper.color),roughness:.5}));
            mesh.userData.jumperId=jumper.id;
            physicalWireGroup.add(mesh);
          }
        }

        function sendPlacement(partId: string, holes?: string[]) {
          const object=partObjects.get(partId);
          if(!object)return;
          placementCallbackRef.current?.(partId,{x:object.position.x,z:object.position.z,holes});
        }

        function nearestBreadboardSnap(partId: string, object: any) {
          const board=partObjects.get("breadboard");
          if(!board||!board.visible)return null;
          const local=board.worldToLocal(object.getWorldPosition(new THREE.Vector3()).clone());
          if(Math.abs(local.x)>39||Math.abs(local.z)>21)return null;

          const col=Math.max(1,Math.min(30,Math.round((local.x+36.83)/2.54)+1));
          const topRows=["a","b","c","d","e"];
          const rowIndex=Math.max(0,Math.min(4,Math.round((local.z+14)/2.54)));
          const row=topRows[rowIndex];

          if(partId==="resistor"){
            const startCol=Math.max(1,Math.min(7,col));
            const holes=[`bb-${row}${startCol}`,`bb-${row}${startCol+3}`];
            return {holes};
          }
          if(partId==="led"){
            const startCol=Math.max(1,Math.min(29,col));
            const holes=[`bb-${row}${startCol}`,`bb-${row}${startCol+1}`];
            return {holes};
          }
          if(partId==="button"){
            const column=Math.max(1,Math.min(30,col));
            return {holes:[`bb-e${column}`,`bb-f${column}`]};
          }
          return null;
        }

        function snapPartToHoles(partId: string, holes: string[]) {
          const board=partObjects.get("breadboard");
          const object=partObjects.get(partId);
          if(!board||!object)return;
          const points=holes.map((hole)=>holeLocalPosition(hole)).filter(Boolean) as [number,number,number][];
          if(!points.length)return;
          const localX=points.reduce((sum,p)=>sum+p[0],0)/points.length;
          const localZ=points.reduce((sum,p)=>sum+p[2],0)/points.length;
          const world=board.localToWorld(new THREE.Vector3(localX,BREADBOARD_TOP_Y,localZ));
          object.position.set(world.x,MODEL_LAYOUT[partId]?.y ?? 9,world.z);
          sendPlacement(partId,holes);
          messageCallbackRef.current?.(`${project.parts.find((part)=>part.id===partId)?.label ?? partId} snapped into breadboard holes ${holes.map((hole)=>hole.replace("bb-","")).join(" and ")}.`);
        }

        function choosePhysicalNode(nodeId: string) {
          if(project.slug!=="led-blink") {
            if(terminalObjects.has(nodeId)) callbackRef.current(nodeId);
            return;
          }

          if(!physicalPendingNodeRef.current){
            physicalPendingNodeRef.current=nodeId;
            setPhysicalPendingNode(nodeId);
            const label=nodeId.startsWith("bb-")?nodeId.replace("bb-","").toUpperCase():nodeId.replace("uno-","Arduino ").toUpperCase();
            messageCallbackRef.current?.(`${label} selected. Tap a destination node.`);
            return;
          }
          if(physicalPendingNodeRef.current===nodeId){
            physicalPendingNodeRef.current=null;
            setPhysicalPendingNode(null);
            messageCallbackRef.current?.("Jumper selection cancelled.");
            return;
          }

          const oneArduino=physicalPendingNodeRef.current!.startsWith("uno-")!==nodeId.startsWith("uno-");
          const oneBreadboard=physicalPendingNodeRef.current!.startsWith("bb-")!==nodeId.startsWith("bb-");
          if(!oneArduino||!oneBreadboard){
            physicalPendingNodeRef.current=null;
            setPhysicalPendingNode(null);
            messageCallbackRef.current?.("For this LED lab, a jumper must connect one Arduino pin to one breadboard hole.");
            return;
          }

          const from=physicalPendingNodeRef.current!.startsWith("uno-")?physicalPendingNodeRef.current!:nodeId;
          const to=physicalPendingNodeRef.current!.startsWith("bb-")?physicalPendingNodeRef.current!:nodeId;
          if(from!=="uno-d8"&&from!=="uno-gnd"){
            physicalPendingNodeRef.current=null;
            setPhysicalPendingNode(null);
            messageCallbackRef.current?.("Use Arduino D8 or GND for this LED project.");
            return;
          }

          const withoutSamePin=jumperRef.current.filter((jumper)=>jumper.from!==from&&jumper.to!==from);
          const jumper:BreadboardJumper={
            id:`${from}-${to}`,
            from,
            to,
            color:from==="uno-gnd"?"black":"blue",
          };
          const next=[...withoutSamePin,jumper];
          jumperRef.current=next;
          jumperCallbackRef.current?.(next);
          rebuildPhysicalWires();
          physicalPendingNodeRef.current=null;
            setPhysicalPendingNode(null);
          messageCallbackRef.current?.(`Jumper connected: ${from==="uno-d8"?"Arduino D8":"Arduino GND"} → breadboard ${to.replace("bb-","").toUpperCase()}.`);
        }

        const pointerDown=(event:PointerEvent)=>{
          setPointer(event);

          const nodeHits=raycaster.intersectObjects([
            ...terminalObjects.values(),
            ...holeObjects.values(),
          ].filter((item:any)=>item.visible),false);
          if(nodeHits[0]?.object?.userData?.nodeId){
            event.preventDefault();
            choosePhysicalNode(nodeHits[0].object.userData.nodeId);
            return;
          }

          const partHits=raycaster.intersectObjects([...partObjects.values()].filter((item:any)=>item.visible),true);
          if(!partHits.length)return;
          const partId=findPartId(partHits[0].object);
          if(!partId)return;

          if(partId==="breadboard" && Object.values(placementRef.current).some((placement)=>placement?.holes?.length)){
            messageCallbackRef.current?.("Remove breadboard-mounted components before moving the breadboard.");
            return;
          }

          const object=partObjects.get(partId);
          const floorHit=raycaster.intersectObject(floor,false)[0];
          if(!object||!floorHit)return;
          controls.enabled=false;
          renderer.domElement.setPointerCapture?.(event.pointerId);
          sceneState.current!.drag={
            partId,
            object,
            offsetX:object.position.x-floorHit.point.x,
            offsetZ:object.position.z-floorHit.point.z,
          };
          messageCallbackRef.current?.(`Moving ${project.parts.find((part)=>part.id===partId)?.label ?? partId}. Drag and release to place it.`);
        };

        const pointerMove=(event:PointerEvent)=>{
          const drag=sceneState.current?.drag;
          if(!drag)return;
          setPointer(event);
          const floorHit=raycaster.intersectObject(floor,false)[0];
          if(!floorHit)return;
          drag.object.position.x=floorHit.point.x+drag.offsetX;
          drag.object.position.z=floorHit.point.z+drag.offsetZ;
          rebuildPhysicalWires();
        };

        const pointerUp=(event:PointerEvent)=>{
          const drag=sceneState.current?.drag;
          if(!drag)return;
          sceneState.current!.drag=undefined;
          controls.enabled=true;
          renderer.domElement.releasePointerCapture?.(event.pointerId);

          if(["resistor","led","button"].includes(drag.partId)){
            const snap=nearestBreadboardSnap(drag.partId,drag.object);
            if(snap){
              snapPartToHoles(drag.partId,snap.holes);
              rebuildPhysicalWires();
              return;
            }
          }
          sendPlacement(drag.partId);
          messageCallbackRef.current?.(`${project.parts.find((part)=>part.id===drag.partId)?.label ?? drag.partId} placed on the workbench.`);
          rebuildPhysicalWires();
        };

        renderer.domElement.addEventListener("pointerdown",pointerDown);
        renderer.domElement.addEventListener("pointermove",pointerMove);
        renderer.domElement.addEventListener("pointerup",pointerUp);
        renderer.domElement.addEventListener("pointercancel",pointerUp);

        const resize = new ResizeObserver(()=>{
          const width=Math.max(1,mount.clientWidth);
          const height=Math.max(340,mount.clientHeight);
          camera.aspect=width/height;
          camera.updateProjectionMatrix();
          renderer.setSize(width,height,false);
        });
        resize.observe(mount);

        let raf=0;
        const animate=()=>{
          controls.update();
          renderer.render(scene,camera);
          raf=requestAnimationFrame(animate);
        };
        animate();

        sceneState.current={
          THREE,scene,camera,renderer,controls,floor,partGroup,wireGroup,physicalWireGroup,
          terminalGroup,holeGroup,partObjects,terminalObjects,holeObjects,ledMaterial,
          raycaster,pointer,raf,resize,pointerDown,pointerMove,pointerUp,
        };
        rebuildPhysicalWires();
        setStatus("ready");
      } catch (cause) {
        if (!cancelled) {
          setStatus("error");
          setError(cause instanceof Error ? cause.message : String(cause));
        }
      }
    }
    boot();

    return ()=>{
      cancelled=true;
      const state=sceneState.current;
      if(state){
        cancelAnimationFrame(state.raf);
        state.resize?.disconnect();
        if(state.pointerDown) state.renderer.domElement.removeEventListener("pointerdown",state.pointerDown);
        if(state.pointerMove) state.renderer.domElement.removeEventListener("pointermove",state.pointerMove);
        if(state.pointerUp){
          state.renderer.domElement.removeEventListener("pointerup",state.pointerUp);
          state.renderer.domElement.removeEventListener("pointercancel",state.pointerUp);
        }
        state.controls?.dispose?.();
        disposeObject(state.scene);
        state.renderer?.dispose?.();
        state.renderer?.domElement?.remove?.();
      }
      sceneState.current=null;
    };
  }, [project.slug]);

  useEffect(()=>{
    const state=sceneState.current;
    if(!state)return;
    for(const [id,object] of state.partObjects) {
      object.visible=placed.includes(id);
      const saved=physicalPlacements[id];
      const layout=MODEL_LAYOUT[id];
      if(saved&&layout&&!state.drag){
        object.position.set(saved.x,layout.y,saved.z);
      }
    }
    for(const [,sphere] of state.terminalObjects) sphere.visible=placed.includes(sphere.userData.partId);
    for(const [,hole] of state.holeObjects) hole.visible=placed.includes("breadboard");
  },[placed,physicalPlacements]);

  useEffect(()=>{
    const state=sceneState.current;
    if(!state)return;
    jumperRef.current=physicalJumpers;
    while(state.physicalWireGroup.children.length){
      const child=state.physicalWireGroup.children.pop();
      if(child)disposeObject(child);
    }
    for(const jumper of physicalJumpers){
      const start=(state.terminalObjects.get(jumper.from)??state.holeObjects.get(jumper.from))?.getWorldPosition(new state.THREE.Vector3());
      const end=(state.terminalObjects.get(jumper.to)??state.holeObjects.get(jumper.to))?.getWorldPosition(new state.THREE.Vector3());
      if(!start||!end)continue;
      const mid=start.clone().lerp(end,.5); mid.y=Math.max(start.y,end.y)+18;
      const curve=new state.THREE.CatmullRomCurve3([start,mid,end]);
      const geometry=new state.THREE.TubeGeometry(curve,32,.65,8,false);
      const mesh=new state.THREE.Mesh(geometry,new state.THREE.MeshStandardMaterial({color:colorForJumper(jumper.color),roughness:.5}));
      state.physicalWireGroup.add(mesh);
    }
  },[physicalJumpers]);

  useEffect(()=>{
    const state=sceneState.current;
    if(!state)return;
    if(project.slug==="led-blink") {
      while(state.wireGroup.children.length){
        const child=state.wireGroup.children.pop();
        if(child)disposeObject(child);
      }
      return;
    }
    const {THREE,wireGroup}=state;
    while(wireGroup.children.length){
      const child=wireGroup.children.pop();
      if(child)disposeObject(child);
    }
    for(const wire of project.connections){
      if(!connected.includes(wire.id))continue;
      const a=state.terminalObjects.get(wire.fromTerminal)?.getWorldPosition(new THREE.Vector3());
      const b=state.terminalObjects.get(wire.toTerminal)?.getWorldPosition(new THREE.Vector3());
      if(!a||!b)continue;
      const mid=a.clone().lerp(b,.5); mid.y+=18;
      const curve=new THREE.CatmullRomCurve3([a,mid,b]);
      const geometry=new THREE.TubeGeometry(curve,32,.65,8,false);
      const color=wire.wireClass==="wire-red"?0xe44444:wire.wireClass==="wire-black"?0x252a2e:wire.wireClass==="wire-green"?0x2f9b60:0x2979ff;
      wireGroup.add(new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color,roughness:.55})));
    }
  },[connected,project]);

  useEffect(()=>{
    const material=sceneState.current?.ledMaterial;
    if(!material)return;
    material.emissive?.setHex?.(ledOn?0xff1515:0x220000);
    material.emissiveIntensity=ledOn?3.2:.25;
    material.color?.setHex?.(ledOn?0xff3030:0xbb2020);
  },[ledOn]);

  useEffect(()=>{
    const state=sceneState.current;
    if(!state)return;
    for(const [id,sphere] of state.terminalObjects){
      const selected=(project.slug==="led-blink"?physicalPendingNode:pendingTerminal)===id;
      sphere.material.color.setHex(selected?0x00a7ff:0x0b6bdc);
      sphere.material.emissive.setHex(selected?0x0063a3:0x001a3d);
      sphere.scale.setScalar(selected?1.45:1);
    }
    for(const [id,hole] of state.holeObjects){
      const selected=physicalPendingNode===id;
      hole.material.color.setHex(selected?0x00a7ff:0x27313a);
      hole.material.emissive.setHex(selected?0x0063a3:0x000000);
      hole.scale.setScalar(selected?1.6:1);
    }
  },[pendingTerminal,physicalPendingNode,project.slug]);

  return <div className="lab3d-webgl-shell">
    <div className="lab3d-webgl-head">
      <div><span className="badge badge-green">TRUE WEBGL</span><strong>Movable electronics workbench</strong></div>
      <span className="small muted">Drag a part to move it · drop LED/resistor onto breadboard holes · tap D8/GND then a hole to add a jumper</span>
    </div>
    <div className="lab3d-webgl-canvas" ref={mountRef}>
      {status==="loading"?<div className="lab3d-webgl-overlay">Loading WebGL workbench and breadboard holes…</div>:null}
      {status==="error"?<div className="lab3d-webgl-overlay error"><strong>WebGL mode could not load.</strong><span>{error}</span><span>The lightweight lab remains available below.</span></div>:null}
    </div>
    <div className="lab3d-webgl-help-grid">
      <span><strong>Move:</strong> drag the component body.</span>
      <span><strong>Snap:</strong> release LED/resistor over the breadboard.</span>
      <span><strong>Wire:</strong> tap D8 or GND, then tap a breadboard hole.</span>
      <span><strong>Orbit:</strong> drag empty space; pinch/scroll to zoom.</span>
    </div>
  </div>;
}
