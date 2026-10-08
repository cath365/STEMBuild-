"use client";

import { useEffect, useRef, useState } from "react";
import { holePositions, holes, type BreadboardDocument } from "@/lib/breadboard-workshop";

type Props = { document: BreadboardDocument; ledOn: boolean; onClose: () => void };
type SceneState = {
  THREE: any;
  scene: any;
  stage: any;
  camera: any;
  controls: any;
  renderer: any;
  frame: number;
  observer: ResizeObserver | null;
};

const CND_THREE = "https://esm.sh/three@0.180.0";
const CND_ORBIT = "https://esm.sh/three@0.180.0/examples/jsm/controls/OrbitControls.js";
const CND_GLTF = "https://esm.sh/three@0.180.0/examples/jsm/loaders/GLTFLoader.js";
const position = (holeId: string) => {
  const point = holePositions.get(holeId)!;
  return { x: (point.x - 440) / 10, z: (point.y - 238) / 10 };
};

function dispose(root: any) {
  root?.traverse?.((item: any) => {
    item.geometry?.dispose?.();
    if (Array.isArray(item.material)) item.material.forEach((m: any) => m.dispose?.());
    else item.material?.dispose?.();
  });
}

function paintAssembly(state: SceneState, doc: BreadboardDocument, ledOn: boolean) {
  const { THREE, stage } = state;
  while (stage.children.length) {
    const child = stage.children[0];
    stage.remove(child);
    dispose(child);
  }

  function line(from: any, to: any, color: number, width = .32, rise = 4) {
    const start = from.clone();
    const end = to.clone();
    const middle = start.clone().add(end).multiplyScalar(.5);
    middle.y = Math.max(start.y,end.y) + rise;
    const curve = new THREE.QuadraticBezierCurve3(start, middle, end);
    const wire = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 24, width, 8, false),
      new THREE.MeshStandardMaterial({ color, roughness: .45 }),
    );
    stage.add(wire);
  }
  function holeVector(id: string) {
    const point = position(id);
    return new THREE.Vector3(point.x, 1.55, point.z);
  }
  const wireColor = (a: string, b: string) =>
    a === "UNO:D8" || b === "UNO:D8" ? 0xe34a41 : a === "UNO:GND" || b === "UNO:GND" ? 0x344657 : 0x26a598;
  for (const wire of doc.wires) {
    line(holeVector(wire.from), holeVector(wire.to), wireColor(wire.from,wire.to), .28, 6);
  }

  if (doc.resistor) {
    const left = holeVector(doc.resistor.a);
    const right = holeVector(doc.resistor.b);
    const vector = right.clone().sub(left).normalize();
    const center = left.clone().add(right).multiplyScalar(.5);
    center.y = 4.2;
    const a = center.clone().addScaledVector(vector,-2.0);
    const b = center.clone().addScaledVector(vector, 2.0);
    line(left, a, 0xb0b6bc, .15, .25);
    line(right, b, 0xb0b6bc, .15, .25);
    const cylinder = new THREE.Mesh(
      new THREE.CylinderGeometry(.78,.78,4,24),
      new THREE.MeshStandardMaterial({ color: 0xe8c993, roughness: .62 }),
    );
    cylinder.position.copy(center);
    cylinder.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), vector);
    stage.add(cylinder);
    const stripe = new THREE.MeshStandardMaterial({ color: 0xbb6527 });
    for (const amount of [-1.2,-.4,.4]) {
      const band = new THREE.Mesh(new THREE.CylinderGeometry(.8,.8,.33,24), stripe.clone());
      band.position.copy(center).addScaledVector(vector,amount);
      band.quaternion.copy(cylinder.quaternion);
      stage.add(band);
    }
  }

  if (doc.led) {
    const left = holeVector(doc.led.a);
    const right = holeVector(doc.led.b);
    const center = left.clone().add(right).multiplyScalar(.5);
    center.y = 5;
    line(left,center,0xa0a9b2,.13,.5);
    line(right,center,0xa0a9b2,.13,.5);
    const plastic = new THREE.Mesh(
      new THREE.SphereGeometry(1.5,24,16),
      new THREE.MeshStandardMaterial({
        color: ledOn ? 0xff3943 : 0xc92738,
        emissive: ledOn ? 0xff1525 : 0x200000,
        emissiveIntensity: ledOn ? 2.5 : .15,
        roughness: .2, transparent: true, opacity: .9,
      }),
    );
    plastic.position.copy(center);
    stage.add(plastic);
  }
}

