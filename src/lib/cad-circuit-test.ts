import {checkStudio,type StudioDocument,type StudioWire} from './circuit-studio';
import {cadCircuitId,cadProject} from './cad-projects';
import {cadPins,parseAssembly,type CADAssembly} from './robot-cad';
import {checkLedSketch,defaultLedSketch,lab3dProject,supportsFastSketch} from './lab3d';

// Direct terminal topology only: no virtual breadboard buses or analogue solver.
function checkBlink(a:CADAssembly){
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


export function checkCADCircuit(a:CADAssembly){
 const kind=cadCircuitId(a),p=cadProject(kind),sketch=checkLedSketch(a.code??defaultLedSketch);
 const fail=(message:string)=>({ready:false,message,sketch,ledIndex:-1,kind});
 try{parseAssembly(a);}catch{return fail('Invalid assembly or terminal. Import a valid CAD backup.');}
 if(kind==='blink')return {...checkBlink(a),kind};
 const index=p.parts.map(part=>a.parts.findIndex(c=>c.kind===part.kind&&c.visible));
 if(a.version!==2||a.parts.length!==p.parts.length||index.some(i=>i<0)||new Set(index).size!==p.parts.length)return fail(`Required: ${p.parts.map(part=>part.name).join(', ')}. Add missing parts and remove extras before running ${p.name}.`);
 const doc:StudioDocument={version:1,placed:p.parts.map(part=>({id:part.id,x:part.x,y:part.y})),code:kind==='battery'?p.code:a.code??p.code,wires:[]};
 const endpoint=(i:number,pin:string)=>{const part=p.parts[index.indexOf(i)];return part?.pins.includes(pin)?`${part.id}:${pin}`:null;};
 for(const wire of a.wires??[]){const from=endpoint(wire.from,wire.fromPin),to=endpoint(wire.to,wire.toPin);if(!from||!to)return fail('Extra or unsupported terminal connection. Follow the connection schedule; remove unused Uno pin connections.');doc.wires.push({a:from,b:to});}
 const variants:StudioWire[][]=[p.wires];
 // Resistors and switch contacts are non-polar; a series resistor may be before or after the LED.
 if(kind!=='alarm'){
  const source=kind==='battery'?'battery:+':'uno:D8',sink=kind==='battery'?'battery:−':'uno:GND';
  for(const [first,second] of [['Lead 1','Lead 2'],['Lead 2','Lead 1']]){
   const contacts=p.wires.filter(w=>w.a.startsWith('button:')||w.b.startsWith('button:'));
   variants.push([{a:source,b:`resistor:${first}`},{a:`resistor:${second}`,b:'led:Anode +'},{a:'led:Cathode −',b:sink},...contacts]);
   variants.push([{a:source,b:'led:Anode +'},{a:'led:Cathode −',b:`resistor:${first}`},{a:`resistor:${second}`,b:sink},...contacts]);
  }
 }
 const candidates=variants.flatMap(wires=>[wires,wires.map(w=>({a:w.a.replace('button:A','button:T').replace('button:B','button:A').replace('button:T','button:B'),b:w.b.replace('button:A','button:T').replace('button:B','button:A').replace('button:T','button:B')}))]);
 const checks=candidates.map(wires=>checkStudio(doc,{...p,wires}));
 if(!checks.some(check=>check.ok)){
  const short=checks.find(check=>check.message.includes('short'));
  if(short)return fail(short.message);
  if(checks[0].message.includes('sketch'))return fail('Use the supplied sketch for this CAD preview. Arbitrary firmware is not executed.');
  return fail(`Wiring incomplete or incorrect. Check LED/piezo polarity, the series resistor and ${kind==='battery'?'the battery return path':'the D2-to-button-to-GND path'}. Follow the connection schedule.`);
 }
 return {ready:true,message:`Connections checked. Ready to run ${p.name}.`,sketch,ledIndex:index[p.parts.findIndex(part=>part.kind==='led')]??-1,kind};
}
