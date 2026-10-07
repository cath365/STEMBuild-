import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import {robotMounts,requiredRobotNets,terminalLabel} from '../../src/lib/robot-circuit';
import { defaultLedSketch, defaultButtonSketch } from '../../src/lib/lab3d';

async function assembleAndWire(page: import('@playwright/test').Page) {
  await page.getByRole('button',{name:'Auto assemble demo',exact:true}).click();
  while (await page.getByRole('button',{name:'Connect',exact:true}).count()) await page.getByRole('button',{name:'Connect',exact:true}).first().click();
}

test('phone placement, isolated project saves, honest preview and button keyboard input', async ({page}) => {
  await page.setViewportSize({width:390,height:844});
  const errors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/3d-lab');
  await page.getByRole('button',{name:'Place',exact:true}).first().click();
  await expect(page.getByRole('img',{name:'Arduino Uno',exact:true})).toBeVisible();
  await expect.poll(()=>page.getByRole('img',{name:'Arduino Uno',exact:true}).evaluate((i:HTMLImageElement)=>i.naturalWidth>0)).toBe(true);
  await assembleAndWire(page);
  const ledCode = defaultLedSketch.replaceAll('delay(500)','delay(5000)');
  await page.getByLabel('Arduino sketch editor').fill(ledCode);
  await page.getByRole('button',{name:'Push-Button Light',exact:true}).click();
  await expect(page.getByLabel('Arduino sketch editor')).toHaveValue(defaultButtonSketch);
  await assembleAndWire(page);
  await page.getByRole('button',{name:'▶ Run simulation',exact:true}).click();
  const button = page.getByRole('button',{name:/Press and hold virtual button/});
  await button.focus();
  await page.keyboard.down('Space');
  await expect(page.locator('.lab3d-sim-card')).toContainText('D8 HIGH');
  await page.keyboard.up('Space');
  await expect(page.locator('.lab3d-sim-card')).toContainText('D8 LOW');
  await page.getByRole('button',{name:'LED Blink',exact:true}).click();
  await expect(page.getByLabel('Arduino sketch editor')).toHaveValue(ledCode);
  await expect(page.locator('.lab3d-check').last()).toContainText('4/4');
  await page.reload();
  await expect(page.getByLabel('Arduino sketch editor')).toHaveValue(ledCode);
  await page.getByLabel('Arduino sketch editor').fill(ledCode.replace('digitalWrite(LED_PIN, HIGH);','if (false) digitalWrite(LED_PIN, HIGH);'));
  await page.getByRole('button',{name:'▶ Run simulation',exact:true}).click();
  await expect(page.getByRole('status').filter({hasText:'edited sketch needs Full Firmware Mode'})).toBeVisible();
  await expect(page.locator('.lab3d-sim-card')).toContainText('Stopped');
  const overflow = await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,stage:{ratio:getComputedStyle(document.querySelector(".lab3d-light-preview-stage")!).aspectRatio,minWidth:getComputedStyle(document.querySelector(".lab3d-light-preview-stage")!).minWidth,height:getComputedStyle(document.querySelector(".lab3d-light-preview-stage")!).height},css:[...document.querySelectorAll("link[rel=stylesheet]")].map(e=>e.getAttribute("href")),offenders:[...document.querySelectorAll('*')].filter(e=>e.getBoundingClientRect().right>innerWidth+1).slice(0,12).map(e=>({tag:e.tagName,cls:e.className,width:e.getBoundingClientRect().width}))}));
  expect(overflow.scroll,JSON.stringify(overflow)).toBeLessThanOrEqual(overflow.width);
  expect(errors).toEqual([]);
});

