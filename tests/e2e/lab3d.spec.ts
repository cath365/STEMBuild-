import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
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
