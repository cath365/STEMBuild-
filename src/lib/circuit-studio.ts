export type StudioPart = {id:string;name:string;kind:string;pins:string[];x:number;y:number};
export type StudioWire = {a:string;b:string};
export type StudioDocument = {version:1;placed:{id:string;x:number;y:number}[];wires:StudioWire[];code:string};
export type CircuitProject = {id:string;name:string;summary:string;output:'blink'|'button'|'traffic'|'alarm';parts:StudioPart[];wires:StudioWire[];code:string};
const uno:StudioPart={id:'uno',name:'Arduino Uno',kind:'uno',pins:['D2','D8','D9','D10','GND'],x:35,y:45};
const resistor=(id:string,x:number,y:number):StudioPart=>({id,name:id==='resistor'?'330 Ω resistor':`${({r1:'Red',r2:'Yellow',r3:'Green'} as Record<string,string>)[id]} 330 Ω resistor`,kind:'resistor',pins:['Lead 1','Lead 2'],x,y});
const led=(id:string,name:string,x:number,y:number):StudioPart=>({id,name,kind:'led',pins:['Anode +','Cathode −'],x,y});
const button:StudioPart={id:'button',name:'Push button',kind:'button',pins:['A','B'],x:285,y:285};
const wire=(a:string,b:string):StudioWire=>({a,b});
const lightWires=(pin:string,r:string,l:string)=>[wire(`uno:${pin}`,`${r}:Lead 1`),wire(`${r}:Lead 2`,`${l}:Anode +`),wire(`${l}:Cathode −`,'uno:GND')];
const buttonWires=[wire('uno:D2','button:A'),wire('button:B','uno:GND')];
export const circuitProjects:CircuitProject[]=[
 {id:'blink',name:'LED blink',summary:'Control an LED and explore timing.',output:'blink',parts:[uno,resistor('resistor',285,45),led('led','Red LED',550,45)],wires:lightWires('D8','resistor','led'),code:'// D8 → 330 Ω resistor → LED anode; cathode → GND\nvoid setup() { pinMode(8, OUTPUT); }\nvoid loop() {\n  digitalWrite(8, HIGH); delay(1000);\n  digitalWrite(8, LOW); delay(1000);\n}\n'},
 {id:'button',name:'Push-button light',summary:'Use a digital input to control an LED.',output:'button',parts:[uno,resistor('resistor',285,45),led('led','Red LED',550,45),button],wires:[...lightWires('D8','resistor','led'),...buttonWires],code:'// D2 uses the internal pull-up. Button connects D2 to GND.\nvoid setup() { pinMode(8, OUTPUT); pinMode(2, INPUT_PULLUP); }\nvoid loop() { digitalWrite(8, digitalRead(2) == LOW ? HIGH : LOW); }\n'},
 {id:'traffic',name:'Traffic lights',summary:'Sequence three outputs with separate resistors.',output:'traffic',parts:[uno,resistor('r1',285,20),led('red','Red LED',550,20),resistor('r2',285,185),led('yellow','Yellow LED',550,185),resistor('r3',285,350),led('green','Green LED',550,350)],wires:[...lightWires('D8','r1','red'),...lightWires('D9','r2','yellow'),...lightWires('D10','r3','green')],code:'// One 330 Ω series resistor for each LED.\nvoid setup() { pinMode(8, OUTPUT); pinMode(9, OUTPUT); pinMode(10, OUTPUT); }\nvoid loop() {\n digitalWrite(8, HIGH); delay(2000); digitalWrite(8, LOW);\n digitalWrite(9, HIGH); delay(1000); digitalWrite(9, LOW);\n digitalWrite(10, HIGH); delay(2000); digitalWrite(10, LOW);\n}\n'},
 {id:'alarm',name:'Button alarm',summary:'Trigger a low-current piezo with a push button.',output:'alarm',parts:[uno,{id:'piezo',name:'Low-current piezo',kind:'buzzer',pins:['+','−'],x:550,y:45},button],wires:[wire('uno:D8','piezo:+'),wire('piezo:−','uno:GND'),...buttonWires],code:'// Use a low-current piezo, not an unknown or high-current sounder.\nvoid setup() { pinMode(2, INPUT_PULLUP); }\nvoid loop() {\n if (digitalRead(2) == LOW) { tone(8, 1000); }\n else { noTone(8); }\n}\n'}
];
export function emptyStudio(p:CircuitProject):StudioDocument{return {version:1,placed:[],wires:[],code:p.code};}
export function exampleStudio(p:CircuitProject):StudioDocument{return {version:1,placed:p.parts.map(({id,x,y})=>({id,x,y})),wires:p.wires.map(w=>({...w})),code:p.code};}
function pins(p:CircuitProject){return p.parts.flatMap(c=>c.pins.map(pin=>`${c.id}:${pin}`));}
export function parseStudio(value:unknown,p:CircuitProject):StudioDocument|null{
 if(!value||typeof value!=='object')return null;
 const d=value as StudioDocument;
 if(d.version!==1||!Array.isArray(d.placed)||!Array.isArray(d.wires)||typeof d.code!=='string'||d.code.length>50000||d.placed.length>p.parts.length||d.wires.length>80)return null;
 const ids=new Set<string>();
 for(const c of d.placed){if(!c||!p.parts.some(x=>x.id===c.id)||ids.has(c.id)||!Number.isFinite(c.x)||!Number.isFinite(c.y)||c.x<0||c.x>630||c.y<0||c.y>350)return null;ids.add(c.id);}
 const available=new Set(pins(p).filter(pin=>ids.has(pin.split(':')[0])));
 for(const w of d.wires){if(!w||!available.has(w.a)||!available.has(w.b)||w.a===w.b)return null;}
 return {version:1,placed:d.placed.map(({id,x,y})=>({id,x,y})),wires:d.wires.map(({a,b})=>({a,b})),code:d.code};
}
function strip(code:string){return code.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/[^\n]*/g,'');}
export function studioDelays(code:string){return [...strip(code).matchAll(/delay\(\s*(\d+)\s*\)/g)].map(m=>Number(m[1]));}
const structure=(code:string)=>strip(code).replace(/\s/g,'').replace(/delay\(\d+\)/g,'delay(TIME)');
export function checkStudio(d:StudioDocument,p:CircuitProject):{ok:boolean;message:string}{
 if(!parseStudio(d,p))return {ok:false,message:'Invalid circuit document.'};
 if(d.placed.length!==p.parts.length)return {ok:false,message:'Add every required component before running.'};
 const all=pins(p);
 function network(wires:StudioWire[]){const parent=new Map(all.map(k=>[k,k]));function root(k:string):string{const next=parent.get(k)!;return next===k?k:root(next);}for(const w of wires)parent.set(root(w.a),root(w.b));return root;}
 const actual=network(d.wires),expected=network(p.wires);
 if(['D8','D9','D10'].some(pin=>actual(`uno:${pin}`)===actual('uno:GND')))return {ok:false,message:'Output-to-ground short detected. Check the wires.'};
 for(const a of all)for(const b of all)if((actual(a)===actual(b))!==(expected(a)===expected(b)))return {ok:false,message:'Connections do not match. Check polarity, series resistors and the connection schedule.'};
 if(structure(d.code)!==structure(p.code)||studioDelays(d.code).some(n=>n<50||n>60000))return {ok:false,message:'This preview supports the supplied sketch structure; timing may be changed from 50 to 60000 ms.'};
 return {ok:true,message:'Connections checked. Ready for the supported logic preview.'};
}
