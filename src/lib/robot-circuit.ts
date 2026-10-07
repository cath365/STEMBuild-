export type RobotWire = {from:string;to:string};
export const robotMounts=[
 {name:'Arduino Uno',x:145,y:105,pins:['5V','GND','D4','D5','D6','D7','D8','D9']},
 {name:'Robot chassis',x:200,y:155,pins:[]},
 {name:'Two geared motors',x:75,y:155,pins:['L+','L−','R+','R−']},
 {name:'Two wheels and caster',x:325,y:155,pins:[]},
 {name:'L298N motor driver',x:255,y:105,pins:['VS','GND','IN1','IN2','IN3','IN4','OUT1','OUT2','OUT3','OUT4']},
 {name:'HC-SR04 ultrasonic sensor',x:200,y:40,pins:['VCC','GND','TRIG','ECHO']},
 {name:'Motor battery pack',x:200,y:235,pins:['+','−']},
];
export const terminal=(part:number,pin:string)=>`${part}:${pin}`;
export const requiredRobotNets:[string,string][]=[
 ['0:5V','5:VCC'],['0:GND','5:GND'],['0:D9','5:TRIG'],['0:D8','5:ECHO'],
 ['0:D4','4:IN1'],['0:D5','4:IN2'],['0:D6','4:IN3'],['0:D7','4:IN4'],
 ['4:OUT1','2:L+'],['4:OUT2','2:L−'],['4:OUT3','2:R+'],['4:OUT4','2:R−'],
 ['6:+','4:VS'],['6:−','4:GND'],['0:GND','4:GND'],
];
export function validateRobotCircuit(wires:RobotWire[]){
 const all=robotMounts.flatMap((p,i)=>p.pins.map(pin=>terminal(i,pin)));
 const parent=new Map(all.map(p=>[p,p]));
 const root=(p:string):string=>{const q=parent.get(p)!;if(q===p)return p;const r=root(q);parent.set(p,r);return r;};
 const errors:string[]=[];
 for(const w of wires){if(!parent.has(w.from)||!parent.has(w.to)){errors.push('Unknown terminal in wiring.');continue;}parent.set(root(w.from),root(w.to));}
 const connected=(a:string,b:string)=>root(a)===root(b);
 const grounds=['0:GND','5:GND','4:GND','6:−'];
 if(grounds.some(g=>connected('0:5V',g)))errors.push('Short circuit: Uno 5V is connected to ground.');
 if(grounds.some(g=>connected('6:+',g)))errors.push('Short circuit: motor battery positive is connected to ground.');
 if(connected('0:5V','6:+'))errors.push('Motor battery supply must remain separate from Uno 5V.');
 // Each required group is an allowed electrical net. Reject cross-net bridges,
 // including swapped pins, GPIO-to-power links and shorted motor outputs.
 const allowed=new Map(all.map(p=>[p,p]));
 const ar=(p:string):string=>allowed.get(p)===p?p:ar(allowed.get(p)!);
 for(const [a,b]of requiredRobotNets)allowed.set(ar(a),ar(b));
 for(const w of wires)if(allowed.has(w.from)&&allowed.has(w.to)&&ar(w.from)!==ar(w.to))errors.push(`Incorrect connection: ${w.from} → ${w.to}. Follow the labelled pin map.`);
 const missing=requiredRobotNets.filter(([a,b])=>!connected(a,b));
 return {ok:!errors.length&&!missing.length,errors:[...new Set(errors)],missing};
}
export function terminalLabel(id:string){const [i,pin]=id.split(':');return `${robotMounts[Number(i)]?.name??'Unknown'} ${pin}`;}
