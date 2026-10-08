import {libraryComponent} from './cad-component-library';
import {cadPins,type CADPart} from './robot-cad';

/** Local positions on our representative models; not manufacturer pin dimensions. */
export function cadTerminalPosition(parts:CADPart[],index:number,pin:string):[number,number,number]{
 const part=parts[index],pins=cadPins(parts,index),n=pins.indexOf(pin);
 if(n<0)throw Error('Unknown CAD terminal.');
 const kind=part.kind,component=libraryComponent(kind??'');
 if(kind==='uno'){
  const digital=pin.startsWith('D');
  const slot=digital?Number(pin.slice(1)):pin==='5V'?3:pin==='GND'?4:8;
  return [digital?2.49:-2.49,.6,(slot-6.5)*.254];
 }
 if(kind==='led'||kind==='rgbled'||kind==='capacitor'||kind==='transistor'||kind==='buzzer'||kind==='ldr')return [(n-(pins.length-1)/2)*.22,.08,0];
 if(kind==='resistor'||kind==='diode')return [n===0?-1.4:1.4,.32,0];
 if(kind==='button')return [n===0?-.38:.38,.1,-.2];
 if(kind==='battery')return [3.1,.8,n===0?-.8:.8];
 if(kind==='motor')return [n===0?-.65:.65,1,2.8];
 if(kind==='breadboard')return [pin==='+ rail'?-2.35:-2.1,.8,-3.68];
 if(kind==='pot')return [(n-1)*.3,.08,.6];
 if(kind==='switch')return [(n-1)*.254,.6,0];
 if(kind==='servo')return [.6+n*.1,.15,1.65];
 if(kind==='l298n'){
  if(n<2)return [(n-.5)*.5,.75,-1.65];
  if(n<6)return [(n-3.5)*.254,.6,-2.02];
  return [n<8?-1.6+(n-6.5)*.5:1.6+(n-8.5)*.5,.75,1];
 }
 if(component){
  if(['nano','esp32','pico','stm32','esp32cam'].includes(kind!))return [n<pins.length/2?-component.size[0]/2+.18:component.size[0]/2-.18,.6,(n%Math.ceil(pins.length/2)-2.5)*.254];
  return [(n-(pins.length-1)/2)*.254,.6,-component.size[2]/2+.13];
 }
 // Older robot templates retain schematic terminal locations on their modules.
 return [(n-(pins.length-1)/2)*.4,1,-1];
}
