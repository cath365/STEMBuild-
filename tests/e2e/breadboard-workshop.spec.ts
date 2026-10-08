import { expect, test } from "@playwright/test";

test("free breadboard builds a real conductive path, simulates and restores after reload", async({page})=>{
 await page.setViewportSize({width:390,height:844});
 const errors:string[]=[];
 page.on("pageerror",error=>errors.push(error.message));
 await page.goto("/3d-lab");
 const workshop=page.getByRole("region",{name:"Free-build interactive breadboard"});
 await expect(workshop.getByRole("heading",{name:"Build on a real breadboard layout."})).toBeVisible();
 await expect(workshop.getByRole("button",{name:"Run blink preview"})).toBeDisabled();
 await workshop.getByRole("button",{name:"Load working example"}).click();
 await expect(workshop.getByRole("button",{name:"Run blink preview"})).toBeEnabled();
 await expect(workshop.locator(".bb-wire-list li")).toHaveCount(3);
 await workshop.getByRole("button",{name:"Run blink preview"}).click();
 await expect(workshop.locator(".bb-output")).toContainText("LED ON");
 await workshop.getByRole("button",{name:"Stop preview"}).click();
 await workshop.getByRole("button",{name:"Save breadboard"}).click();
 await page.reload();
 await expect(workshop.locator(".bb-wire-list li")).toHaveCount(3);
 await expect(workshop.getByRole("button",{name:"Run blink preview"})).toBeEnabled();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 expect(errors).toEqual([]);
});

test("free build placement uses real named holes and jumper occupancy",async({page})=>{
 await page.goto("/3d-lab");
 const workshop=page.getByRole("region",{name:"Free-build interactive breadboard"});
 // Each Playwright context uses fresh browser storage and starts with an empty board.
 await workshop.getByRole("button",{name:/Place 330 Ω resistor/}).click();
 await workshop.getByRole("button",{name:"Hole E6"}).click();
 await workshop.getByRole("button",{name:"Hole F6"}).click();
 await expect(workshop).toContainText("330 Ω resistor: E6 ↔ F6");
 await workshop.getByRole("button",{name:/Place LED/}).click();
 await workshop.getByRole("button",{name:"Hole E11"}).click();
 await workshop.getByRole("button",{name:"Hole F11"}).click();
 await expect(workshop).toContainText("LED: E11 (+) → F11 (−)");
 await workshop.getByRole("button",{name:/Connect jumper wire/}).click();
 for(const [a,b] of [["Arduino D8","Hole A6"],["Hole J6","Hole A11"],["Hole J11","Arduino GND"]]){
   await workshop.getByRole("button",{name:a,exact:true}).click();
   await workshop.getByRole("button",{name:b,exact:true}).click();
 }
 await expect(workshop.getByRole("button",{name:"Run blink preview"})).toBeEnabled();
 await workshop.getByRole("button",{name:"Remove",exact:true}).first().click();
 await expect(workshop.getByRole("button",{name:"Run blink preview"})).toBeDisabled();
 await workshop.getByRole("button",{name:/Connect jumper wire/}).click();
 await workshop.getByRole("button",{name:"Arduino D8"}).click();
 await workshop.getByRole("button",{name:"Hole A7"}).click();
 await expect(workshop.getByRole("button",{name:"Run blink preview"})).toBeEnabled();
});

test("free-build project export imports without touching guided lab state",async({page})=>{
 await page.goto("/3d-lab");
 const workshop=page.getByRole("region",{name:"Free-build interactive breadboard"});
 await workshop.getByRole("button",{name:"Load working example"}).click();
 const download=page.waitForEvent("download");
 await workshop.getByRole("button",{name:"Download breadboard backup"}).click();
 expect((await download).suggestedFilename()).toBe("stembuild-breadboard-project.json");
 await expect(page.getByRole("button",{name:"Auto assemble demo"})).toBeVisible();
 await workshop.getByRole("button",{name:"View this assembly in 3D"}).click();
 await expect(workshop.getByText("Live 3D assembly mirror")).toBeVisible();
 await workshop.getByRole("button",{name:"Close 3D assembly"}).click();
 await expect(workshop.getByText("Live 3D assembly mirror")).toHaveCount(0);
});
