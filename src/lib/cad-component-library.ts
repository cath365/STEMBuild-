export type LibraryComponent={id:string;name:string;category:string;pins:string[];size:[number,number,number];color:number};
export const cadLibrary:LibraryComponent[]=[
 {id:'uno',name:'Arduino Uno',category:'Controllers',pins:['5V','GND','D2','D4','D5','D6','D7','D8','D9','A0'],size:[5.34,.8,6.86],color:0x16869b},
 {id:'esp32',name:'ESP32 development board',category:'Controllers',pins:['3V3','GND','GPIO2','GPIO4','GPIO18','GPIO19','GPIO21','GPIO22'],size:[2.8,.8,5.2],color:0x263546},
 {id:'pico',name:'Raspberry Pi Pico',category:'Controllers',pins:['3V3','GND','GP0','GP1','GP2','GP3','GP26'],size:[2.1,.5,5.1],color:0x287753},
 {id:'breadboard',name:'Breadboard',category:'Prototyping',pins:['+ rail','− rail'],size:[5.5,.9,8.3],color:0xe4e9ed},
 {id:'led',name:'Red LED',category:'Outputs',pins:['Anode +','Cathode −'],size:[.5,1.8,.5],color:0xc43b43},
 {id:'resistor',name:'Resistor',category:'Passive',pins:['Lead 1','Lead 2'],size:[2.8,.3,.4],color:0xc6ae7e},
 {id:'capacitor',name:'Electrolytic capacitor',category:'Passive',pins:['+','−'],size:[.8,1.4,.8],color:0x244960},
 {id:'button',name:'Push button',category:'Inputs',pins:['A','B'],size:[.6,.6,.6],color:0x364352},
 {id:'pot',name:'Potentiometer',category:'Inputs',pins:['End 1','Wiper','End 2'],size:[1.3,1.5,1.3],color:0x477dab},
 {id:'ldr',name:'Light-dependent resistor',category:'Sensors',pins:['Lead 1','Lead 2'],size:[.8,1.2,.5],color:0xca974c},
 {id:'hcsr04',name:'HC-SR04 ultrasonic sensor',category:'Sensors',pins:['VCC','TRIG','ECHO','GND'],size:[4.5,2,1.4],color:0x168b9c},
 {id:'dht',name:'Temperature/humidity sensor module',category:'Sensors',pins:['VCC','DATA','GND'],size:[2,2.7,1],color:0x4ba8c6},
 {id:'pir',name:'PIR motion sensor module',category:'Sensors',pins:['VCC','OUT','GND'],size:[3.2,2.4,2.4],color:0x418661},
 {id:'mpu6050',name:'MPU6050 module',category:'Sensors',pins:['VCC','GND','SCL','SDA','INT'],size:[2,.5,2],color:0x32609a},
 {id:'servo',name:'Micro servo',category:'Actuators',pins:['Power','GND','Signal'],size:[2.3,2.8,1.2],color:0x437fba},
 {id:'motor',name:'DC geared motor',category:'Actuators',pins:['+','−'],size:[2.2,2.1,6],color:0xe9bd35},
 {id:'l298n',name:'L298N motor driver module',category:'Drivers',pins:['VS','GND','IN1','IN2','IN3','IN4','OUT1','OUT2','OUT3','OUT4'],size:[4.3,2,4.3],color:0xb64035},
 {id:'relay',name:'Relay module',category:'Drivers',pins:['VCC','GND','IN','COM','NO','NC'],size:[2.6,1.8,5],color:0x427bad},
 {id:'buzzer',name:'Buzzer',category:'Outputs',pins:['+','−'],size:[1.2,1,1.2],color:0x25313f},
 {id:'oled',name:'I2C OLED display',category:'Displays',pins:['VCC','GND','SCL','SDA'],size:[2.7,.5,2.7],color:0x264a6c},
 {id:'hc05',name:'HC-05 Bluetooth module',category:'Communications',pins:['VCC','GND','TX','RX','EN','STATE'],size:[1.6,.6,3.7],color:0x33647c},
 {id:'battery',name:'Battery holder',category:'Power',pins:['+','−'],size:[6.5,1.5,3.2],color:0x253242},
 {id:'nano',name:'Arduino Nano',category:'Controllers',pins:['5V','3V3','GND','D2','D3','D9','A0'],size:[1.8,.7,4.5],color:0x197c94},
 {id:'microbit',name:'BBC micro:bit',category:'Controllers',pins:['3V','GND','P0','P1','P2'],size:[5.2,.6,4.3],color:0x233748},
 {id:'esp32cam',name:'ESP32-CAM',category:'Controllers',pins:['5V','3V3','GND','TX','RX','GPIO0'],size:[2.7,1.3,4],color:0x263e45},
 {id:'stm32',name:'STM32 Blue Pill',category:'Controllers',pins:['3V3','GND','PA0','PA1','PB6','PB7'],size:[2.3,.7,5.3],color:0x2a69a1},
 {id:'rgbled',name:'RGB LED',category:'Outputs',pins:['Red','Common','Green','Blue'],size:[.5,1.8,.5],color:0xe7edf0},
 {id:'diode',name:'Rectifier diode',category:'Passive',pins:['Anode','Cathode'],size:[2.8,.3,.4],color:0x252b32},
 {id:'transistor',name:'TO-92 transistor',category:'Passive',pins:['Emitter','Base','Collector'],size:[.6,1.5,.4],color:0x252b32},
 {id:'switch',name:'Slide switch',category:'Inputs',pins:['A','Common','B'],size:[1.2,.8,.5],color:0x53606b},
 {id:'joystick',name:'Joystick module',category:'Inputs',pins:['VCC','GND','VRX','VRY','SW'],size:[3.4,3,2.6],color:0x28744c},
 {id:'ir',name:'Infrared obstacle sensor',category:'Sensors',pins:['VCC','GND','OUT'],size:[1.6,1.2,3.2],color:0x247953},
 {id:'soil',name:'Capacitive soil moisture sensor',category:'Sensors',pins:['VCC','GND','AOUT'],size:[2.2,.5,9.8],color:0x243e42},
 {id:'bmp280',name:'BMP280 pressure sensor module',category:'Sensors',pins:['VCC','GND','SCL','SDA'],size:[1.5,.5,1.2],color:0x376ca9},
 {id:'stepper',name:'28BYJ-48 stepper motor',category:'Actuators',pins:['Common','Coil A','Coil B','Coil C','Coil D'],size:[3.5,2.7,3.5],color:0x909ea8},
 {id:'wheel',name:'Robot wheel',category:'Mechanics',pins:[],size:[6.5,2.6,6.5],color:0x242c32},
 {id:'lcd',name:'16×2 LCD module',category:'Displays',pins:['VCC','GND','RS','EN','D4','D5','D6','D7'],size:[8,.9,3.6],color:0x287847},
 {id:'sevensegment',name:'Seven-segment display',category:'Displays',pins:['Common','A','B','C','D','E','F','G','DP'],size:[1.3,.8,1.9],color:0x1f2931},
 {id:'nrf24',name:'nRF24L01 radio module',category:'Communications',pins:['3V3','GND','CE','CSN','SCK','MOSI','MISO','IRQ'],size:[1.5,.6,2.9],color:0x283d44},
 {id:'buck',name:'LM2596 buck converter',category:'Power',pins:['IN+','IN−','OUT+','OUT−'],size:[2.1,1.4,4.3],color:0x28689a},
];
export function libraryComponent(id:string){return cadLibrary.find(c=>c.id===id);}