export function Breadboard3DPreview({ document: doc, ledOn, onClose }: Props) {
  const mount = useRef<HTMLDivElement>(null);
  const stateRef = useRef<SceneState | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const latest = useRef({doc, ledOn});
  // Keep the imperative scene in sync without recreating Three.js on every wire edit.
  useEffect(() => { latest.current = {doc, ledOn}; }, [doc,ledOn]);

  useEffect(() => {
    const state = stateRef.current;
    if (state) paintAssembly(state, doc, ledOn);
  }, [doc,ledOn,status]);

  useEffect(() => {
    let cancelled = false;
    async function begin() {
      let THREE: any, controlsModule: any;
      try {
        const remoteImport = new Function("url","return import(url)") as (url:string)=>Promise<any>;
        [THREE,controlsModule] = await Promise.all([
          remoteImport(CND_THREE),remoteImport(CND_ORBIT),
        ]);
        if (cancelled || !mount.current) return;
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xe9f0f6);
        const camera = new THREE.PerspectiveCamera(44,1,.1,500);
        camera.position.set(0,89,125);
        const renderer = new THREE.WebGLRenderer({antialias: true});
        renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));
        const controls = new controlsModule.OrbitControls(camera,renderer.domElement);
        controls.enableDamping = true;
        controls.minDistance = 50;
        controls.maxDistance = 220;
        controls.target.set(-2,0,0);
        mount.current.replaceChildren(renderer.domElement);
        scene.add(new THREE.HemisphereLight(0xffffff,0x61778b,2.9));
        const sun = new THREE.DirectionalLight(0xffffff,2);
        sun.position.set(-40,85,50);
        scene.add(sun);

        const base = new THREE.Mesh(
          new THREE.BoxGeometry(55,2,44),
          new THREE.MeshStandardMaterial({color:0xf8fafb,roughness:.76}),
        );
        base.position.set(0,0,0);
        scene.add(base);
        for (const [row,color] of [["P",0xd43d41],["N",0x2b83bf]] as const) {
          const z = position(`${row}1`).z;
          const rail = new THREE.Mesh(new THREE.BoxGeometry(50,.13,.3),
            new THREE.MeshStandardMaterial({color}));
          rail.position.set(0,1.05,z-1.7);
          scene.add(rail);
        }
        const holeGeometry = new THREE.CylinderGeometry(.23,.23,.17,9);
        for (const hole of holes) {
          if (hole.id === "UNO:D8" || hole.id === "UNO:GND") continue;
          const material = new THREE.MeshStandardMaterial({color:hole.rail?0x384859:0x273746});
          const mesh = new THREE.Mesh(holeGeometry,material);
          const point = position(hole.id);
          mesh.position.set(point.x,1.07,point.z);
          scene.add(mesh);
        }
        const unoBody = new THREE.Mesh(new THREE.BoxGeometry(11,1.9,18),
          new THREE.MeshStandardMaterial({color:0x156d94,roughness:.5}));
        unoBody.position.set(-36,0,1.5);
        scene.add(unoBody);
        for (const id of ["UNO:D8","UNO:GND"]) {
          const point=position(id);
          const pin=new THREE.Mesh(new THREE.BoxGeometry(1.5,.3,1.5),
            new THREE.MeshStandardMaterial({color:0xe9e2c5,metalness:.5}));
          pin.position.set(point.x,1.17,point.z);
          scene.add(pin);
        }

        const stage=new THREE.Group();
        scene.add(stage);
        const state:SceneState={THREE,scene,stage,camera,controls,renderer,frame:0,observer:null};
        stateRef.current=state;
        paintAssembly(state,documentRef.current.doc,documentRef.current.ledOn);

        const resize=()=>{
          if(!mount.current)return;
          const bounds=mount.current.getBoundingClientRect();
          const width=Math.max(1,bounds.width),height=Math.max(260,bounds.height);
          renderer.setSize(width,height,false);
          camera.aspect=width/height;
          camera.updateProjectionMatrix();
        };
        const observer = new ResizeObserver(resize);
        state.observer=observer;
        observer.observe(mount.current);
        resize();

        const frame = () => {
          if(cancelled)return;
          controls.update();
          renderer.render(scene,camera);
          state.frame=requestAnimationFrame(frame);
        };
        frame();
        setStatus("ready");

        // Use an actual saved Uno glTF when possible. A clearly identifiable
        // fallback board remains in place on slow devices or blocked CDNs.
        void (async()=>{
          try{
            const loaderModule=await remoteImport(CND_GLTF);
            if(cancelled)return;
            const asset=await new loaderModule.GLTFLoader().loadAsync("/models/arduino-uno-r3.gltf");
            const model=asset.scene;
            if(cancelled){dispose(model);return;}
            model.rotation.x=-Math.PI/2;
            model.updateMatrixWorld(true);
            const bounds=new THREE.Box3().setFromObject(model);
            const size=bounds.getSize(new THREE.Vector3());
            const scale=10/Math.max(size.x,size.z,1);
            model.scale.multiplyScalar(scale);
            model.updateMatrixWorld(true);
            const fixed=new THREE.Box3().setFromObject(model);
            const center=fixed.getCenter(new THREE.Vector3());
            model.position.set(-36-center.x,1.7-fixed.min.y,1.5-center.z);
            scene.add(model);
            unoBody.visible=false;
          }catch{/* The fallback board keeps the preview usable. */}
        })();
      } catch (cause) {
        if(!cancelled){
          setError(cause instanceof Error?cause.message:String(cause));
          setStatus("error");
        }
      }
    }
    const documentRef = latest;
    void begin();
    return () => {
      cancelled=true;
      const state=stateRef.current;
      if(!state)return;
      cancelAnimationFrame(state.frame);
      state.observer?.disconnect();
      state.controls.dispose();
      dispose(state.scene);
      state.renderer.dispose();
      state.renderer.domElement.remove();
      stateRef.current=null;
    };
  }, []);

  return <div className="bb-3d-shell">
    <div className="bb-3d-toolbar"><div><strong>Live 3D assembly mirror</strong><p>Rotate, pan and zoom. Place components and change wires in the hole-level editor above.</p></div>
      <button type="button" className="btn" onClick={onClose}>Close 3D assembly</button></div>
    <div className="bb-3d-stage" aria-label="Interactive 3D breadboard scene">
      <div className="bb-3d-renderer" ref={mount} />
      {status==="loading" ? <span className="bb-3d-overlay">Loading optional 3D engine…</span>:null}
      {status==="error" ? <div className="bb-3d-overlay">3D could not load: {error}. Your circuit remains saved in the top-down editor.</div>:null}
    </div>
    <p className="small muted">Dimensioned educational geometry is an approximation; hole connections are checked using the top-down breadboard electrical model, not a full physics solver. Physical components vary by manufacturer.</p>
  </div>;
}
