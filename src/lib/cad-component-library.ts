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
];
export function libraryComponent(id:string){return cadLibrary.find(c=>c.id===id);}
export function createLibraryModel(T:any,id:string){
 const c=libraryComponent(id)!;const g=new T.Group();
 const mat=new T.MeshStandardMaterial({color:c.color,roughness:.6});
 const shape=['led','capacitor','pot','buzzer'].includes(id)?new T.CylinderGeometry(c.size[0]/2,c.size[0]/2,c.size[1],24):new T.BoxGeometry(...c.size);
 const body=new T.Mesh(shape,mat);body.position.y=c.size[1]/2;g.add(body);
 const metal=new T.MeshStandardMaterial({color:0xbcc8d2,metalness:.5,roughness:.35});
 c.pins.forEach((_,i)=>{const pin=new T.Mesh(new T.BoxGeometry(.12,.3,.12),metal);pin.position.set((i-(c.pins.length-1)/2)*.25,.15,c.size[2]/2+.2);g.add(pin);});
 if(id==='servo'){const horn=new T.Mesh(new T.BoxGeometry(2,.15,.3),metal);horn.position.y=c.size[1]+.15;g.add(horn);}
 if(id==='hcsr04')for(const x of [-1.3,1.3]){const tube=new T.Mesh(new T.CylinderGeometry(.8,.8,1,20),metal);tube.rotation.x=Math.PI/2;tube.position.set(x,1,1);g.add(tube);}
 if(['uno','esp32','pico','mpu6050','hc05'].includes(id)){const chip=new T.Mesh(new T.BoxGeometry(c.size[0]*.5,.25,c.size[2]*.4),new T.MeshStandardMaterial({color:0x172433}));chip.position.y=c.size[1]+.1;g.add(chip);}
 if(id==='oled'){const screen=new T.Mesh(new T.BoxGeometry(2,.03,1.8),new T.MeshStandardMaterial({color:0x121d30}));screen.position.y=c.size[1]+.02;g.add(screen);}
 return g;
}
