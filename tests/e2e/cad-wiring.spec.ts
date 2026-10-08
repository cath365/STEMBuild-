import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {cadTerminalPosition} from '../../src/lib/cad-terminals';
import type {CADPart} from '../../src/lib/robot-cad';

test('CAD wiring and run controls stay beside the canvas; 3D cable dragging runs a checked LED circuit',async({page})=>{
 test.skip(!process.env.TEST_THREE_BUNDLES,'Requires Three.js bundles and WebGL');
 const root=process.env.TEST_THREE_BUNDLES!;const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://esm.sh/three@0.180.0',async r=>r.fulfill({contentType:'text/javascript',body:await readFile(`${root}/three.js`,'utf8')}));
 for(const [name,file] of [['OrbitControls','orbit'],['TransformControls','transform']])await page.route(`https://esm.sh/three@0.180.0/examples/jsm/controls/${name}.js`,async r=>r.fulfill({contentType:'text/javascript',body:await readFile(`${root}/${file}.js`,'utf8')}));
 await page.setViewportSize({width:1366,height:768});await page.goto('/3d-lab');await page.getByRole('tab',{name:/CAD Workspace/}).click();const cad=page.locator('#robot-cad');
 for(const name of ['Arduino Uno','Resistor','Red LED']){await cad.getByLabel('Search components').fill(name);await cad.getByRole('button',{name:`Add ${name}`,exact:true}).click();}
 await cad.getByRole('button',{name:'Launch CAD workspace',exact:true}).click();const canvas=cad.locator('canvas');await expect(canvas).toHaveAttribute('data-cad-selection','Red LED #3');
 const box=await canvas.boundingBox();expect(box!.height).toBeGreaterThan(140);expect(box!.y+box!.height).toBeLessThanOrEqual(768);
 const run=cad.getByRole('button',{name:'Run circuit preview',exact:true});expect((await run.boundingBox())!.y).toBeLessThan(600);await expect(run).toBeDisabled();
 await cad.getByRole('button',{name:'Wire mode',exact:true}).click();await expect(canvas).toHaveAttribute('data-cad-terminals','14');await cad.getByRole('button',{name:'Top view',exact:true}).click();
 const parts:CADPart[]=['uno','resistor','led'].map((kind,i)=>({kind,offset:[i*7,0,0],rotation:[0,0,0],visible:true}));
 const rect=(await canvas.boundingBox())!;
 function screen(index:number,pin:string){const [x,y,z]=cadTerminalPosition(parts,index,pin);const scale=rect.height/(2*Math.tan(21*Math.PI/180)*(65-y));return {x:rect.x+rect.width/2+(x+index*7)*scale,y:rect.y+rect.height/2+z*scale};}
 const a=screen(0,'D8'),b=screen(1,'Lead 1');await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y,{steps:8});await page.mouse.up();await expect(canvas).toHaveAttribute('data-cad-wires','1');
 // Blank releases do not commit a cable or leave orbit controls disabled.
 await page.mouse.move(b.x,b.y);await page.mouse.down();await page.mouse.move(rect.x+20,rect.y+20,{steps:5});await page.mouse.up();await expect(canvas).toHaveAttribute('data-cad-wires','1');
 await cad.getByLabel('CAD wiring component').selectOption('1');await cad.getByRole('button',{name:'Lead 2',exact:true}).click();await cad.getByLabel('CAD wiring component').selectOption('2');await cad.getByRole('button',{name:'Anode +',exact:true}).click();
 await cad.getByRole('button',{name:'Cathode −',exact:true}).click();await cad.getByLabel('CAD wiring component').selectOption('0');await cad.getByRole('button',{name:'GND',exact:true}).click();await expect(canvas).toHaveAttribute('data-cad-wires','3');
 await run.click();await expect(cad).toContainText('LED ON · preview running');await expect(canvas).toHaveAttribute('data-cad-led','on');
 await page.screenshot({path:'/tmp/stembuild-cad-wired.png',fullPage:false});
 await cad.getByRole('button',{name:'Stop circuit preview',exact:true}).click();await expect(canvas).toHaveAttribute('data-cad-led','off');
 await page.reload();await page.getByRole('tab',{name:/CAD Workspace/}).click();await expect(cad.locator('.robot-wire-list')).toContainText('Arduino Uno #1 D8');await expect(run).toBeEnabled();expect(errors).toEqual([]);
});

test('phone CAD example runs, clearing is undoable and unsupported assemblies stay stopped',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/3d-lab');await page.getByRole('tab',{name:/CAD Workspace/}).click();const cad=page.locator('#robot-cad');
 await cad.getByRole('button',{name:'Load LED circuit example',exact:true}).click();await expect(cad.locator('.robot-wire-list')).toContainText('Arduino Uno #1 D8');await cad.getByRole('button',{name:'Run circuit preview',exact:true}).click();await expect(cad).toContainText('LED ON · preview running');
 await cad.getByRole('button',{name:'New empty project',exact:true}).click();await expect(cad).toContainText('LED OFF · preview stopped');await cad.getByRole('button',{name:'Undo CAD edit',exact:true}).click();await expect(cad).toContainText('Assembly tree (3/100)');
 await cad.getByLabel('Search components').fill('DC geared motor');await cad.getByRole('button',{name:'Add DC geared motor',exact:true}).click();await expect(cad.getByRole('button',{name:'Run circuit preview',exact:true})).toBeDisabled();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});
