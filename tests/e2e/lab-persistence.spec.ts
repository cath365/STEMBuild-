import { expect, test } from "@playwright/test";

test("circuit code and selected project survive full reload", async ({ page }) => {
 await page.goto("/3d-lab");
 await page.getByRole("button", { name: "Push-Button Light", exact: true }).click();
 await page.getByRole("button", { name: "Place", exact: true }).first().click();
 const code=page.getByLabel("Arduino sketch editor");
 await code.fill("// my own test notes\n" + await code.inputValue());
 await expect(page.getByRole("button", { name: "Save project", exact: true })).toBeVisible();
 await page.reload();
 await expect(page.getByRole("button", { name: "Push-Button Light", exact: true })).toHaveClass(/btn-primary/);
 await expect(page.getByLabel("Arduino sketch editor")).toHaveValue(/\/\/ my own test notes/);
 await expect(page.locator("#lab-panel-circuit")).toContainText("1/5 parts");
});

test("robot assembly, wires, obstacles and threshold survive browser reload",async ({page})=>{
 await page.goto("/3d-lab");
 await page.getByRole("tab",{name:/Robot Builder/}).click();
 const arena=page.locator("#robot-arena");
 await arena.getByRole("button",{name:"Arduino Uno",exact:true}).click();
 await arena.getByRole("button",{name:"Attach selected part",exact:true}).click();
 await expect(arena).toContainText("1/7 parts correctly mounted");
 await arena.getByRole("button",{name:"Arduino Uno 5V",exact:true}).click();
 await arena.getByRole("button",{name:"Arduino Uno GND",exact:true}).click();
 await expect(arena).toContainText("Short circuit:");
 await arena.getByRole("button",{name:"Add block",exact:true}).click();
 await expect(arena).toContainText("2/20 obstacles");
 await arena.locator('input[type="range"]').fill("32");
 await arena.getByRole("button",{name:"Save project",exact:true}).click();
 await page.reload();
 await page.getByRole("tab",{name:/Robot Builder/}).click();
 await expect(arena).toContainText("1/7 parts correctly mounted");
 await expect(arena).toContainText("Short circuit:");
 await expect(arena).toContainText("2/20 obstacles");
 await expect(arena.locator('input[type="range"]')).toHaveValue("32");
 await expect(arena.getByRole("button",{name:"Start robot",exact:true})).toBeDisabled();
});

test("CAD autosave survives reload without overwriting manual Save/Load slot",async({page})=>{
 await page.goto("/3d-lab");
 await page.getByRole("tab",{name:/CAD Workspace/}).click();
 const cad=page.locator("#robot-cad");
 const offset=cad.getByLabel("X offset (cm)",{exact:true});
 await offset.fill("4");
 await cad.getByRole("button",{name:"Save assembly",exact:true}).click();
 await offset.fill("9");
 await page.reload();
 await page.getByRole("tab",{name:/CAD Workspace/}).click();
 await expect(offset).toHaveValue("9");
 await cad.getByRole("button",{name:"Load assembly",exact:true}).click();
 await expect(offset).toHaveValue("4");
});
