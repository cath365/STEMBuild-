# STEMBuild 3D Lab — Real Engine

This document describes the first real-engine layer behind STEMBuild 3D Lab.

## Two execution modes

### Fast Simulation

Fast Simulation is the low-data educational mode. It validates the current project assembly, reviewed wiring graph and the subset of Arduino source needed by the activity. It stays available for learners on slower or more expensive connections.

### Full Firmware Mode

Full Firmware Mode is opt-in. For the current Arduino Uno projects it:

1. Takes the learner's Arduino source.
2. Mirrors Arduino's standard `Arduino.h` include step when it is absent.
3. Compiles the source in the browser with AVR GCC/binutils WebAssembly.
4. Produces real Intel HEX for an ATmega328P / Arduino Uno target.
5. Loads that HEX into AVR8js.
6. Runs the ATmega328P machine code with AVR timers and GPIO simulation.
7. Maps Arduino D8 (PB0) to the virtual LED.
8. Maps Arduino D2 (PD2) to the virtual push button for the button project.

The learner's exported `.ino` is not replaced with a different STEMBuild language.

## Bandwidth

The browser AVR compiler is deliberately not part of the normal STEMBuild bundle. Its upstream compiler + Arduino assets are large (roughly 55 MB before normal HTTP caching/compression effects). They load only when a learner explicitly chooses Full Firmware Mode.

This protects the normal learner experience and keeps Fast Simulation suitable for lower-bandwidth use.

## 3D rendering

The default lab workbench uses Three.js/WebGL.

Current physical representations:

- **Arduino Uno R3:** glTF educational model using the official 68.6 mm × 53.4 mm board footprint. Major physical features are represented so the board is recognisable.
- **Breadboard:** reusable glTF educational model with representative full-size breadboard dimensions.
- **330 Ω axial resistor:** dimensioned procedural 3D geometry with colour bands.
- **5 mm LED:** dimensioned procedural 3D geometry with unequal leads.
- **6 mm tactile button:** dimensioned procedural 3D geometry.

These models are for learning and assembly recognition. A generic model is not a claim that every manufacturer, clone, header, button or breadboard has identical mechanical geometry.

## Wiring in 3D

Reviewed terminals are rendered as clickable 3D nodes. Selecting two valid nodes creates the reviewed electrical connection as a 3D wire. Invalid terminal pairs are rejected by the same project connection graph used by the guided wiring list.

## External runtime libraries

The real-engine preview intentionally lazy-loads the following only in the browser:

- Three.js — MIT licensed
  - https://github.com/mrdoob/three.js
- AVR8js — MIT licensed
  - https://github.com/wokwi/avr8js
- @horang-corp/avr-gcc-wasm — browser AVR GCC/binutils toolchain
  - https://github.com/horang-corp/avr-gcc-wasm
  - Its third-party notice identifies GCC/binutils WebAssembly artifacts as GPLv3-or-later and includes avr-libc / Arduino upstream notices.

STEMBuild does not modify those remote toolchains in this integration. The toolchain is requested only when Full Firmware Mode is selected.

## What “simulation passed” means

A successful Full Firmware run proves substantially more than a visual animation:

- the sketch compiled for the Uno-class AVR target,
- the generated program fits the target flash budget,
- ATmega328P machine code executed,
- GPIO state from the running firmware drove the simulated component,
- and the STEMBuild wiring graph matched the project's required connections.

It still does **not** prove that a physical build will work. Physical validation remains necessary because real batteries, loose connections, sensor noise, component tolerances, motor current, module revisions and mechanical assembly can change behaviour.

## Current scope

The first real-firmware projects are:

- LED Blink — D8 / PB0 output.
- Push-Button Light — D2 / PD2 input with `INPUT_PULLUP`, D8 / PB0 output.

The architecture is intended to grow toward HC-SR04, servo, motor driver and robot projects after these first two firmware paths are physically benchmarked and tested across phones and desktop browsers.

## Reliability review — 8 October 2026 (Zambia)

- Scene readiness now applies current parts, wires, LED state and pin selection after models load, including assemblies made before launch.
- React owns overlays separately from the Three.js canvas. Closing a loading or active scene cancels its animation frame and releases resources.
- Each project has a separate mounted session and validated, deduplicated local save. Switching projects cannot write the previous project's code into the new save.
- Stop, edits, mode changes and project changes invalidate pending firmware results. A completed old compile cannot restart a stopped session.
- AVR execution yields every frame with a bounded CPU budget and a 16 MHz timing target. Slow devices may simulate more slowly. ATmega328P flash allocation is 32 KB.
- Fast mode is explicitly a starter-template preview, not a general Arduino interpreter. It accepts comments, whitespace and numeric blink delays up to 60 seconds; other edits need firmware execution. Supported delay values are no longer silently clamped to 80–2500 ms.
- Named terminal buttons, camera reset, keyboard button input, a direct fallback action and honest storage-failure feedback improve usability.
- A phone-width overflow in the lightweight stage and the micro:bit photo's catalogue slug were corrected.

### Validation

`npm run verify:lab` builds production and runs the browser regression suite. `npm test` covers all unit suites. WebGL regression additionally accepts `TEST_THREE_BUNDLES` containing version-matched Three.js, GLTFLoader and OrbitControls ESM bundles, and `TEST_WEBGL=true` for a software-rendering test browser. Those bundles are test-only and do not replace production's pinned lazy CDN imports.

Browser tests cover real component-image loading, saved-project isolation and reload, keyboard input, unsupported-code rejection, mobile overflow, stale compiler results, and WebGL replay/reopen/disposal. Compiler lifecycle tests use controlled responses and do not establish AVR-GCC or physical-kit correctness.

### Highest-value next milestones

1. Build a real electrical netlist: breadboard rows/rails, shared grounds, resistor placement and LED polarity. Currently wiring is a reviewed list of connections, not an electrical solver.
2. Add move/rotate/snap and visible pin labels linked to exact board variants. Current placement uses fixed positions.
3. Run the actual browser compiler and benchmark generated firmware against a real Uno for blink timing and button behaviour, including Android devices.
4. Add project-file import/export, recovery and clear shared-device ownership; current saves are local to the browser.
5. Expand to sensors and motors only after their electrical and timing models pass the same physical comparisons. ESP32 needs a separate execution target.

Review results: clean production build and TypeScript passed; all 21 unit tests and all five 3D browser tests passed. The AVR browser test executes a fixed eight-byte GPIO program in real AVR8js with the compiler response stubbed. WebGL uses the real matching Three.js library and a software renderer. Changed 3D files pass targeted ESLint with image-optimisation warnings. Repository-wide ESLint still reports two pre-existing state-hydration errors in Build Mode and Component Browser; they are outside this patch.
