import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';

test('CAD battery and button projects run, stop and restore checked wiring',async({page})=>{
 await page.goto('/3d-lab');await page.getByRole('tab',{name:/CAD Workspace/}).click();const cad=page.locator('#robot-cad');
 await cad.getByLabel('CAD test project').selectOption('battery');await cad.getByRole('button',{name:'Load selected circuit example',exact:true}).click();
 await cad.getByRole('button',{name:'Run circuit preview',exact:true}).click();await expect(cad.locator('.cad-output')).toHaveText('LED ON · preview running');await page.waitForTimeout(1100);await expect(cad.locator('.cad-output')).toHaveText('LED ON · preview running');
 await cad.getByRole('button',{name:'Stop circuit preview',exact:true}).click();await expect(cad.locator('.cad-output')).toHaveText('LED OFF · preview stopped');
 await page.reload();await page.getByRole('tab',{name:/CAD Workspace/}).click();await expect(cad.getByLabel('CAD test project')).toHaveValue('battery');await expect(cad.getByRole('button',{name:'Run circuit preview',exact:true})).toBeEnabled();
 await cad.getByLabel('CAD test project').selectOption('button');await cad.getByRole('button',{name:'Load selected circuit example',exact:true}).click();await cad.getByRole('button',{name:'Run circuit preview',exact:true}).click();await expect(cad.locator('.cad-output')).toHaveText('LED OFF · preview running');
 await cad.getByRole('button',{name:'Press test button',exact:true}).click();await expect(cad.locator('.cad-output')).toHaveText('LED ON · preview running');await cad.getByRole('button',{name:'Release test button',exact:true}).click();await expect(cad.locator('.cad-output')).toHaveText('LED OFF · preview running');
 await cad.getByRole('button',{name:'Start empty circuit project',exact:true}).click();await expect(cad.getByLabel('CAD test project')).toHaveValue('button');await expect(cad.getByRole('button',{name:'Run circuit preview',exact:true})).toBeDisabled();
});

test('CAD alarm sound is opt-in and stops on mute, stop, edits and workspace change',async({page})=>{
 await page.addInitScript(()=>{
  const stats={starts:0,stops:0,gains:[] as number[]};(window as unknown as {audioStats:typeof stats}).audioStats=stats;
  class FakeAudioContext {currentTime=0;destination={};resume(){return Promise.resolve();}close(){return Promise.resolve();}createOscillator(){return {type:'',frequency:{setValueAtTime(){}},connect(){},disconnect(){},start(){stats.starts++;},stop(){stats.stops++;}};}createGain(){return {gain:{setValueAtTime(n:number){stats.gains.push(n);}},connect(){},disconnect(){}};}}
  Object.defineProperty(window,'AudioContext',{value:FakeAudioContext});
 });
 await page.goto('/3d-lab');await page.getByRole('tab',{name:/CAD Workspace/}).click();const cad=page.locator('#robot-cad');
 await cad.getByLabel('CAD test project').selectOption('alarm');await cad.getByRole('button',{name:'Load selected circuit example',exact:true}).click();await cad.getByRole('button',{name:'Run circuit preview',exact:true}).click();await cad.getByRole('button',{name:'Press test button',exact:true}).click();await expect(cad.locator('.cad-output')).toHaveText('Piezo ACTIVE · preview running');
 const stats=()=>page.evaluate(()=>(window as unknown as {audioStats:{starts:number;stops:number;gains:number[]}}).audioStats);
 expect((await stats()).starts).toBe(0);await cad.getByRole('button',{name:'Enable alarm sound',exact:true}).click();await expect.poll(async()=>(await stats()).starts).toBe(1);
 await cad.getByLabel('CAD alarm volume').fill('40');await expect.poll(async()=>(await stats()).gains.at(-1)).toBeCloseTo(.032);
 await cad.getByRole('button',{name:'Mute alarm sound',exact:true}).click();await expect.poll(async()=>{const s=await stats();return s.starts-s.stops;}).toBe(0);
 await cad.getByRole('button',{name:'Enable alarm sound',exact:true}).click();await cad.getByRole('button',{name:'Stop circuit preview',exact:true}).click();await expect.poll(async()=>{const s=await stats();return s.starts-s.stops;}).toBe(0);
 await cad.getByRole('button',{name:'Run circuit preview',exact:true}).click();await cad.getByRole('button',{name:'Press test button',exact:true}).click();await expect.poll(async()=>{const s=await stats();return s.starts-s.stops;}).toBe(1);
 await cad.getByRole('button',{name:'Start empty circuit project',exact:true}).click();await expect.poll(async()=>{const s=await stats();return s.starts-s.stops;}).toBe(0);await expect(cad.getByRole('button',{name:'Run circuit preview',exact:true})).toBeDisabled();
 await cad.getByRole('button',{name:'Load selected circuit example',exact:true}).click();await cad.getByRole('button',{name:'Run circuit preview',exact:true}).click();await cad.getByRole('button',{name:'Press test button',exact:true}).click();await page.getByRole('tab',{name:/Robot Builder/}).click();await expect.poll(async()=>{const s=await stats();return s.starts-s.stops;}).toBe(0);
});

