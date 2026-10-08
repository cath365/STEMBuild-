import {cadPins,type CADAssembly} from './robot-cad';
import {checkLedSketch,defaultLedSketch,lab3dProject,supportsFastSketch} from './lab3d';

// Direct terminal topology only: no virtual breadboard buses or analogue solver.
export function checkCADCircuit(a:CADAssembly){
 const sketch=checkLedSketch(a.code??defaultLedSketch);
 const fail=(message:string)=>({ready:false,message,sketch,ledIndex:-1});
 if(a.version!==2||a.parts.length!==3||!['uno','led','resistor'].every(kind=>a.parts.filter(p=>p.kind===kind&&p.visible).length===1))return fail('This test supports one Arduino Uno, one red LED and one 330 Ω resistor. Other assemblies are design-only. Use Free Build for breadboard hole testing.');
 const uno=a.parts.findIndex(p=>p.kind==='uno'),led=a.parts.findIndex(p=>p.kind==='led'),res=a.parts.findIndex(p=>p.kind==='resistor');
 const key=(i:number,pin:string)=>`${i}:${pin}`;
 const parent=new Map(a.parts.flatMap((_,i)=>cadPins(a.parts,i).map(pin=>[key(i,pin),key(i,pin)])));
 function root(k:string):string{const next=parent.get(k);if(next===undefined)throw Error('Invalid terminal.');if(next===k)return k;const r=root(next);parent.set(k,r);return r;}
 for(const w of a.wires??[])parent.set(root(key(w.from,w.fromPin)),root(key(w.to,w.toPin)));
 const equal=(i:number,p:string,j:number,q:string)=>root(key(i,p))===root(key(j,q));
 if(equal(uno,'D8',uno,'GND')||equal(uno,'5V',uno,'GND'))return fail('Short circuit: a powered Uno terminal is directly wired to GND.');
 if(equal(led,'Anode +',led,'Cathode −')||equal(res,'Lead 1',res,'Lead 2'))return fail('A component is bypassed by a wire. Keep the LED and resistor in series.');
 const path=(p:string,q:string)=>(equal(uno,'D8',res,p)&&equal(res,q,led,'Anode +')&&equal(led,'Cathode −',uno,'GND'))||(equal(uno,'D8',led,'Anode +')&&equal(led,'Cathode −',res,p)&&equal(res,q,uno,'GND'));
 if(!path('Lead 1','Lead 2')&&!path('Lead 2','Lead 1'))return fail('Wire D8 → 330 Ω resistor → LED Anode + → LED Cathode − → GND. The resistor may also go after the LED.');
 // Reject extra connections, including feeding the blink network from a power rail.
 const used=new Set([key(uno,'D8'),key(uno,'GND'),key(led,'Anode +'),key(led,'Cathode −'),key(res,'Lead 1'),key(res,'Lead 2')]);
 if((a.wires??[]).some(w=>!used.has(key(w.from,w.fromPin))||!used.has(key(w.to,w.toPin))))return fail('Remove extra Uno pin connections before running this supported blink circuit.');
 if(!sketch.ok||!supportsFastSketch(lab3dProject('led-blink'),a.code??defaultLedSketch))return fail('Only the starter D8 blink sketch with numeric delay changes runs here. Other firmware is not executed.');
 return {ready:true,message:'Wiring connected. Ready to preview the D8 LED blink with a 330 Ω resistor.',sketch,ledIndex:led};
}
