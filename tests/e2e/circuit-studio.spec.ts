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
test('all four project examples run; button input works and phone has no page overflow',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/3d-lab');const studio=page.getByRole('region',{name:'Circuit project studio'});
 for(const name of ['LED blink','Push-button light','Traffic lights','Button alarm']){
  await studio.getByRole('button',{name:new RegExp(`^${name}`)}).click();await studio.getByRole('button',{name:'Load circuit example',exact:true}).click();await studio.getByRole('button',{name:'Run logic preview',exact:true}).click();
  if(name==='Push-button light'||name==='Button alarm'){await studio.getByRole('button',{name:'Press test button',exact:true}).click();await expect(studio.locator('.cs-output')).toHaveText(name==='Button alarm'?'Piezo ACTIVE (visual preview)':'LED ON');}else await expect(studio.locator('.cs-output')).toHaveText(name==='Traffic lights'?'Red light ON':'LED ON');
  await studio.getByRole('button',{name:'Stop logic preview',exact:true}).click();await expect(studio.locator('.cs-output')).toHaveText('Preview stopped');
 }
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);const download=page.waitForEvent('download');await studio.getByRole('button',{name:'Download circuit sketch',exact:true}).click();expect((await download).suggestedFilename()).toBe('alarm.ino');await page.screenshot({path:'/tmp/circuit-studio-mobile.png',fullPage:true});
});
