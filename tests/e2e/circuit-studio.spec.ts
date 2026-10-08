import {test,expect} from '@playwright/test';
test('build and wire from zero; dragging stops preview and saves restore',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/3d-lab');const studio=page.getByRole('region',{name:'Circuit project studio'});
 await studio.getByRole('button',{name:/^LED blink/}).click();await expect(studio).toContainText('Your workbench is empty.');
 for(const name of ['Arduino Uno','330 Ω resistor','Red LED'])await studio.getByRole('button',{name:new RegExp(`^${name}\\s*Add to workbench`)}).click();
 async function wire(a:string,b:string){await studio.getByRole('button',{name:`Connect ${a}`,exact:true}).click();await studio.getByRole('button',{name:`Connect ${b}`,exact:true}).press('Enter');}
 await wire('Arduino Uno D8','330 Ω resistor Lead 1');await wire('330 Ω resistor Lead 2','Red LED Anode +');await wire('Red LED Cathode −','Arduino Uno GND');
 await studio.getByRole('button',{name:'Run logic preview',exact:true}).click();await expect(studio.locator('.cs-output')).toHaveText('LED ON');
 const hardware=studio.locator('.cs-canvas-scroll svg image').first();await hardware.scrollIntoViewIfNeeded();const box=await hardware.boundingBox();if(!box)throw Error('Missing component');await page.mouse.move(box.x+40,box.y+40);await page.mouse.down();await page.mouse.move(box.x+70,box.y+70,{steps:5});await page.mouse.up();await expect(studio.locator('.cs-output')).toHaveText('Preview stopped');await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('stembuild-circuit-studio-v1')!).documents.blink.placed[0].x)).toBeGreaterThan(35);
 await studio.getByRole('button',{name:'Remove circuit wire 1',exact:true}).click();await expect(studio.getByRole('button',{name:'Run logic preview',exact:true})).toBeDisabled();await page.reload();await expect(studio).toContainText('3/3 parts · 2 wires');expect(errors).toEqual([]);
 await page.screenshot({path:'/tmp/circuit-studio-desktop.png',fullPage:true});
});
test('all five project examples run; button input works and phone has no page overflow',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/3d-lab');const studio=page.getByRole('region',{name:'Circuit project studio'});
 for(const name of ['Battery LED','LED blink','Push-button light','Traffic lights','Button alarm']){
  await studio.getByRole('button',{name:new RegExp(`^${name}`)}).click();await studio.getByRole('button',{name:'Load circuit example',exact:true}).click();await studio.getByRole('button',{name:'Run logic preview',exact:true}).click();
  if(name==='Push-button light'||name==='Button alarm'){await studio.getByRole('button',{name:'Press test button',exact:true}).click();await expect(studio.locator('.cs-output')).toHaveText(name==='Button alarm'?'Piezo ACTIVE (visual preview)':'LED ON');}else await expect(studio.locator('.cs-output')).toHaveText(name==='Traffic lights'?'Red light ON':'LED ON');
  await studio.getByRole('button',{name:'Stop logic preview',exact:true}).click();await expect(studio.locator('.cs-output')).toHaveText('Preview stopped');
 }
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);const download=page.waitForEvent('download');await studio.getByRole('button',{name:'Download circuit sketch',exact:true}).click();expect((await download).suggestedFilename()).toBe('alarm.ino');await page.screenshot({path:'/tmp/circuit-studio-mobile.png',fullPage:true});
});
test('drag cables to battery and LED terminals; blank drops cancel; laptop workspace uses its width',async({page})=>{
 await page.setViewportSize({width:1440,height:900});await page.goto('/3d-lab');const studio=page.getByRole('region',{name:'Circuit project studio'});await studio.getByRole('button',{name:/^Battery LED/}).click();
 for(const name of ['2 × AA battery holder (3 V)','330 Ω resistor','Red LED'])await studio.locator('.cs-part').filter({hasText:name}).click();
 await studio.getByLabel('Cable colour',{exact:true}).selectOption('teal');
 const pin=(name:string)=>studio.getByRole('button',{name:`Connect ${name}`,exact:true}).locator('circle').first();
 async function drag(a:string,b?:string){const source=pin(a);await source.scrollIntoViewIfNeeded();const start=await source.boundingBox();const end=b?await pin(b).boundingBox():null;if(!start||(b&&!end))throw Error('Missing terminal');await page.mouse.move(start.x+start.width/2,start.y+start.height/2);await page.mouse.down();await page.mouse.move(start.x+45,start.y+60,{steps:3});await expect(studio.locator('.cs-cable-preview')).toBeVisible();await page.mouse.move(end?end.x+end.width/2:start.x+70,end?end.y+end.height/2:start.y+180,{steps:8});await page.mouse.up();}
 await drag('Red LED Anode +');await expect(studio).toContainText('3/3 parts · 0 wires');
 await drag('Red LED Anode +','330 Ω resistor Lead 2');await drag('330 Ω resistor Lead 1','2 × AA battery holder (3 V) +');await drag('Red LED Cathode −','2 × AA battery holder (3 V) −');
 await expect(studio).toContainText('3/3 parts · 3 wires');await studio.getByRole('button',{name:'Run logic preview',exact:true}).click();await expect(studio.locator('.cs-output')).toHaveText('LED ON');
 const width=await page.locator('#workbench').boundingBox();expect(width!.width).toBeGreaterThan(1380);const bench=await studio.locator('.cs-layout').boundingBox(),tools=await studio.locator('.cs-test-code').boundingBox();expect(tools!.x).toBeGreaterThanOrEqual(bench!.x+bench!.width-1);
 await page.reload();await expect(studio).toContainText('3/3 parts · 3 wires');expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('stembuild-circuit-studio-v1')!).documents.battery.wires.every((w:{colour:string})=>w.colour==='teal'))).toBe(true);
 await page.screenshot({path:'/tmp/circuit-cables-laptop.png',fullPage:true});
});
test('alarm audio is opt-in and stops on mute, stop, edit and mode change',async({page})=>{
 await page.addInitScript(()=>{const Native=window.AudioContext;const record={starts:0,stops:0};(window as unknown as {audioTest:typeof record}).audioTest=record;window.AudioContext=class extends Native{createOscillator(){const osc=super.createOscillator(),start=osc.start.bind(osc),stop=osc.stop.bind(osc);osc.start=(...args)=>{record.starts++;start(...args);};osc.stop=(...args)=>{record.stops++;stop(...args);};return osc;}};});
 await page.goto('/3d-lab');const studio=page.getByRole('region',{name:'Circuit project studio'});await studio.getByRole('button',{name:/^Button alarm/}).click();await studio.getByRole('button',{name:'Load circuit example',exact:true}).click();await studio.getByRole('button',{name:'Run logic preview',exact:true}).click();await studio.getByRole('button',{name:'Press test button',exact:true}).click();
 const counts=()=>page.evaluate(()=>(window as unknown as {audioTest:{starts:number;stops:number}}).audioTest);expect((await counts()).starts).toBe(0);
 await studio.getByRole('button',{name:'Enable alarm sound',exact:true}).click();await expect(studio).toContainText('Alarm tone playing');await expect.poll(async()=>(await counts()).starts).toBe(1);
 await studio.getByRole('button',{name:'Mute alarm sound',exact:true}).click();await expect.poll(async()=>(await counts()).stops).toBe(1);
 await studio.getByRole('button',{name:'Enable alarm sound',exact:true}).click();await studio.getByRole('button',{name:'Stop logic preview',exact:true}).click();await expect.poll(async()=>{const c=await counts();return c.starts===c.stops;}).toBe(true);
 await studio.getByRole('button',{name:'Run logic preview',exact:true}).click();await studio.getByRole('button',{name:'Press test button',exact:true}).click();await expect(studio).toContainText('Alarm tone playing');await studio.getByRole('button',{name:'Remove circuit wire 1',exact:true}).click();await expect.poll(async()=>{const c=await counts();return c.starts===c.stops;}).toBe(true);
 await studio.getByRole('button',{name:'Load circuit example',exact:true}).click();await studio.getByRole('button',{name:'Run logic preview',exact:true}).click();await studio.getByRole('button',{name:'Press test button',exact:true}).click();await expect(studio).toContainText('Alarm tone playing');await page.getByRole('tab',{name:/CAD Workspace/}).click();await expect.poll(async()=>{const c=await counts();return c.starts===c.stops;}).toBe(true);
});