for (const outcome of ['success','failure']) test(`stopped firmware ${outcome} cannot restart the session`, async ({page}) => {
  // Controlled compiler response tests the asynchronous boundary, not GCC correctness.
  await page.route('https://cdn.jsdelivr.net/npm/@horang-corp/avr-gcc-wasm@0.2.0/index.js',route=>route.fulfill({contentType:'text/javascript',body:`export async function compile(){ await new Promise(r=>setTimeout(r,1000)); ${outcome==='success'?'return {hex:":00000001FF",flashBytes:8,fitsTarget:true};':'throw new Error("late compiler result");'} }`}));
  await page.goto('/3d-lab');
  await assembleAndWire(page);
  await page.getByRole('button',{name:/Full Firmware Mode Real AVR-GCC/}).click();
  await page.getByRole('button',{name:'▶ Compile & run firmware',exact:true}).click();
  await expect(page.getByRole('button',{name:'Compiling real firmware…'})).toBeDisabled();
  await page.getByRole('button',{name:'■ Stop',exact:true}).click();
  await page.getByRole('button',{name:/Fast Simulation Starter sketch/}).click();
  await page.getByRole('button',{name:'▶ Run simulation',exact:true}).click();
  // A stale failure would enter the fallback; intercept and wait for that deadline.
  await page.route('**/firmware-builder.js',route=>route.fulfill({contentType:'text/javascript',body:'export async function buildFirmware(){ throw new Error("late fallback result"); }'}));
  await page.waitForTimeout(1300);
  await expect(page.locator('.lab3d-sim-card')).toHaveClass(/running/);
  await expect(page.getByText('Full Firmware Mode error:',{exact:false})).toHaveCount(0);
});

