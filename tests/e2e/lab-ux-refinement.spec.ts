import { expect, test } from "@playwright/test";

test("Free Build shows progress, supports fit/detail zoom and keeps project saves", async ({page}) => {
  await page.setViewportSize({width:390,height:844});
  const errors:string[] = [];
  page.on("pageerror",error=>errors.push(error.message));
  await page.goto("/3d-lab");
  const workshop=page.getByRole("region",{name:"Free-build interactive breadboard"});
  await expect(workshop.getByText("0/3 milestones")).toBeVisible();
  await expect(workshop.getByText("Place your two components")).toBeVisible();
  await workshop.getByRole("button",{name:"Fit board"}).click();
  await expect(workshop.getByRole("button",{name:"Fit board"})).toHaveAttribute("aria-pressed","true");
  await expect(workshop.locator(".bb-board")).toHaveClass(/fit/);
  await workshop.getByRole("button",{name:"Detail",exact:true}).click();
  await expect(workshop.getByRole("button",{name:"Detail",exact:true})).toHaveAttribute("aria-pressed","true");

  await workshop.getByRole("button",{name:"Load working example"}).click();
  await expect(workshop.getByText("2/3 milestones")).toBeVisible();
  await expect(workshop.getByText("Ready for a test run")).toBeVisible();
  await workshop.getByRole("button",{name:"Run blink preview"}).click();
  await expect(workshop.getByText("3/3 milestones")).toBeVisible();
  await page.reload();
  await expect(workshop.getByText("2/3 milestones")).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test("Guided project next-step panel follows saved assembly and wiring progress",async ({page})=>{
  await page.goto("/3d-lab/guided");
  await expect(page.getByText("Place the parts",{exact:true})).toBeVisible();
  const steps=page.getByRole("navigation",{name:"Guided build steps"});
  await expect(steps.getByRole("button",{name:/Assemble/})).toHaveClass(/current/);

  await page.getByRole("button",{name:"Auto assemble demo",exact:true}).click();
  await expect(page.getByText("Connect the wires",{exact:true})).toBeVisible();
  while(await page.getByRole("button",{name:"Connect",exact:true}).count()) {
    await page.getByRole("button",{name:"Connect",exact:true}).first().click();
  }
  await expect(page.getByText("Run your circuit",{exact:true})).toBeVisible();
  await page.getByRole("button",{name:"▶ Run simulation",exact:true}).click();
  await expect(page.getByText("Observe the simulation",{exact:true})).toBeVisible();
  await expect(steps.getByRole("button",{name:/Run/})).toHaveClass(/done/);
  await expect(page.getByText("How the 3D and firmware engines work")).toBeVisible();
  await expect(page.getByText("AVR8js executes the compiled machine code",{exact:false})).toBeHidden();
  await page.getByText("How the 3D and firmware engines work").click();
  await expect(page.getByText("AVR8js executes the compiled machine code",{exact:false})).toBeVisible();
});
