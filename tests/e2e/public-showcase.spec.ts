import { test, expect } from '@playwright/test';

test('public sample adapts wiring and code, teaches honestly and works on a phone', async ({page,context}) => {
  await page.setViewportSize({width:390,height:844});
  const errors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/');
  await page.getByRole('link',{name:'Try a complete sample lesson'}).click();
  await expect(page.getByRole('heading',{level:1})).toContainText('Smart Environment');
  await page.getByRole('button',{name:'ESP32',exact:true}).click();
  await expect(page.locator('#step-4')).toContainText('GPIO4');
  await expect(page.locator('pre')).toContainText('Serial.begin(115200)');
  await expect(page.getByRole('button',{name:'ESP32',exact:true})).toHaveAttribute('aria-pressed','true');
  await page.getByRole('radio',{name:'An AI response',exact:true}).check();
  await expect(page.locator('#step-9')).toContainText('Try again.');
  await page.getByRole('radio',{name:'Evidence of the build and teacher assessment',exact:true}).check();
  await expect(page.locator('#step-9')).toContainText('Correct.');
  await page.getByRole('button',{name:'Arduino Uno',exact:true}).click();
  await expect(page.locator('#step-4')).toContainText('D2');
  await expect(page.locator('pre')).toContainText('Serial.begin(9600)');
  const firmware=await page.request.get('/lessons/smart-monitor-uno.ino');
  expect(firmware.status()).toBe(200);
  expect(await firmware.text()).toContain('SENSOR_PIN = 2');
  expect((await page.request.get('/lessons/reading-log.csv')).status()).toBe(200);
  expect((await page.request.get('/lessons/pilot-planning-brief.md')).status()).toBe(200);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  if (process.env.TEST_PUBLIC_OFFLINE === 'true') {
  await page.evaluate(async()=>{await navigator.serviceWorker.ready;});
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading',{level:1})).toContainText('Smart Environment');
  await page.getByRole('button',{name:'ESP32',exact:true}).click();
  await expect(page.locator('pre')).toContainText('Serial.begin(115200)');
  await context.setOffline(false);
  }
  await page.getByRole('link',{name:'Teacher setup guide',exact:true}).click();
  await expect(page.getByRole('heading',{level:1})).toContainText('setup to feedback');
  await page.getByRole('link',{name:'About & impact',exact:true}).first().click();
  await expect(page.getByText('Classroom impact has not yet been established.',{exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});