test('WebGL replays parts and wires after loading and releases its renderer on close', async ({page}) => {
  test.skip(!process.env.TEST_THREE_BUNDLES, 'Requires matching local Three.js test bundles and WebGL browser support');
  const root=process.env.TEST_THREE_BUNDLES!;
  const errors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://esm.sh/three@0.180.0',async route=>{
    const body=await readFile(`${root}/three.js`,'utf8');
    await route.fulfill({contentType:'text/javascript',body:body.replace('\n  WebGLRenderer,\n','\n')+'\nclass TestWebGLRenderer extends WebGLRenderer { constructor(...args){ super(...args); const render=this.render.bind(this); const dispose=this.dispose.bind(this); this.render=(s,c)=>{ if(this.testDisposed) throw Error("render after disposal"); render(s,c); this.domElement.dataset.visibleParts=s.children.flatMap(g=>g.children.filter(o=>o.visible && ["arduino","breadboard","resistor","led","button"].includes(o.name)).map(o=>o.name)).join(","); this.domElement.dataset.wireCount=String(s.children.flatMap(g=>g.children.filter(o=>o.geometry?.type==="TubeGeometry")).length); }; this.dispose=()=>{this.testDisposed=true;dispose();}; } } export {TestWebGLRenderer as WebGLRenderer};'});
  });
  for (const [file,name] of [['GLTFLoader','loader'],['OrbitControls','orbit']]) {
    await page.route(`https://esm.sh/three@0.180.0/examples/jsm/${file==='GLTFLoader'?'loaders':'controls'}/${file}.js`,async route=>route.fulfill({contentType:'text/javascript',body:await readFile(`${root}/${name}.js`,'utf8')}));
  }
  await page.goto('/3d-lab');
  await assembleAndWire(page);
  await page.getByRole('button',{name:'Launch 3D Workbench',exact:true}).click();
  await expect(page.getByRole('button',{name:'Reset camera',exact:true})).toBeVisible();
  const canvas=page.locator('.lab3d-renderer-mount canvas');
  await expect(canvas).toHaveAttribute('data-visible-parts','arduino,breadboard,resistor,led');
  await expect(canvas).toHaveAttribute('data-wire-count','3');
  await page.getByRole('button',{name:'Close 3D view',exact:true}).click();
  await expect(canvas).toHaveCount(0);
  await expect(page.getByRole('img',{name:'Arduino Uno',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Launch 3D Workbench',exact:true}).click();
  await expect(page.getByRole('button',{name:'Reset camera',exact:true})).toBeVisible();
  await expect(canvas).toHaveAttribute('data-wire-count','3');
  if (process.env.TEST_LAB_SCREENSHOT) {
    await page.locator('.lab3d-webgl-shell').scrollIntoViewIfNeeded();
    await page.screenshot({path:process.env.TEST_LAB_SCREENSHOT,type:'jpeg'});
  }
  expect(errors).toEqual([]);
});


test('AVR engine drives D8 from real machine instructions and Stop resets output', async ({page}) => {
  test.skip(!process.env.TEST_THREE_BUNDLES, 'Requires version-matched AVR8js test bundle');
  // Fixed, checksummed Intel HEX: LDI r16,1; OUT DDRB,r16; OUT PORTB,r16; RJMP -1.
  // Compiler is stubbed: this isolates actual AVR instruction/GPIO execution.
  const bytes=[0x01,0xe0,0x04,0xb9,0x05,0xb9,0xff,0xcf];
  const checksum=(-(8+bytes.reduce((a,b)=>a+b,0)))&255;
  const hex=':08000000'+bytes.map(b=>b.toString(16).padStart(2,'0')).join('')+checksum.toString(16).padStart(2,'0')+'\n:00000001FF';
  await page.route('https://cdn.jsdelivr.net/npm/@horang-corp/avr-gcc-wasm@0.2.0/index.js',route=>route.fulfill({contentType:'text/javascript',body:`export async function compile(){ return {hex:${JSON.stringify(hex)},flashBytes:8,fitsTarget:true}; }`}));
  await page.route('https://esm.sh/avr8js@0.21.1',async route=>route.fulfill({contentType:'text/javascript',body:await readFile(`${process.env.TEST_THREE_BUNDLES}/avr.js`,'utf8')}));
  await page.goto('/3d-lab');
  await assembleAndWire(page);
  await page.getByRole('button',{name:/Full Firmware Mode Real AVR-GCC/}).click();
  await page.getByRole('button',{name:'▶ Compile & run firmware',exact:true}).click();
  await expect(page.locator('.lab3d-sim-card')).toContainText('D8 HIGH');
  await page.getByRole('button',{name:'■ Stop',exact:true}).click();
  await expect(page.locator('.lab3d-sim-card')).toContainText('Stopped');
  await expect(page.locator('.sim-led')).not.toHaveClass(/on/);
});

test('robot assembly gates motion, obstacle controls work and Stop freezes position',async({page})=>{
 await page.goto('/3d-lab');
 const arena=page.locator('#robot-arena');
 if(process.env.TEST_THREE_BUNDLES){
  await page.route('https://esm.sh/three@0.180.0',async r=>r.fulfill({contentType:'text/javascript',body:await readFile(`${process.env.TEST_THREE_BUNDLES}/three.js`,'utf8')}));
  await page.route('https://esm.sh/three@0.180.0/examples/jsm/controls/OrbitControls.js',async r=>r.fulfill({contentType:'text/javascript',body:await readFile(`${process.env.TEST_THREE_BUNDLES}/orbit.js`,'utf8')}));
  await arena.getByRole('button',{name:'Launch robot 3D',exact:true}).click();
  await expect(arena.getByText('3D arena · orbit and zoom in 3D.',{exact:false})).toBeVisible();
  await expect(arena.locator('.robot-view canvas')).toBeVisible();
 }
 await expect(arena.getByRole('button',{name:'Start robot',exact:true})).toBeDisabled();
 for(const m of robotMounts){await arena.getByRole('button',{name:m.name,exact:true}).click();await arena.getByRole('button',{name:'Attach selected part',exact:true}).click();}
 await expect(arena.getByRole('button',{name:'Start robot',exact:true})).toBeDisabled();
 await arena.getByRole('button',{name:'Arduino Uno 5V',exact:true}).click();await arena.getByRole('button',{name:'Arduino Uno GND',exact:true}).click();
 await expect(arena).toContainText('Short circuit: Uno 5V is connected to ground.');
 await arena.getByRole('button',{name:'Remove wire 1',exact:true}).click();
 for(const [a,b] of requiredRobotNets){await arena.getByRole('button',{name:terminalLabel(a),exact:true}).click();await arena.getByRole('button',{name:terminalLabel(b),exact:true}).click();}
 await expect(arena).toContainText('Supported wiring topology passes');
 await expect(arena.getByRole('button',{name:'Start robot',exact:true})).toBeEnabled();
 await arena.getByRole('button',{name:'Rotate selected part',exact:true}).click();
 await expect(arena.getByRole('button',{name:'Start robot',exact:true})).toBeDisabled();
 for(let n=0;n<3;n++)await arena.getByRole('button',{name:'Rotate selected part',exact:true}).click();
 await expect(arena.getByRole('button',{name:'Start robot',exact:true})).toBeEnabled();
 await arena.getByRole('button',{name:'Add block',exact:true}).click();
 await expect(arena).toContainText('2/20 obstacles');
 const robot=arena.locator('.robot-map g');const before=await robot.getAttribute('transform');
 await arena.getByRole('button',{name:'Start robot',exact:true}).click();
 await expect.poll(()=>robot.getAttribute('transform')).not.toBe(before);
 if(process.env.TEST_THREE_BUNDLES)await expect.poll(()=>arena.locator('.robot-view canvas').getAttribute('data-robot-position')).not.toBe('[0,65]');
 await expect(arena.getByRole('button',{name:'Add block',exact:true})).toBeDisabled();
 await arena.getByRole('button',{name:'Stop robot',exact:true}).click();
 const stopped=await robot.getAttribute('transform');await page.waitForTimeout(150);
 expect(await robot.getAttribute('transform')).toBe(stopped);
 await arena.getByRole('button',{name:'Reset robot',exact:true}).click();
 expect(await robot.getAttribute('transform')).toBe(before);
 await arena.locator('input[type=range]').fill('32');
 const download=page.waitForEvent('download');await arena.getByRole('button',{name:'Download robot .ino'}).click();
 expect((await download).suggestedFilename()).toBe('stembuild-obstacle-robot.ino');
 if(process.env.TEST_THREE_BUNDLES){await arena.getByRole('button',{name:'Close robot 3D',exact:true}).click();await expect(arena.locator('.robot-view canvas')).toHaveCount(0);}
});

test('CAD workspace edits real 3D parts, undo/redo and device save restore assemblies',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 if(process.env.TEST_THREE_BUNDLES){
  const root=process.env.TEST_THREE_BUNDLES;
  await page.route('https://esm.sh/three@0.180.0',async r=>r.fulfill({contentType:'text/javascript',body:await readFile(`${root}/three.js`,'utf8')}));
  for(const [name,file]of [['OrbitControls','orbit'],['TransformControls','transform']])await page.route(`https://esm.sh/three@0.180.0/examples/jsm/controls/${name}.js`,async r=>r.fulfill({contentType:'text/javascript',body:await readFile(`${root}/${file}.js`,'utf8')}));
 }
 await page.goto('/3d-lab');const cad=page.locator('#robot-cad');
 if(process.env.TEST_THREE_BUNDLES){await cad.getByRole('button',{name:'Launch CAD workspace',exact:true}).click();await expect(cad).toContainText('3D assembly ready.');}
 const x=cad.getByLabel('X offset (cm)',{exact:true});await x.fill('4');
 if(process.env.TEST_THREE_BUNDLES){await expect(cad.locator('canvas')).toHaveAttribute('data-cad-offset','[4,0,0]');await expect(cad.locator('canvas')).toHaveAttribute('data-cad-position','[4,7.5,-4]');}
 await cad.getByRole('button',{name:'Undo CAD edit',exact:true}).click();await expect(x).toHaveValue('0');
 await cad.getByRole('button',{name:'Redo CAD edit',exact:true}).click();await expect(x).toHaveValue('4');
 await cad.getByRole('button',{name:'Save assembly',exact:true}).click();await cad.getByRole('button',{name:'Snap to reference mount',exact:true}).click();await expect(x).toHaveValue('0');
 await cad.getByRole('button',{name:'Load assembly',exact:true}).click();await expect(x).toHaveValue('4');
 if(process.env.TEST_THREE_BUNDLES){await cad.getByRole('button',{name:'Top view',exact:true}).click();await cad.getByRole('button',{name:'Check electronics overlap',exact:true}).click();await expect(cad).toContainText('Possible electronics overlap:');await x.fill('12');await cad.getByRole('button',{name:'Check electronics overlap',exact:true}).click();await expect(cad).toContainText('No electronics bounding-box overlaps detected.');await cad.getByRole('button',{name:'Close CAD view',exact:true}).click();await expect(cad.locator('canvas')).toHaveCount(0);}
 const dl=page.waitForEvent('download');await cad.getByRole('button',{name:'Export assembly',exact:true}).click();expect((await dl).suggestedFilename()).toBe('stembuild-robot-assembly.json');
 expect(errors).toEqual([]);
});
