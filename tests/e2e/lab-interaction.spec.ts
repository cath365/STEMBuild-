import {test,expect} from "@playwright/test";

test("a circuit learner can disconnect one mistaken wire without resetting code",async({page})=>{
 await page.goto("/3d-lab");
 await page.getByRole("button",{name:"Auto assemble demo",exact:true}).click();
 while(await page.getByRole("button",{name:"Connect",exact:true}).count()){
   await page.getByRole("button",{name:"Connect",exact:true}).first().click();
 }
 await expect(page.getByText("All required paths connected")).toBeVisible();
 const code=await page.getByLabel("Arduino sketch editor").inputValue();
 await page.getByRole("button",{name:"▶ Run simulation",exact:true}).click();
 await expect(page.locator(".lab3d-sim-card")).toHaveClass(/running/);
 await page.getByRole("button",{name:"Disconnect",exact:true}).first().click();
 await expect(page.locator(".lab3d-sim-card")).toContainText("Stopped");
 await expect(page.getByText("1 connection(s) missing")).toBeVisible();
 expect(await page.getByLabel("Arduino sketch editor").inputValue()).toBe(code);
 await page.reload();
 await expect(page.getByText("1 connection(s) missing")).toBeVisible();
});

test("robot obstacles can be selected and keyboard-moved without overlaps",async({page})=>{
 await page.goto("/3d-lab#robot-arena");
 const arena=page.locator("#robot-arena");
 const obstacle=arena.getByRole("button",{name:"Select obstacle 1"});
 await expect(obstacle).toHaveAttribute("x","-11");
 await obstacle.focus();
 await page.keyboard.press("ArrowRight");
 await expect(obstacle).toHaveAttribute("x","-6");
 await page.keyboard.press("ArrowLeft");
 await expect(obstacle).toHaveAttribute("x","-11");
 await expect(arena.getByRole("button",{name:"Remove selected block"})).toBeEnabled();
 await arena.getByRole("button",{name:"Save project",exact:true}).click();
 await page.reload();
 await page.getByRole("tab",{name:/Robot Builder/}).click();
 await expect(arena.getByRole("button",{name:"Select obstacle 1"})).toHaveAttribute("x","-11");
 await arena.getByRole("button",{name:"Remove selected block"}).click();
 await expect(arena).toContainText("0/20 obstacles");
});

test("CAD nudge is reversible and persists across reload",async({page})=>{
 await page.goto("/3d-lab#robot-cad");
 const cad=page.locator("#robot-cad");
 const field=cad.getByLabel("X offset (cm)",{exact:true});
 await cad.getByRole("button",{name:"Nudge X plus 0.5 cm"}).click();
 await expect(field).toHaveValue("0.5");
 await cad.getByRole("button",{name:"Undo CAD edit"}).click();
 await expect(field).toHaveValue("0");
 await cad.getByRole("button",{name:"Nudge X minus 0.5 cm"}).click();
 await expect(field).toHaveValue("-0.5");
 await page.reload();
 await page.getByRole("tab",{name:/CAD Workspace/}).click();
 await expect(field).toHaveValue("-0.5");
});
