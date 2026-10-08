import { expect, test, type Page } from "@playwright/test";

async function answerDeck(page: Page, correctAnswers: number[]) {
  const deck = page.locator(".led-question");
  await expect(deck).toHaveCount(correctAnswers.length);
  for (let i = 0; i < correctAnswers.length; i++) {
    await deck.nth(i).locator(".led-choice").nth(correctAnswers[i]).click();
    await expect(deck.nth(i).getByText("✓ Correct.")).toBeVisible();
  }
}

async function assembleCircuit(page: Page) {
  const board = page.getByRole("region", {name:"Free-build interactive breadboard"});
  await expect(board.getByRole("button",{name:"Run blink preview"})).toBeDisabled();
  await expect(board.getByRole("button",{name:"Load working example"})).toHaveCount(0);
  await expect(board.getByRole("button",{name:"Import breadboard backup"})).toHaveCount(0);
  await board.getByRole("button",{name:/Place 330 Ω resistor/}).click();
  await board.getByRole("button",{name:"Hole E6"}).click();
  await board.getByRole("button",{name:"Hole F6"}).click();
  await board.getByRole("button",{name:/Place LED/}).click();
  await board.getByRole("button",{name:"Hole E11"}).click();
  await board.getByRole("button",{name:"Hole F11"}).click();
  await board.getByRole("button",{name:/Connect jumper wire/}).click();
  for (const [a,b] of [["Arduino D8","Hole A6"],["Hole J6","Hole A11"],["Hole J11","Arduino GND"]]){
    await board.getByRole("button",{name:a,exact:true}).click();
    await board.getByRole("button",{name:b,exact:true}).click();
  }
  await expect(board.getByRole("button",{name:"Run blink preview"})).toBeEnabled();
  await board.getByRole("button",{name:"Run blink preview"}).click();
  await expect(board.locator(".bb-output")).toContainText("LED ON");
}

test("a beginner can understand, predict, build, troubleshoot, rebuild and take learning home", async ({page}) => {
  test.setTimeout(160_000);
  await page.setViewportSize({width:390,height:844});
  const errors:string[]=[];
  page.on("pageerror",error => errors.push(error.message));
  await page.goto("/learn/arduino-led-blink");
  await expect(page.getByRole("heading",{name:/Learn it. Build it./})).toBeVisible();
  await expect(page.getByText("0/7")).toBeVisible();
  await expect(page.getByRole("navigation",{name:"LED learning stages"}).getByRole("button",{name:/Understand/})).toBeDisabled();
  await page.getByRole("button",{name:"I have reviewed the concepts →"}).click();
  await expect(page.locator(".led-stage-head h3")).toHaveText("Understand");
  await page.locator(".led-question").first().locator(".led-choice").first().click();
  await expect(page.getByRole("button",{name:/Continue learning/})).toBeDisabled();
  await answerDeck(page,[1,0,1]);
  await page.getByRole("button",{name:/Continue learning/}).click();
  await expect(page.locator(".led-stage-head h3")).toHaveText("Predict");
  await answerDeck(page,[0,1]);
  await page.getByRole("button",{name:/Continue learning/}).click();
  await expect(page.locator(".led-stage-head h3")).toHaveText("Build & test");
  await page.getByRole("button",{name:/Show a step-by-step wiring tip/}).click();
  await expect(page.getByText(/Try placing the resistor across/)).toBeVisible();
  await assembleCircuit(page);
  await expect(page.getByText(/Preview verified/)).toBeVisible();
  await page.getByRole("button",{name:/Continue learning/}).click();
  await answerDeck(page,[2,0]);
  await page.getByRole("button",{name:/Continue learning/}).click();
  await expect(page.locator(".led-stage-head h3")).toHaveText("Rebuild independently");
  await expect(page.getByText(/starts separately from the practice circuit/)).toBeVisible();
  await expect(page.getByRole("button",{name:"Load working example"})).toHaveCount(0);
  await assembleCircuit(page);
  await expect(page.getByText(/Fresh-board simulation verified/)).toBeVisible();
  await page.getByRole("button",{name:/Continue learning/}).click();
  await expect(page.locator(".led-stage-head h3")).toHaveText("Explain");
  await page.getByLabel("Your explanation").fill("I used the 330 ohm resistor to limit current. The LED anode receives current through D8, the cathode returns to ground, and HIGH turns on the output. I would troubleshoot polarity first.");
  await page.getByRole("button",{name:"Save my explanation"}).click();
  await expect(page.getByText(/Reflection saved/)).toBeVisible();
  await page.getByRole("button",{name:/Go to take-home revision/}).click();
  await expect(page.locator(".led-stage-head h3")).toHaveText("Remember");
  await expect(page.getByText("7/7")).toBeVisible();
  const download=page.waitForEvent("download");
  await page.getByRole("button",{name:/Download take-home guide/}).click();
  expect((await download).suggestedFilename()).toBe("STEMBuild-Arduino-LED-Take-Home-Guide.html");
  await expect(page.getByText(/Not verified by this journey/)).toBeVisible();
  await answerDeck(page,[0,1,2]);
  await page.getByRole("button",{name:"Record recall check"}).click();
  await expect(page.getByText(/Recall check completed/)).toBeVisible();
  await page.reload();
  await expect(page.locator(".led-stage-head h3")).toHaveText("Remember");
  await expect(page.getByText("7/7")).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test("LED journey is linked from the real workspaces and keeps Free Build saves separate",async({page})=>{
  await page.goto("/3d-lab");
  const free=page.getByRole("region",{name:"Free-build interactive breadboard"});
  await free.getByRole("button",{name:"Load working example"}).click();
  await expect(free.locator(".bb-wire-list li")).toHaveCount(3);
  await page.getByRole("link",{name:/New\? Learn the LED step by step/}).click();
  await expect(page).toHaveURL(/\/learn\/arduino-led-blink/);
  await expect(page.getByRole("heading",{name:/Learn it. Build it./})).toBeVisible();
  await page.goto("/3d-lab");
  await expect(free.locator(".bb-wire-list li")).toHaveCount(3);
  await page.goto("/learning-paths/first-robot");
  await page.getByRole("link",{name:"Start here →"}).click();
  await expect(page).toHaveURL(/\/learn\/arduino-led-blink/);
});
