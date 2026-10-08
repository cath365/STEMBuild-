import { expect, test } from "@playwright/test";

test("homepage takes the STEMBuild logo colours rather than the old blue/pink/yellow theme",async({page})=>{
  await page.setViewportSize({width:390,height:844});
  const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
  await page.goto("/");
  const colors=await page.evaluate(()=>{
    const root=getComputedStyle(document.documentElement);
    const hero=document.querySelector("main section") || document.querySelector('[class*="hero_"]');
    const primary=hero?.querySelector('a[class*="primaryButton"]');
    return {
      navy:root.getPropertyValue("--brand-navy").trim(),
      blue:root.getPropertyValue("--brand-blue").trim(),
      teal:root.getPropertyValue("--brand-teal").trim(),
      orange:root.getPropertyValue("--brand-orange").trim(),
      hero:hero?getComputedStyle(hero).backgroundColor:"",
      action:primary?getComputedStyle(primary).backgroundColor:"",
    };
  });
  expect(colors).toMatchObject({navy:"#0e3462",blue:"#0172e5",teal:"#06be99",orange:"#f6b14a"});
  // Existing homepage hero is the recognisable navy/orange brand presentation.
  expect(await page.locator('[class*="hero_"]').first().count()).toBe(1);
  expect(errors).toEqual([]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test("all public learning routes share official colour tokens and the logo-striped header",async({page})=>{
 for(const route of ["/3d-lab","/3d-lab/guided","/components","/projects","/about","/login"]){
  await page.goto(route);
  const theme=await page.evaluate(()=>{
    const head=document.querySelector(".public-header");
    const css=getComputedStyle(document.documentElement);
    const headerAfter=head ? getComputedStyle(head,"::after") : null;
    return {
      navy:css.getPropertyValue("--brand-navy").trim(),
      blue:css.getPropertyValue("--brand-blue").trim(),
      orange:css.getPropertyValue("--brand-orange").trim(),
      header:headerAfter?.backgroundImage ?? "",
    };
  });
  expect(theme.navy,route).toBe("#0e3462");
  expect(theme.blue,route).toBe("#0172e5");
  expect(theme.orange,route).toBe("#f6b14a");
  expect(theme.header,route).toContain("linear-gradient");
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),route).toBe(true);
 }
});

test("Free Build shows orange guidance and teal completion while preserving the working simulator",async({page})=>{
 await page.goto("/3d-lab");
 const workshop=page.getByRole("region",{name:"Free-build interactive breadboard"});
 const initial=await workshop.locator(".bb-feedback").evaluate(el=>getComputedStyle(el).backgroundColor);
 expect(initial).toBe("rgb(255, 240, 213)");
 await workshop.getByRole("button",{name:"Load working example"}).click();
 const success=await workshop.locator(".bb-feedback").evaluate(el=>getComputedStyle(el).backgroundColor);
 expect(success).toBe("rgb(221, 248, 241)");
 await expect(workshop.getByRole("button",{name:"Run blink preview"})).toBeEnabled();
});
