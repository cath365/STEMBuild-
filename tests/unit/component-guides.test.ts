import test from "node:test";
import assert from "node:assert/strict";
import { componentCatalog } from "../../src/lib/build-catalog";
import { BOARDS, BOARD_BY_ID, pinLabel } from "../../src/lib/learn/boards";
import { COMPONENT_GUIDES, guideFor } from "../../src/lib/learn/guides";
import { parseLearned } from "../../src/lib/learn/progress";
import { ROADMAP, nextAfter, stageOf } from "../../src/lib/learn/roadmap";
import { studioDocFor } from "../../src/lib/learn/studio-build";
import { codeFor, wiringFor } from "../../src/lib/learn/wiring";
import { buildNets } from "../../src/lib/studio/circuit";
import { PART_BY_TYPE, UNO_PINS } from "../../src/lib/studio/parts";

const BUS_ROLES = new Set(["sda", "scl", "mosi", "miso", "sck"]);

test("every catalog component has exactly one guide, and every guide is a catalog component", () => {
  const slugs = componentCatalog.map((c) => c.slug);
  assert.deepEqual(COMPONENT_GUIDES.map((g) => g.slug).filter((s) => !slugs.includes(s)), []);
  assert.deepEqual(slugs.filter((s) => !guideFor(s)), []);
  assert.equal(new Set(COMPONENT_GUIDES.map((g) => g.slug)).size, COMPONENT_GUIDES.length);
});

test("every guide sits on the roadmap once, and quiz answers are valid", () => {
  const placed = ROADMAP.flatMap((s) => [...s.core, ...s.more]);
  assert.equal(new Set(placed).size, placed.length, "a component appears in two stages");
  for (const guide of COMPONENT_GUIDES) {
    assert.ok(stageOf(guide.slug), `${guide.slug} is not on the roadmap`);
    assert.ok(guide.check.answer >= 0 && guide.check.answer < guide.check.options.length, `${guide.slug} quiz answer out of range`);
    assert.ok(guide.howItWorks.length >= 2 && guide.mistakes.length >= 1, `${guide.slug} is too thin`);
    for (const related of guide.related ?? []) assert.ok(guideFor(related), `${guide.slug} relates to unknown ${related}`);
  }
});

