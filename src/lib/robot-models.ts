// Dimensions are centimetres. Uno PCB footprint follows Arduino's published
// 68.6 x 53.4 mm specification. Other models represent generic kit hardware.
export function createRobotModels(T:any,car:any){
 const material=(color:number,metalness=0)=>new T.MeshStandardMaterial({color,metalness,roughness:metalness?.35:.7});
 function box(parent:any,w:number,h:number,d:number,color:number,x=0,y=0,z=0){const m=new T.Mesh(new T.BoxGeometry(w,h,d),material(color));m.position.set(x,y,z);parent.add(m);return m;}
 function cylinder(parent:any,r:number,h:number,color:number,x:number,y:number,z:number,axis='y'){const m=new T.Mesh(new T.CylinderGeometry(r,r,h,24),material(color,.4));if(axis==='x')m.rotation.z=Math.PI/2;if(axis==='z')m.rotation.x=Math.PI/2;m.position.set(x,y,z);parent.add(m);return m;}
 function label(parent:any,text:string,x:number,y:number,z:number,width=5){const canvas=document.createElement('canvas');canvas.width=512;canvas.height=96;const c=canvas.getContext('2d')!;c.fillStyle='#f5f9ff';c.fillRect(0,0,512,96);c.fillStyle='#162b40';c.font='bold 38px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(text,256,48);const tex=new T.CanvasTexture(canvas);const sprite=new T.Sprite(new T.SpriteMaterial({map:tex,depthTest:false}));sprite.scale.set(width,width*96/512,1);sprite.position.set(x,y,z);parent.add(sprite);}
 const chassis=new T.Group();car.add(chassis);box(chassis,17,.3,25,0xd0b679,0,6.8,0);
 for(const x of [-6.5,6.5])for(const z of [-9,0,9]){cylinder(chassis,.24,.6,0x8996a3,x,7,z);box(chassis,1.2,.06,.15,0x596574,x,7.32,z);}
 const uno=new T.Group();car.add(uno);uno.position.set(0,7.5,-4);box(uno,5.34,.16,6.86,0x16869b);
 box(uno,1.2,1.1,1.6,0xcbd2d9,-1.65,.65,-3.2);box(uno,.9,.9,1.2,0x202a36,1.5,.55,-3);
 box(uno,1,.35,3.4,0x202630,.4,.3,.4);box(uno,.8,.15,1,0xc7cdd3,-1,.25,-.9);
 for(const x of [-2.25,2.25])for(let i=0;i<8;i++){box(uno,.35,.7,.3,0x182331,x,.45,-1.6+i*.4);box(uno,.14,.04,.14,0xc6a760,x,.82,-1.6+i*.4);}
 box(uno,.45,.3,.45,0xb54840,-1.7,.32,2.5);label(uno,'UNO R3',0,1.4,0,3.5);label(uno,'D4 D5 D6 D7 · D8 D9',0,2.2,2.8,6);
 const driver=new T.Group();car.add(driver);driver.position.set(0,7.5,4);box(driver,4.3,.18,4.3,0xb64035);
 box(driver,2.6,1.7,.7,0x26303d,0,1.1,-1);for(let x=-1.2;x<=1.2;x+=.3)box(driver,.12,1.4,1.4,0x101b28,x,1.15,-.6);
 for(const x of [-1.65,1.65]){box(driver,.7,.65,1.6,0x287ccd,x,.5,.5);for(const z of [.1,.8])cylinder(driver,.13,.07,0xd1d7dc,x,.87,z);}
 box(driver,1.9,.65,.65,0x287ccd,0,.5,1.7);for(const x of [-.65,0,.65])cylinder(driver,.13,.07,0xd1d7dc,x,.87,1.7);
 for(const x of [-.9,-.3,.3,.9])box(driver,.14,.65,.14,0xd2bd83,x,.45,-1.85);
 label(driver,'L298N · IN1–IN4',0,2.7,0,5);label(driver,'OUT1/2       OUT3/4',0,1.3,2.3,5);
 const battery=new T.Group();car.add(battery);battery.position.set(0,7.3,-9.5);box(battery,6.5,.6,3.2,0x253242);
 for(const z of [-.7,.7]){cylinder(battery,.62,5.7,0x477559,0,.85,z,'x');cylinder(battery,.35,.15,0xd4d8d9,2.9,.85,z,'x');}label(battery,'BATTERY · generic holder',0,2,0,5);
 const sensor=new T.Group();car.add(sensor);sensor.position.set(0,8,12);box(sensor,4.5,2,.18,0x168b9c,0,1,0);
 for(const x of [-1.3,1.3]){cylinder(sensor,.8,1.1,0xcbd2d6,x,1,.6,'z');cylinder(sensor,.65,.06,0x697682,x,1,1.18,'z');for(let i=-2;i<=2;i++)box(sensor,1.05,.035,.02,0xc4cdd5,x,1+i*.19,1.23);}
 for(const x of [-.6,-.2,.2,.6])box(sensor,.08,.9,.08,0xd5bd79,x,-.4,0);label(sensor,'HC-SR04 · VCC TRIG ECHO GND',0,3,0,8);
 const wheels=new T.Group();car.add(wheels);
 for(const x of [-10,10]){cylinder(wheels,3.3,2.4,0x202b38,x,3.3,0,'x');cylinder(wheels,2.4,2.5,0xe0b535,x,3.3,0,'x');cylinder(wheels,.55,2.65,0x64717b,x,3.3,0,'x');}
 cylinder(wheels,1.1,1.1,0xb8c1ca,0,1.2,-9);box(wheels,2,.25,2,0x8b9aaa,0,3.2,-9);
 const motors=new T.Group();car.add(motors);
 for(const x of [-7,7]){box(motors,2.2,2.1,5.5,0xe9bd35,x,3.3,0);cylinder(motors,.85,2.7,0xc1c8cf,x,3.3,-3.7,'z');cylinder(motors,.3,3,0xd4dde5,x,3.3,0,'x');for(const dx of [-.5,.5])box(motors,.12,.12,.55,0xc1a56b,x+dx,3.3,-5.25);}
 return [chassis,uno,driver,battery,sensor,wheels,motors];
}
