export type Obstacle = { id: number; x: number; z: number; size: number };
export type RobotState = { x: number; z: number; heading: number; distance: number; action: 'Forward' | 'Avoiding' | 'Collision stopped' };
export const initialRobot: RobotState = { x: 0, z: 65, heading: Math.PI, distance: 100, action: 'Forward' };
export const robotParts = ['Arduino Uno', 'Robot chassis', 'Two geared motors', 'Two wheels and caster', 'L298N motor driver', 'HC-SR04 ultrasonic sensor', 'Motor battery pack'] as const;
export const robotWires = [
  'HC-SR04 VCC → Uno 5V; GND → Uno GND',
  'HC-SR04 TRIG → D9; ECHO → D8',
  'L298N IN1 / IN2 → D4 / D5',
  'L298N IN3 / IN4 → D6 / D7',
  'Left motor → OUT1 / OUT2; right motor → OUT3 / OUT4',
  'Motor supply → driver supply; all grounds connected; ENA / ENB enabled',
] as const;
export function rayDistance(x:number,z:number,heading:number,blocks:Obstacle[]) {
  const dx=Math.sin(heading), dz=Math.cos(heading);
  let nearest=200;
  const boxes=[...blocks.map(b=>({minX:b.x-b.size/2,maxX:b.x+b.size/2,minZ:b.z-b.size/2,maxZ:b.z+b.size/2})),
    {minX:-105,maxX:-100,minZ:-105,maxZ:105},{minX:100,maxX:105,minZ:-105,maxZ:105},
    {minX:-105,maxX:105,minZ:-105,maxZ:-100},{minX:-105,maxX:105,minZ:100,maxZ:105}];
  for(const b of boxes){
    let lo=0,hi=Infinity;
    for(const [p,d,min,max] of [[x,dx,b.minX,b.maxX],[z,dz,b.minZ,b.maxZ]]){
      if(Math.abs(d)<1e-8){if(p<min||p>max){hi=-1;break;}}
      else{const a=(min-p)/d,c=(max-p)/d;lo=Math.max(lo,Math.min(a,c));hi=Math.min(hi,Math.max(a,c));}
    }
    if(hi>=lo&&lo>=0)nearest=Math.min(nearest,lo);
  }
  return nearest;
}
export function collides(x:number,z:number,blocks:Obstacle[]){
  return Math.abs(x)>90||Math.abs(z)>90||blocks.some(b=>Math.abs(x-b.x)<b.size/2+10&&Math.abs(z-b.z)<b.size/2+10);
}
/** Reposition an arena obstacle without hiding a physical collision or allowing overlap. */
export function repositionObstacle(blocks:Obstacle[],id:number,x:number,z:number,robot:RobotState):Obstacle[]{
 if(!Number.isFinite(x)||!Number.isFinite(z)||!blocks.some(block=>block.id===id))return blocks;
 const nextX=Math.max(-78,Math.min(78,x)),nextZ=Math.max(-78,Math.min(78,z));
 if(collides(robot.x,robot.z,[{id,x:nextX,z:nextZ,size:22}]))return blocks;
 if(blocks.some(block=>block.id!==id&&Math.abs(block.x-nextX)<23&&Math.abs(block.z-nextZ)<23))return blocks;
 return blocks.map(block=>block.id===id?{...block,x:nextX,z:nextZ}:block);
}

export function stepRobot(s:RobotState,blocks:Obstacle[],dt:number,threshold:number):RobotState{
  dt=Math.min(Math.max(dt,0),.05);
  const distance=rayDistance(s.x+Math.sin(s.heading)*10,s.z+Math.cos(s.heading)*10,s.heading,blocks);
  if(distance<threshold)return {...s,distance,heading:s.heading+dt*1.8,action:'Avoiding'};
  const x=s.x+Math.sin(s.heading)*22*dt,z=s.z+Math.cos(s.heading)*22*dt;
  if(collides(x,z,blocks))return {...s,distance,heading:s.heading+dt*1.8,action:'Collision stopped'};
  return {...s,x,z,distance,action:'Forward'};
}
export function robotSketch(threshold:number){return `// STEMBuild obstacle robot: fixed-speed L298N with ENA/ENB enabled.
// Check motor direction with wheels lifted before a floor test.
const int TRIG=9, ECHO=8, IN1=4, IN2=5, IN3=6, IN4=7;
const int STOP_CM=${threshold};
void motors(bool a,bool b,bool c,bool d){
  digitalWrite(IN1,a); digitalWrite(IN2,b); digitalWrite(IN3,c); digitalWrite(IN4,d);
}
void setup(){
  pinMode(TRIG,OUTPUT); pinMode(ECHO,INPUT);
  pinMode(IN1,OUTPUT); pinMode(IN2,OUTPUT); pinMode(IN3,OUTPUT); pinMode(IN4,OUTPUT);
}
void loop(){
  digitalWrite(TRIG,LOW); delayMicroseconds(2);
  digitalWrite(TRIG,HIGH); delayMicroseconds(10); digitalWrite(TRIG,LOW);
  unsigned long pulse=pulseIn(ECHO,HIGH,25000);
  float cm=pulse*0.0343/2;
  if(pulse==0){ motors(LOW,LOW,LOW,LOW); delay(50); return; }
  if(cm<STOP_CM){ motors(LOW,HIGH,HIGH,LOW); }
  else { motors(HIGH,LOW,HIGH,LOW); }
  delay(20);
}
`;}