/** Representative hardware geometry in centimetres; no external photo/model downloads. */
export function createLibraryModel(T:any,id:string){
 const c=libraryComponent(id);
 if(!c)throw new Error(`Unknown CAD component: ${id}`);
 const g=new T.Group();g.name=c.name;g.userData.componentId=id;
 const materials=new Map<number,any>();
 const material=(color:number)=>{if(!materials.has(color))materials.set(color,new T.MeshStandardMaterial({color,roughness:color===0xbcc5cd?.3:.68,metalness:color===0xbcc5cd?.75:0}));return materials.get(color);};
 const black=0x20262c,metal=0xbcc5cd,gold=0xc8a853,white=0xe5e7df;
 function mesh(geometry:any,color:number,x=0,y=0,z=0){const m=new T.Mesh(geometry,material(color));m.position.set(x,y,z);g.add(m);return m;}
 const box=(w:number,h:number,d:number,color:number,x=0,y=h/2,z=0)=>mesh(new T.BoxGeometry(w,h,d),color,x,y,z);
 const cyl=(r:number,h:number,color:number,x=0,y=h/2,z=0)=>mesh(new T.CylinderGeometry(r,r,h,16),color,x,y,z);
 const sphere=(r:number,color:number,x=0,y=0,z=0)=>mesh(new T.SphereGeometry(r,16,10),color,x,y,z);
 function label(text:string,x:number,y:number,z:number,w:number,d:number,color='#f0f3e9'){
  if(typeof document==='undefined')return;
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=64;
  const ctx=canvas.getContext('2d');if(!ctx)return;
  ctx.clearRect(0,0,256,64);ctx.fillStyle=color;ctx.font='bold 30px monospace';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,128,32,246);
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
  const m=new T.Mesh(new T.PlaneGeometry(w,d),new T.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,side:T.DoubleSide}));m.rotation.x=-Math.PI/2;m.position.set(x,y,z);g.add(m);
 }
 function pins(count:number,x:number,z:number,alongZ=false,female=false){
  for(let i=0;i<count;i++){const a=(i-(count-1)/2)*.254;const px=x+(alongZ?0:a),pz=z+(alongZ?a:0);
   if(female){box(.24,.45,.24,black,px,.32,pz);box(.09,.01,.09,0x070b0e,px,.551,pz);}else{box(.23,.2,.23,black,px,.2,pz);box(.065,.65,.065,gold,px,.26,pz);}
  }
 }
 function pcb(w=c!.size[0],d=c!.size[2]){
  box(w,.16,d,c!.color,0,.08,0);
  for(const x of [-w/2+.22,w/2-.22])for(const z of [-d/2+.22,d/2-.22]){
   const ring=mesh(new T.RingGeometry(.07,.13,12),gold,x,.166,z);ring.rotation.x=-Math.PI/2;
   cyl(.068,.012,black,x,.167,z);
  }
 }
 function chip(w:number,d:number,x=0,z=0){box(w,.2,d,black,x,.28,z);for(const side of [-1,1])for(let i=0;i<6;i++)box(.12,.04,.07,metal,x+side*(w/2+.04),.22,z+(i-2.5)*d/7);}
 function usb(x:number,z:number,w=.8,d=.65){box(w,.38,d,metal,x,.35,z);box(w*.75,.22,.02,black,x,.36,z-d/2-.012);}
 function terminal(count:number,x:number,z:number){box(count*.5,.55,.55,0x317cb1,x,.43,z);for(let i=0;i<count;i++){const px=x+(i-(count-1)/2)*.5;cyl(.12,.03,metal,px,.72,z);box(.16,.03,.2,black,px,.741,z);}}
 function antenna(x:number,z:number){for(let i=0;i<5;i++){box(.08,.01,.65,gold,x+i*.16,.178,z);if(i<4)box(.16,.01,.08,gold,x+i*.16+.08,.178,z+(i%2?.28:-.28));}}
 function leads(n:number){for(let i=0;i<n;i++)box(.07,1,.07,metal,(i-(n-1)/2)*.22,.5,0);}
 function display(w:number,d:number,x=0,y=.24,z=0){box(w,.16,d,black,x,y,z);box(w*.85,.018,d*.72,0x183d4c,x,y+.09,z);}
 const controllers=['uno','nano','esp32','pico','stm32','esp32cam','microbit'];
 if(controllers.includes(id)){
  pcb();const w=c.size[0],d=c.size[2];
  if(id==='microbit'){
   for(let x=0;x<5;x++)for(let z=0;z<5;z++)box(.18,.05,.18,0xa24940,(x-2)*.38,.21,(z-2)*.38);
   for(const x of [-1.9,1.9]){box(.6,.2,.6,metal,x,.3,0);cyl(.19,.2,black,x,.5,0);}
   for(let i=0;i<5;i++){const r=mesh(new T.RingGeometry(.19,.34,16),gold,(i-2)*1,.17,d/2-.4);r.rotation.x=-Math.PI/2;}
   usb(0,-d/2+.3);label('micro:bit',0,.18,-1.3,2,.4);
  }else{
   pins(id==='uno'?14:12,-w/2+.18,0,true,id==='uno');pins(id==='uno'?14:12,w/2-.18,0,true,id==='uno');usb(0,-d/2+.3,id==='uno'?1.1:.75,id==='uno'?1.25:.6);
   chip(w*.4,d*.26,0,.3);
   if(['esp32','esp32cam'].includes(id)){box(w*.7,.13,d*.32,metal,0,.45,.6);label('ESP32',0,.524,.55,w*.6,.4,'#25303a');antenna(-w*.3,d/2-.5);}
   if(id==='esp32cam'){box(1.5,.4,1.5,black,0,.67,-.4);cyl(.48,.38,black,0,1.02,-.4);cyl(.3,.03,0x263955,0,1.22,-.4);}
   if(id==='uno'){box(.9,.65,1.2,black,-1.3,.48,-d/2+.6);label('UNO',0,.18,2,1.8,.65);}
   else label(id==='stm32'?'STM32':id.toUpperCase(),0,.18,-d*.28,w*.7,.4);
   box(.16,.12,.22,0x75985a,w*.25,.23,-.8);
  }
 }else if(id==='breadboard'){
  box(5.5,.75,8.3,white);box(.2,.018,6.5,0x7c898b,0,.762,0);
  // One instanced draw call for the recessed hole markers, including power rails.
  const holes=new T.InstancedMesh(new T.BoxGeometry(.105,.02,.105),material(0x515c61),420);let index=0;const matrix=new T.Matrix4();
  for(let row=0;row<30;row++)for(const x of [-2.35,-2.1,-1.5,-1.25,-1,-.75,-.5,.5,.75,1,1.25,1.5,2.1,2.35]){matrix.makeTranslation(x,.764,(row-14.5)*.254);holes.setMatrixAt(index++,matrix);}g.add(holes);
  for(const side of [-1,1]){box(.025,.015,7.6,0xbb4147,side*2.48,.769,0);box(.025,.015,7.6,0x386fa4,side*1.94,.769,0);}label('BREADBOARD',0,.77,3.8,3,.3,'#4b5860');
 }else if(['led','rgbled'].includes(id)){
  leads(id==='rgbled'?4:2);cyl(.25,.55,c.color,0,1.25);sphere(.25,c.color,0,1.53);cyl(.29,.08,c.color,0,.99);
 }else if(['resistor','diode'].includes(id)){
  const body=cyl(.19,1.15,id==='resistor'?0xd2b681:black,0,.32);body.rotation.z=Math.PI/2;
  for(const x of [-.95,.95]){const lead=cyl(.035,.9,metal,x,.32);lead.rotation.z=Math.PI/2;}
  const bands=id==='resistor'?[0xd46e22,0xd46e22,0x674530,gold]:[metal];bands.forEach((color,i)=>{const band=cyl(.194,.095,color,(i-(bands.length-1)/2)*.23,.32);band.rotation.z=Math.PI/2;});
 }else if(id==='capacitor'){
  leads(2);cyl(.4,1.2,c.color,0,.8);cyl(.38,.03,metal,0,1.415);box(.6,.012,.04,black,0,1.435);box(.04,.012,.6,black,0,1.435);box(.08,1,.07,white,.36,.85,0);
 }else if(id==='transistor'){
  leads(3);box(.5,.5,.35,black,0,1.2);label('NPN',0,1.454,0,.4,.18);
 }else if(id==='ldr'){
  leads(2);const disc=cyl(.4,.15,0xcba251,0,1.1);disc.rotation.x=Math.PI/2;
  for(let i=0;i<5;i++)box(.45,.028,.02,0x695241,0,.91+i*.095,.086);
 }else if(id==='button'){
  box(.6,.3,.6,metal);cyl(.19,.25,black,0,.43);for(const x of [-.38,.38])for(const z of [-.2,.2])box(.12,.2,.07,metal,x,.1,z);
 }else if(id==='pot'){
  cyl(.6,.55,metal,0,.4);cyl(.18,.85,metal,0,1.05);for(let i=0;i<3;i++)box(.11,.5,.1,metal,(i-1)*.3,.3,.6);
 }else if(id==='switch'){
  box(1.2,.4,.5,metal);box(.9,.03,.25,black,0,.415);box(.3,.35,.25,black,.2,.59);pins(3,0,0);
 }else if(id==='buzzer'){
  leads(2);cyl(.6,.85,black,0,.8);cyl(.12,.012,0x070a0b,0,1.235);label('+',.33,1.24,0,.22,.2);
 }else if(id==='servo'){
  box(2.3,2.1,1.2,c.color);box(2.9,.15,.5,c.color,0,1.55);cyl(.43,.55,c.color,-.65,2.28);cyl(.16,.3,white,-.65,2.69);box(2,.13,.32,white,-.65,2.88);for(const x of [-1.2,-.9,-.4,0])cyl(.035,.015,black,x,2.953);
  for(let i=0;i<3;i++)box(.08,.12,1.2,[0x745039,0xc34b3e,0xd6b638][i],.6+i*.1,.15,1.05);label('MICRO SERVO',0,2.11,0,1.8,.4);
 }else if(id==='motor'){
  box(2.2,1.8,3.2,0xe0b736,0,1,-1);const can=cyl(.9,2.5,metal,0,1,1.4);can.rotation.x=Math.PI/2;const axle=cyl(.16,2.9,white,0,1,-1);axle.rotation.z=Math.PI/2;
  for(const x of [-.65,.65])box(.14,.25,.25,metal,x,1,2.8);label('TT MOTOR',0,1.91,-1,1.7,.5,'#443c24');
 }else if(id==='stepper'){
  cyl(1.4,1.9,metal);box(3.5,.15,.6,metal,0,.2);cyl(.25,.7,metal,0,2.25,.45);box(1.2,1.2,.5,0x3c6d8d,0,.65,-1.3);for(let i=0;i<5;i++)box(.06,.08,1,[0x924138,0x3679ab,0xb65b90,0xd7bd43,0x854a3c][i],(i-2)*.1,.2,-2);label('28BYJ-48',0,1.96,-.5,1.8,.4,'#24333b');
 }else if(id==='wheel'){
  cyl(3.25,2.2,black);cyl(2.35,.12,0xe2ba3a,0,2.25);cyl(.45,.16,metal,0,2.38);
  for(let i=0;i<20;i++){const a=i*Math.PI/10;const tread=box(.35,2.25,.22,0x394047,Math.sin(a)*3.22,1.12,Math.cos(a)*3.22);tread.rotation.y=a;}
  for(let i=0;i<6;i++){const a=i*Math.PI/3;cyl(.35,.02,black,Math.sin(a)*1.5,2.32,Math.cos(a)*1.5);}
 }else{
  pcb();const w=c.size[0],d=c.size[2];pins(Math.min(c.pins.length,8),0,-d/2+.13);
  if(id==='hcsr04'){
   for(const x of [-1.3,1.3]){const outer=cyl(.78,1.15,metal,x,.95,.2);outer.rotation.x=Math.PI/2;const opening=cyl(.64,.03,black,x,.95,.79);opening.rotation.x=Math.PI/2;for(let i=-2;i<=2;i++)box(1.05,.03,.015,metal,x,.95+i*.18,.81);}label('HC-SR04',0,.17,-.4,1.7,.3);
  }else if(id==='dht'){
   box(1.4,2.4,.85,0x499ebe,0,1.36,.1);for(let i=0;i<6;i++)box(1.12,.14,.02,0x204f69,0,.43+i*.34,.54);
  }else if(id==='pir'){
   cyl(1.12,.4,white,0,.48);mesh(new T.SphereGeometry(1.13,16,8,0,Math.PI*2,0,Math.PI/2),white,0,.65);box(.6,.35,.5,0xc89e34,1,.4,-.5);
  }else if(['mpu6050','bmp280'].includes(id)){
   chip(id==='bmp280'?.45:.7,id==='bmp280'?.45:.7);if(id==='bmp280'){box(.42,.03,.42,metal,0,.41);cyl(.025,.01,black,.1,.431,.1);}label(id==='mpu6050'?'GY-521':'BMP280',0,.17,.4,w*.8,.27);
  }else if(id==='l298n'){
   box(2.2,1.4,1,black,0,.86,0);for(let i=0;i<8;i++)box(.12,1.7,1.3,black,(i-3.5)*.28,1.1,0);terminal(3,0,-1.65);terminal(2,-1.6,1);terminal(2,1.6,1);for(const x of [-.85,.85]){cyl(.27,.7,0x343c43,x,.52,1.3);cyl(.26,.02,metal,x,.88,1.3);}label('L298N',0,.17,1.8,1.2,.3);
  }else if(id==='relay'){
   box(1.6,1.4,1.9,0x2b76ba,0,.9,.2);terminal(3,0,d/2-.35);label('RELAY',0,1.61,.2,1.3,.4);
  }else if(['oled','lcd'].includes(id)){
   display(w*.88,d*.76,0,.4,.2);label(id==='oled'?'STEMBuild':'STEMBuild  IoT',0,.492,.1,w*.68,.4,'#65cbd9');if(id==='lcd'){label('READY',0,.492,.8,2,.3,'#65cbd9');for(const x of [-3.1,3.1])box(.15,.02,1.8,metal,x,.5,.2);}
  }else if(id==='sevensegment'){
   box(1.3,.6,1.9,black,0,.5);for(const z of [-.6,0,.6])box(.55,.025,.12,0xbc4540,0,.813,z);for(const x of [-.32,.32])for(const z of [-.3,.3])box(.12,.025,.48,0xbc4540,x,.813,z);cyl(.07,.03,0xbc4540,.46,.813,.68);
  }else if(['hc05','nrf24'].includes(id)){
   chip(w*.45,d*.3,0,-.1);antenna(-w*.3,d/2-.4);label(id==='hc05'?'HC-05':'nRF24L01',0,.17,-.75,w*.85,.3);
  }else if(id==='battery'){
   box(6.5,.3,3.2,black);for(const x of [-3.1,3.1])box(.2,1.2,3.2,black,x,.75);for(const z of [-1.6,1.6])box(6.5,1.2,.15,black,0,.75,z);
   for(const z of [-.8,.8]){const cell=cyl(.67,5.4,0x507556,0,.85,z);cell.rotation.z=Math.PI/2;const cap=cyl(.66,.15,metal,2.72,.85,z);cap.rotation.z=Math.PI/2;label('1.5V',0,1.53,z,1.6,.3);}
  }else if(id==='joystick'){
   box(2,1,1.7,metal,0,.7);cyl(.22,.8,black,0,1.5);cyl(1,.35,black,0,2.08);sphere(.95,black,0,2.18);label('X  Y',0,.17,1,w*.6,.3);
  }else if(id==='ir'){
   for(const x of [-.4,.4]){cyl(.24,.5,x<0?0xe2e5dd:black,x,.42,1);sphere(.24,x<0?0xe2e5dd:black,x,.67,1);}box(.65,.4,.55,0x347fb8,0,.4,0);chip(.4,.6,0,-.7);
  }else if(id==='soil'){
   box(1.75,.012,5.6,0xaca647,0,.17,1.8);box(1.25,.015,5.2,c.color,0,.18,1.8);chip(.4,.6,0,-2.7);label('CAPACITIVE',0,.17,-1.8,1.8,.3);
  }else if(id==='buck'){
   cyl(.57,.6,0x5c6771,0,.48,.35);cyl(.41,.03,0xbb8040,0,.8,.35);for(const z of [-1.4,1.4]){cyl(.33,.8,black,-.55,.56,z);cyl(.31,.025,metal,-.55,.974,z);}box(.65,.7,.6,0x2e82b5,.45,.52,-.9);chip(.6,.65,.5,.95);label('LM2596',0,.17,1.8,1.4,.3);
  }
 }
 return g;
}