test("every wired guide gets valid, conflict-free pins and fully rendered code on every board", () => {
  for (const guide of COMPONENT_GUIDES.filter((g) => g.pins.length)) {
    for (const board of BOARDS) {
      const wiring = wiringFor(guide, board);
      const signalPins = wiring.rows.filter((r) => r.boardPin && !["vcc", "gnd"].includes(r.role) && !BUS_ROLES.has(r.role)).map((r) => r.boardPin);
      assert.equal(new Set(signalPins).size, signalPins.length, `${guide.slug} on ${board.id}: a board pin is used twice`);
      for (const row of wiring.rows) assert.ok(row.target && !row.target.includes("{"), `${guide.slug} on ${board.id}: bad target for ${row.pinId}`);
      for (const language of board.languages) {
        const code = codeFor(guide, board, wiring, language);
        if (!code) continue;
        assert.doesNotMatch(code, /\{(pin|ADC_MAX|VREF|SERVO_INCLUDE|SD_APPEND|UART|MP_)/, `${guide.slug} on ${board.id} (${language}) has an unfilled token`);
        assert.ok(!code.includes("\u0000"), `${guide.slug} on ${board.id}: dropped-line marker left in code`);
        if (language === "micropython") assert.doesNotMatch(code, /^\s*(void|const int|#include)/m, `${guide.slug}: Arduino code in MicroPython template`);
      }
    }
    assert.ok(guide.code?.arduino, `${guide.slug} has wiring but no Arduino code`);
  }
});

test("pins follow each board's real rules", () => {
  const pinOf = (slug: string, board: keyof typeof BOARD_BY_ID, id: string) => wiringFor(guideFor(slug)!, BOARD_BY_ID[board]).pins[id];
  assert.equal(pinOf("led", "uno", "anode"), "D9");                         // a PWM (~) pin
  assert.ok(BOARD_BY_ID.esp32.analog.includes(pinOf("potentiometer", "esp32", "wiper")));
  assert.match(pinOf("potentiometer", "esp32", "wiper"), /^GPIO(3[2-9])$/);   // ADC1, works with Wi-Fi
  assert.match(pinOf("ldr", "pico", "node"), /^GP2[678]$/);                  // the Pico's only ADC pins
  assert.equal(pinOf("oled-i2c", "uno", "sda"), "A4");
  assert.equal(pinOf("oled-i2c", "mega", "sda"), "D20");
  assert.equal(pinOf("sd-card", "esp32", "cs"), "GPIO5");
  assert.equal(pinOf("hc05", "esp32", "txd"), "GPIO16");                    // module TX -> board RX2
  assert.equal(pinLabel(BOARD_BY_ID.pico, "GP15"), "GP15 · pin 20");
});

test("5 V and 3.3 V are protected in both directions", () => {
  const echo = (board: keyof typeof BOARD_BY_ID) => wiringFor(guideFor("hc-sr04")!, BOARD_BY_ID[board]).rows.find((r) => r.pinId === "echo")!;
  assert.match(echo("esp32").via ?? "", /divider/);
  assert.ok(echo("esp32").warn);
  assert.equal(echo("uno").via, undefined);
  const tftCs = (board: keyof typeof BOARD_BY_ID) => wiringFor(guideFor("tft-display")!, BOARD_BY_ID[board]).rows.find((r) => r.pinId === "cs")!;
  assert.match(tftCs("uno").via ?? "", /level shifter/);
  assert.equal(tftCs("pico").via, undefined);
  const hc05Vcc = wiringFor(guideFor("nrf24l01")!, BOARD_BY_ID.uno).rows.find((r) => r.pinId === "vcc")!;
  assert.equal(hc05Vcc.target, "3.3V");                                    // never 5 V for the nRF24
  assert.equal(wiringFor(guideFor("lm35")!, BOARD_BY_ID.esp32).rows.find((r) => r.pinId === "vs")!.boardPin, "VIN");
});

test("code is adapted to each board", () => {
  const code = (slug: string, board: keyof typeof BOARD_BY_ID, language: "arduino" | "micropython" = "arduino") => {
    const guide = guideFor(slug)!;
    return codeFor(guide, BOARD_BY_ID[board], wiringFor(guide, BOARD_BY_ID[board]), language)!;
  };
  assert.match(code("servo", "esp32"), /#include <ESP32Servo\.h>/);
  assert.match(code("servo", "uno"), /#include <Servo\.h>/);
  assert.match(code("potentiometer", "esp32"), /0\.\.4095/);
  assert.match(code("potentiometer", "uno"), /raw \* 5\.0 \/ 1023/);
  assert.match(code("potentiometer", "esp32", "micropython"), /knob\.atten\(ADC\.ATTN_11DB\)/);
  assert.doesNotMatch(code("potentiometer", "pico", "micropython"), /atten/);
  assert.match(code("hc05", "uno"), /SoftwareSerial link\(2, 3\);/);
  assert.match(code("hc05", "esp32"), /Serial2\.begin\(9600, SERIAL_8N1, 16, 17\)/);
  assert.match(code("hc05", "mega"), /Serial1\.begin\(9600\);/);
  assert.doesNotMatch(code("hc05", "mega"), /SoftwareSerial/);
  assert.match(code("sd-card", "esp32"), /FILE_APPEND/);
  assert.match(code("keypad-4x4", "uno"), /byte rowPins\[ROWS\] = \{7, 8, 4, 2\};/);
  assert.equal(codeFor(guideFor("led")!, BOARD_BY_ID.uno, wiringFor(guideFor("led")!, BOARD_BY_ID.uno), "micropython"), null);
});

test("Try-it builds open as wired Maker Studio circuits that match the guide", () => {
  const unoPins = new Set(UNO_PINS.map((p) => p.id));
  const withStudio = COMPONENT_GUIDES.filter((g) => g.studio);
  assert.equal(withStudio.length, 9);
  for (const guide of withStudio) {
    const doc = studioDocFor(guide)!;
    assert.ok(doc, guide.slug);
    for (const wire of doc.wires) {
      for (const end of [wire.a, wire.b]) {
        const [owner, pin] = end.split(":");
        if (owner === "uno") assert.ok(unoPins.has(pin), `${guide.slug}: unknown Uno pin ${pin}`);
        else assert.ok(PART_BY_TYPE[doc.parts.find((p) => p.id === owner)!.type].pins.some((p) => p.id === pin), `${guide.slug}: unknown part pin ${end}`);
      }
    }
    buildNets(doc);                                                          // the simulator accepts it
  }
  const led = studioDocFor(guideFor("led")!)!;
  assert.deepEqual(led.parts.map((p) => p.type), ["led", "resistor"]);
  assert.equal(led.parts[1].props.ohms, 220);
  assert.ok(led.wires.some((w) => w.a === "uno:D9" && w.b === "r1:a"));
  assert.match(led.code, /const int LED_PIN = 9;/);
});

test("learning progress: stored slugs are validated and the next step skips what is learned", () => {
  assert.deepEqual(parseLearned('["led","Not A Slug!",3]'), ["led"]);
  assert.deepEqual(parseLearned("{broken"), []);
  assert.equal(nextAfter("breadboard", new Set()), "led");
  assert.equal(nextAfter("breadboard", new Set(["led", "resistor-330"])), "push-button");
  assert.equal(nextAfter("soil-moisture", new Set()), "transistor-npn");     // into the next stage
});