test('phone CAD project selector and alarm controls fit the viewport',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/3d-lab');await page.getByRole('tab',{name:/CAD Workspace/}).click();const cad=page.locator('#robot-cad');await cad.getByLabel('CAD test project').selectOption('alarm');await cad.getByRole('button',{name:'Load selected circuit example',exact:true}).click();await cad.getByRole('button',{name:'Run circuit preview',exact:true}).click();await cad.getByRole('button',{name:'Press test button',exact:true}).click();await expect(cad.locator('.cad-output')).toContainText('Piezo ACTIVE');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});


test('new CAD projects update the live 3D outputs and pressing the model triggers the alarm',async({page})=>{
 test.skip(!process.env.TEST_THREE_BUNDLES,'Requires Three.js bundles and WebGL');
 const root=process.env.TEST_THREE_BUNDLES!;const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://esm.sh/three@0.180.0',async r=>r.fulfill({contentType:'text/javascript',body:await readFile(`${root}/three.js`,'utf8')}));
 for(const [name,file] of [['OrbitControls','orbit'],['TransformControls','transform']])await page.route(`https://esm.sh/three@0.180.0/examples/jsm/controls/${name}.js`,async r=>r.fulfill({contentType:'text/javascript',body:await readFile(`${root}/${file}.js`,'utf8')}));
 await page.setViewportSize({width:1366,height:768});await page.goto('/3d-lab');await page.getByRole('tab',{name:/CAD Workspace/}).click();const cad=page.locator('#robot-cad');
 await cad.getByLabel('CAD test project').selectOption('battery');await cad.getByRole('button',{name:'Load selected circuit example',exact:true}).click();await cad.getByRole('button',{name:'Launch CAD workspace',exact:true}).click();const canvas=cad.locator('canvas');await expect(canvas).toHaveAttribute('data-cad-wires','3');
 await cad.getByRole('button',{name:'Run circuit preview',exact:true}).click();await expect(canvas).toHaveAttribute('data-cad-led','on');await cad.getByRole('button',{name:'Stop circuit preview',exact:true}).click();await expect(canvas).toHaveAttribute('data-cad-led','off');
 await cad.getByLabel('CAD test project').selectOption('button');await cad.getByRole('button',{name:'Load selected circuit example',exact:true}).click();await expect(canvas).toHaveAttribute('data-cad-wires','5');await cad.getByRole('button',{name:'Run circuit preview',exact:true}).click();await cad.getByRole('button',{name:'Press test button',exact:true}).click();await expect(canvas).toHaveAttribute('data-cad-led','on');
 await cad.getByLabel('CAD test project').selectOption('alarm');await cad.getByRole('button',{name:'Load selected circuit example',exact:true}).click();await expect(canvas).toHaveAttribute('data-cad-wires','4');await cad.getByRole('button',{name:'Run circuit preview',exact:true}).click();await cad.getByRole('button',{name:'Top view',exact:true}).click();
 // Alarm example's button is at x=6, z=0. Select Uno first so its transform handles cannot intercept the button.
 const rect=(await canvas.boundingBox())!;const scale=rect.height/(2*Math.tan(21*Math.PI/180)*65);await page.mouse.click(rect.x+rect.width/2+6*scale,rect.y+rect.height/2);await expect(canvas).toHaveAttribute('data-cad-alarm','on');await expect(cad.locator('.cad-output')).toContainText('Piezo ACTIVE');
 await cad.getByRole('button',{name:'Stop circuit preview',exact:true}).click();await expect(canvas).toHaveAttribute('data-cad-alarm','off');expect(errors).toEqual([]);await page.screenshot({path:'/tmp/stembuild-cad-alarm.png',fullPage:false});
});
